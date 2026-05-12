import {
  Component, Input, OnInit, OnDestroy, AfterViewInit, inject, NgZone, OnChanges
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Formation, YoutubeVideo } from '../models/formation.model';
import { FormationService } from '../services/formation.service';

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

@Component({
  selector: 'app-formation-player',
  standalone: false,
  templateUrl: './formation-player.component.html',
  styleUrls: ['./formation-player.component.scss']
})
export class FormationPlayerComponent
    implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  @Input() formation!:    Formation;
  @Input() inscriptionId: number | null = null;
  @Input() candidatId:    number | null = null;
  @Input() parcoursId:    number | null = null;
  @Input() niveau:        string | null = null;
  @Input() isAlreadyCompleted = false;

  private sanitizer        = inject(DomSanitizer);
  private formationService = inject(FormationService);
  private http             = inject(HttpClient);
  private ngZone           = inject(NgZone);
  private router           = inject(Router);
  private route            = inject(ActivatedRoute);

  safeStackBlitzUrl: SafeResourceUrl | null = null;
  isPlaylist      = false;
  playlistVideos: YoutubeVideo[] = [];
  currentVideoId: string | null  = null;
  currentVideo:   YoutubeVideo | null = null;
  currentIndex    = 0;

  videosVues   = new Set<string>();
  progression  = 0;
  showConfetti = false;

  showQuizFinal       = false;
  quizFinalLoading    = false;
  quizFinalQuestions: any[]     = [];
  quizFinalAnswers:   number[]  = [];
  quizFinalSubmitted  = false;
  quizFinalScore      = 0;
  quizFinalReussi     = false;
  quizFinalMessage    = '';
  certificatId:       number | null = null;

  seuilQuiz = 70;
  private quizLaunched = false;

  tentativesUtilisees = 0;
  readonly INFINITY = Infinity;

  /** 3 tentatives pour EXPERT ou formation simple, illimité pour les autres niveaux d'un parcours */
  get MAX_TENTATIVES(): number {
    return (this.niveau === 'EXPERT' || !this.parcoursId) ? 3 : Infinity;
  }

  quizBloque         = false;
  quizBloqueMessage  = '';
  quizTimerRestant   = 600; // 10 minutes en secondes
  private timerInterval: any = null;
  private visibilityChanges    = 0;
  private readonly MAX_VISIBILITY_CHANGES = 1;
  private visibilityListener:  (() => void) | null = null;
  private copyListener:        ((e: Event) => void) | null = null;
  private pasteListener:       ((e: Event) => void) | null = null;
  private cutListener:         ((e: Event) => void) | null = null;
  private contextMenuListener: ((e: Event) => void) | null = null;
  private keydownListener:     ((e: KeyboardEvent) => void) | null = null;
  private keyupListener:       ((e: KeyboardEvent) => void) | null = null;
  private blurListener:        (() => void) | null = null;
  
  isObscured = false;

  private ytPlayer:    any = null;
  private playerReady      = false;

  private readonly base = '/api';

  private readonly categoriesAvecEditeur = [
    'Frontend', 'Backend', 'Data', 'IA', 'Développement'
  ];

  private readonly stackBlitzMap: Record<string, string> = {
    'Frontend':      'https://stackblitz.com/fork/web?embed=1&hideNavigation=1&theme=dark&file=index.html',
    'Backend':       'https://stackblitz.com/fork/node?embed=1&hideNavigation=1&theme=dark&file=index.js',
    'Data':          'https://stackblitz.com/fork/python?embed=1&hideNavigation=1&theme=dark&file=main.py',
    'IA':            'https://stackblitz.com/fork/python?embed=1&hideNavigation=1&theme=dark&file=main.py',
    'DevOps':        'https://stackblitz.com/fork/node?embed=1&hideNavigation=1&theme=dark&file=index.js',
    'Design':        'https://stackblitz.com/fork/web?embed=1&hideNavigation=1&theme=dark&file=style.css',
    'Développement': 'https://stackblitz.com/fork/angular?embed=1&hideNavigation=1&theme=dark&file=src/app/app.component.ts',
    'Mobile':        'https://stackblitz.com/fork/web?embed=1&hideNavigation=1&theme=dark&file=index.html',
  };

  private get quizStorageKey(): string {
    return `quiz_tentatives_${this.inscriptionId}`;
  }

  get tentativesRestantes(): number {
    if (this.MAX_TENTATIVES === Infinity) return Infinity;
    return Math.max(0, this.MAX_TENTATIVES - this.tentativesUtilisees);
  }

  get peutReessayer(): boolean {
    return this.tentativesRestantes > 0 && !this.quizFinalReussi;
  }

  get answeredQuestionsCount(): number {
    return this.quizFinalAnswers.filter(a => a !== -1).length;
  }

  get formattedTimer(): string {
    const m = Math.floor(this.quizTimerRestant / 60);
    const s = this.quizTimerRestant % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }


  ngOnInit(): void {
    this.route.queryParams.subscribe((params: Params) => {
      if (params['startQuiz'] === 'true') {
        setTimeout(() => this.lancerQuizFinal(), 1000);
      }
    });

    this.updateQuizSettings();

    if (!this.candidatId)
      this.candidatId = Number(localStorage.getItem('candidatId')) || null;

    if (!this.inscriptionId && this.candidatId) {
      const scopedKey = `candidat_${this.candidatId}_ins_${this.formation?.id}` + (this.parcoursId ? `_p${this.parcoursId}` : '');
      const scoped = Number(localStorage.getItem(scopedKey)) || null;
      if (scoped) {
        this.inscriptionId = scoped;
      } else {
        // Fallback to legacy key, then wipe it so it won't persist for the next user
        const legacy = Number(localStorage.getItem('inscription_' + this.formation?.id)) || null;
        if (legacy) {
          this.inscriptionId = legacy;
          localStorage.setItem(scopedKey, String(legacy));
        }
        localStorage.removeItem('inscription_' + this.formation?.id);
      }
    }

    this.chargerTentatives();

    if (this.hasEditor()) {
      const sb = this.formation.stackBlitzUrl
        || this.stackBlitzMap[this.formation.categorie]
        || 'https://stackblitz.com/fork/web?embed=1&hideNavigation=1&theme=dark';
      this.safeStackBlitzUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(sb);
    }

    if (this.formation.playlistId) {
      this.isPlaylist = true;
      this.formationService.getPlaylistVideos(
          this.formation.playlistId).subscribe({
        next: (videos) => {
          this.playlistVideos = videos;
          this.loadExistingProgression();
        }
      });
    } else if (this.formation.youtubeId) {
      this.isPlaylist = false;
      this.currentVideoId = this.formation.youtubeId;
      this.currentVideo = {
        videoId: this.formation.youtubeId,
        title: this.formation.titre,
        thumbnail: '',
        position: 0
      };
      this.loadYouTubeAPI(() => this.initPlayer(this.formation.youtubeId!));
      this.loadExistingProgression();
    }
  }

  ngAfterViewInit(): void {}

  ngOnChanges(): void {
    this.updateQuizSettings();
  }

  private updateQuizSettings(): void {
    if (this.niveau === 'EXPERT') {
      this.seuilQuiz = 80;
    } else {
      this.seuilQuiz = 70;
    }
  }

  ngOnDestroy(): void {
    this.destroyPlayer();
    this.retirerProtectionAntiTriche();
    this.arreterTimer();
  }

  private chargerTentatives(): void {
    const saved = localStorage.getItem(this.quizStorageKey);
    this.tentativesUtilisees = saved ? Number(saved) : 0;
  }

  private sauvegarderTentatives(): void {
    localStorage.setItem(
      this.quizStorageKey, String(this.tentativesUtilisees));
  }

  private activerProtectionAntiTriche(): void {
    this.visibilityChanges = 0;

    this.copyListener = (e: Event) => {
      e.preventDefault();
      this.afficherAvertissement('La copie est désactivée pendant le quiz.');
    };
    this.pasteListener = (e: Event) => {
      e.preventDefault();
      this.afficherAvertissement('Le collage est désactivé pendant le quiz.');
    };
    this.cutListener = (e: Event) => { e.preventDefault(); };
    this.contextMenuListener = (e: Event) => { e.preventDefault(); };

    document.addEventListener('copy',        this.copyListener);
    document.addEventListener('paste',       this.pasteListener);
    document.addEventListener('cut',         this.cutListener);
    document.addEventListener('contextmenu', this.contextMenuListener);

    this.keydownListener = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['c','v','a','x','u','p','s'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        this.afficherAvertissement('Les raccourcis clavier sont désactivés.');
      }
      if (e.key === 'F12' || e.key === 'PrintScreen' ||
          (ctrl && e.shiftKey && ['i','j','s'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        if (e.key === 'PrintScreen' || (ctrl && e.shiftKey && e.key.toLowerCase() === 's')) {
            navigator.clipboard.writeText('');
            this.afficherAvertissement('La capture d\'écran est désactivée pendant le quiz.');
            this.obscureScreen();
        }
      }
    };
    document.addEventListener('keydown', this.keydownListener);

    this.keyupListener = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        this.afficherAvertissement('La capture d\'écran est désactivée pendant le quiz.');
        this.obscureScreen();
      }
    };
    document.addEventListener('keyup', this.keyupListener);

    this.visibilityListener = () => {
      if (document.hidden && this.showQuizFinal && !this.quizFinalSubmitted) {
        this.ngZone.run(() => {
          this.visibilityChanges++;
          if (this.visibilityChanges > this.MAX_VISIBILITY_CHANGES) {
            this.bloquerQuizPourTriche('Vous avez quitté la fenêtre.');
          } else {
            this.afficherAvertissement(
              `⚠️ Attention ! Changement de fenêtre détecté. ` +
              `Encore ${this.MAX_VISIBILITY_CHANGES - this.visibilityChanges + 1} ` +
              `fois et la tentative sera annulée.`
            );
          }
        });
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);

    this.blurListener = () => {
      if (this.showQuizFinal && !this.quizFinalSubmitted) {
        this.ngZone.run(() => {
          this.visibilityChanges++;
          if (this.visibilityChanges > this.MAX_VISIBILITY_CHANGES) {
            this.bloquerQuizPourTriche(
              'Vous avez quitté la fenêtre pendant le quiz.');
          }
        });
      }
    };
    window.addEventListener('blur', this.blurListener);
  }

  private retirerProtectionAntiTriche(): void {
    if (this.copyListener)
      document.removeEventListener('copy',        this.copyListener);
    if (this.pasteListener)
      document.removeEventListener('paste',       this.pasteListener);
    if (this.cutListener)
      document.removeEventListener('cut',         this.cutListener);
    if (this.contextMenuListener)
      document.removeEventListener('contextmenu', this.contextMenuListener);
    if (this.keydownListener)
      document.removeEventListener('keydown',     this.keydownListener);
    if (this.keyupListener)
      document.removeEventListener('keyup',       this.keyupListener);
    if (this.visibilityListener)
      document.removeEventListener('visibilitychange', this.visibilityListener);
    if (this.blurListener)
      window.removeEventListener('blur',          this.blurListener);

    this.copyListener        = null;
    this.pasteListener       = null;
    this.cutListener         = null;
    this.contextMenuListener = null;
    this.keydownListener     = null;
    this.keyupListener       = null;
    this.visibilityListener  = null;
    this.blurListener        = null;
  }

  private bloquerQuizPourTriche(raison: string): void {
    if (this.quizBloque) return;
    this.quizBloque        = true;
    this.quizBloqueMessage = raison;
    this.retirerProtectionAntiTriche();
    this.sauvegarderTentatives();

    if (this.inscriptionId) {
      this.http.post<any>(
        `${this.base}/video-progression/quiz-final/soumettre`, {
          inscriptionId: this.inscriptionId,
          score: 0
        }
      ).subscribe();
    }
  }

  avertissementMessage = '';
  showAvertissement    = false;

  private afficherAvertissement(msg: string): void {
    this.avertissementMessage = msg;
    this.showAvertissement    = true;
    setTimeout(() => { this.showAvertissement = false; }, 3000);
  }

  private obscureScreen(): void {
    this.ngZone.run(() => {
      this.isObscured = true;
      setTimeout(() => {
        this.isObscured = false;
      }, 3000);
    });
  }

  private loadYouTubeAPI(cb: () => void): void {
    if (window.YT?.Player) { cb(); return; }
    if (document.getElementById('yt-api-script')) {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); cb(); };
      return;
    }
    window.onYouTubeIframeAPIReady = cb;
    const s = document.createElement('script');
    s.id  = 'yt-api-script';
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }

  private initPlayer(videoId: string): void {
    if (!document.getElementById('yt-player-div')) return;
    this.destroyPlayer();
    this.playerReady = false;
    this.ytPlayer = new window.YT.Player('yt-player-div', {
      height: '100%', width: '100%', videoId,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady:       () => { this.playerReady = true; },
        onStateChange: (e: any) => {
          if (e.data === 0) this.onVideoEnded();
        }
      }
    });
  }

  private onVideoEnded(): void {
    const video = this.playlistVideos.find(
      v => v.videoId === this.currentVideoId) || this.currentVideo;
    if (!video || this.videosVues.has(video.videoId)) return;
    this.marquerVideoVue(video);
  }

  private destroyPlayer(): void {
    try { this.ytPlayer?.destroy(); } catch (e) {}
    this.ytPlayer = null; this.playerReady = false;
  }


  setCurrentVideo(video: YoutubeVideo, index: number): void {
    this.currentVideoId = video.videoId;
    this.currentVideo   = video;
    this.currentIndex   = index;
    this.loadYouTubeAPI(() => {
      setTimeout(() => {
        if (this.ytPlayer && this.playerReady)
          this.ytPlayer.loadVideoById(video.videoId);
        else this.initPlayer(video.videoId);
      }, 100);
    });
  }

  playVideo(v: YoutubeVideo): void {
    this.setCurrentVideo(v,
      this.playlistVideos.findIndex(x => x.videoId === v.videoId));
  }

  nextVideo(): void {
    if (this.currentIndex < this.playlistVideos.length - 1) {
      const next = this.playlistVideos[this.currentIndex + 1];
      this.setCurrentVideo(next, this.currentIndex + 1);
    }
  }

  private loadExistingProgression(): void {
    if (!this.inscriptionId) return;
    
    // Pour une playlist on utilise sa longueur, pour une vidéo unique c'est 1
    const total = this.isPlaylist ? this.playlistVideos.length : 1;
    if (total === 0 && this.isPlaylist) return;

    this.http.get<any>(
      `${this.base}/video-progression/inscription/${this.inscriptionId}`
      + `?totalVideos=${total}`
    ).subscribe({
      next: (data) => {
        // Filtrer pour ne garder que les vidéos qui font partie de la playlist ACTUELLE
        const playlistIds = new Set(this.playlistVideos.map(v => v.videoId));
        this.videosVues.clear(); // Reset avant de recharger proprement
        
        (data.details || []).forEach((vp: any) => {
          if (vp.vuComplete && (playlistIds.size === 0 || playlistIds.has(vp.videoId))) {
            this.videosVues.add(vp.videoId);
          }
        });

        if (data.progression >= 100 || this.isAlreadyCompleted) {
          this.progression = 100;
          this.playlistVideos.forEach(v => this.videosVues.add(v.videoId));
        } else {
          this.progression = data.progression || 0;
        }
        this.tentativesUtilisees = data.tentativesUtilisees || 0;
        
        // Sécurité : si on a filtré et que ça change la progression réelle
        if (this.isPlaylist && this.playlistVideos.length > 0) {
           const calculated = Math.min(100, Math.round(this.videosVues.size / this.playlistVideos.length * 100));
           this.progression = this.isAlreadyCompleted ? 100 : calculated;
        }

        const first = this.playlistVideos.find(
          v => !this.videosVues.has(v.videoId))
          || this.playlistVideos[0];
        this.setCurrentVideo(first, this.playlistVideos.indexOf(first));
      },

      error: () => {
        this.setCurrentVideo(this.playlistVideos[0], 0);
      }
    });
  }

  private marquerVideoVue(video: YoutubeVideo): void {
    if (!this.inscriptionId || !this.candidatId) {
      this.videosVues.add(video.videoId);
      this.recalculerLocal(); return;
    }
    this.http.post<any>(`${this.base}/video-progression/video-vue`, {
      inscriptionId: this.inscriptionId,
      candidatId:    this.candidatId,
      formationId:   this.formation.id,
      videoId:       video.videoId,
      totalVideos:   this.playlistVideos.length
    }).subscribe({
      next: (resp) => {
        this.videosVues.add(video.videoId);
        this.recalculerLocal(); // Utilise le calcul filtré local pour l'UI
      },
      error: () => {
        this.videosVues.add(video.videoId);
        this.recalculerLocal();
      }
    });
  }

  private getResolvedParcoursId(): number {
    const urlParams = new URLSearchParams(window.location.search);
    return this.parcoursId || Number(urlParams.get('parcoursId')) || 0;
  }

  private getResolvedNiveau(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return this.niveau || urlParams.get('niveau');
  }

  private shouldAutoLaunchFinalQuiz(): boolean {
    const pId = this.getResolvedParcoursId();
    const niv = this.getResolvedNiveau();
    return pId === 0 || niv === 'EXPERT';
  }

  private recalculerLocal(): void {
    const t = this.playlistVideos.length || 1;
    // On ne compte que les vidéos qui appartiennent à la playlist actuelle
    const playlistIds = new Set(this.playlistVideos.map(v => v.videoId));
    const validVuesCount = Array.from(this.videosVues).filter(id => playlistIds.has(id)).length;
    
    this.progression = Math.round(validVuesCount / t * 100);
    if (this.progression >= 100 && !this.isAlreadyCompleted && !this.quizLaunched && this.shouldAutoLaunchFinalQuiz()) {
      this.quizLaunched = true;
      setTimeout(() => this.lancerQuizFinal(), 4000);
    }
  }


  lancerQuizFinal(): void {
    if (!this.inscriptionId || this.quizFinalLoading) return;

    // 1. Récupération dynamique et sécurisée des paramètres
    const urlParams = new URLSearchParams(window.location.search);
    const pId = this.parcoursId || Number(urlParams.get('parcoursId')) || 0;
    const niv = this.niveau || urlParams.get('niveau');

    console.log(`[QUIZ-TRIGGER] Context check - ParcoursID: ${pId}, Niveau: ${niv}`);

    // 2. Redirection vers Quiz IA pour Débutant, Intermédiaire, Avancé dans un parcours
    if (pId > 0 && niv && niv !== 'EXPERT') {
      console.log(`[QUIZ-TRIGGER] Redirecting to IA Level Quiz for level: ${niv}`);
      this.quizLaunched = true;
      this.router.navigate(['/formations/parcours', pId, 'quiz', niv]);
      return;
    }

    // 3. Sinon (Expert ou formation standalone), modal interne avec restrictions
    console.log(`[QUIZ-TRIGGER] Launching Internal Final Quiz with restrictions (Expert or Standalone)`);
    if (this.showQuizFinal && !this.quizFinalSubmitted && !this.quizBloque) return;
    this.quizLaunched = true;

    if (this.tentativesUtilisees >= this.MAX_TENTATIVES) return;

    this.quizBloque        = false;
    this.quizBloqueMessage = '';
    this.visibilityChanges = 0;
    this.showConfetti      = false;
    this.showQuizFinal     = true;
    this.quizFinalLoading  = true;
    this.quizFinalSubmitted = false;
    this.quizFinalReussi   = false;
    this.certificatId      = null;

    this.activerProtectionAntiTriche();

    this.http.post<any>(
      `${this.base}/video-progression/quiz-final/generer`, {
        inscriptionId:  this.inscriptionId,
        titreFormation: this.formation.titre,
        categorie:      this.formation.categorie,
        playlistId:     this.formation.playlistId || '',
        totalVideos:    this.playlistVideos.length,
        niveau:         this.niveau,
        parcoursId:     this.parcoursId
      }
    ).subscribe({
      next: (data) => {
        this.quizFinalQuestions = data.questions || [];
        this.quizFinalAnswers   =
          new Array(this.quizFinalQuestions.length).fill(-1);
        this.quizFinalLoading   = false;
        this.tentativesUtilisees = data.tentativesUtilisees || 0;
        
        this.quizTimerRestant = 600; 
        this.demarrerTimer();
      },
      error: () => { this.quizFinalLoading = false; }
    });
  }

  selectFinalAnswer(qi: number, ai: number): void {
    if (this.quizFinalSubmitted || this.quizBloque) return;
    this.quizFinalAnswers = [...this.quizFinalAnswers];
    this.quizFinalAnswers[qi] = ai;
  }

  submitQuizFinal(force: boolean = false): void {
    if (this.quizBloque || this.quizFinalSubmitted) return;
    if (!force && this.quizFinalAnswers.some(a => a === -1)) {
      this.afficherAvertissement(
        'Veuillez répondre à toutes les questions avant de soumettre.');
      return;
    }
    if (!this.inscriptionId) return;

    this.arreterTimer();
    this.sauvegarderTentatives();

    let correct = 0;
    this.quizFinalQuestions.forEach((q: any, i: number) => {
      if (this.quizFinalAnswers[i] === q.correctIndex) correct++;
    });
    const score = Math.round(
      correct / this.quizFinalQuestions.length * 100);
    this.quizFinalScore = score;

    this.retirerProtectionAntiTriche();

    this.http.post<any>(
      `${this.base}/video-progression/quiz-final/soumettre`, {
        inscriptionId: this.inscriptionId,
        score,
        parcoursId:    this.parcoursId,
        niveau:        this.niveau
      }
    ).subscribe({
      next: (resp) => {
        this.quizFinalSubmitted = true;
        this.quizFinalReussi    = resp.reussi;
        this.quizFinalMessage   = resp.message;

        if (resp.reussi && score >= this.seuilQuiz) {
          this.showConfetti = true;
          setTimeout(() => { this.showConfetti = false; }, 4000);

          this.http.post<any>(
            `${this.base}/certificats/generer/${this.inscriptionId}`, {}
          ).subscribe({
            next: (cert) => { this.certificatId = cert.id; },
            error: () => {}
          });
        } else if (!resp.reussi) {
          if (this.MAX_TENTATIVES !== Infinity) {
            this.quizFinalMessage =
              `Score obtenu : ${score}% — Minimum requis : ${this.seuilQuiz}%. ` +
              (this.peutReessayer
                ? `Il vous reste ${this.tentativesRestantes} tentative(s) sur ${this.MAX_TENTATIVES}.`
                : `Vous avez épuisé toutes vos tentatives.`);
          } else {
            this.quizFinalMessage =
              `Score obtenu : ${score}% — Minimum requis : ${this.seuilQuiz}%. ` +
              `Vous pouvez réessayer autant de fois que nécessaire.`;
          }
        }
      }
    });
  }

  telechargerCertificat(): void {
    if (!this.certificatId) return;
    window.open(
      `${this.base}/certificats/${this.certificatId}/telecharger`, '_blank');
  }

  fermerQuizFinal(): void {
    this.arreterTimer();
    this.retirerProtectionAntiTriche();
    this.showQuizFinal      = false;
    this.quizFinalSubmitted = false;
    this.quizFinalAnswers   = [];
    this.quizBloque         = false;
  }

  private demarrerTimer(): void {
    this.arreterTimer();
    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.quizTimerRestant--;
        if (this.quizTimerRestant <= 0) {
          this.arreterTimer();
          this.afficherAvertissement('Temps écoulé ! Soumission automatique.');
          this.submitQuizFinal(true);
        }
      });
    }, 1000);
  }

  private arreterTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }


  hasEditor(): boolean {
    if (this.formation.hasEditor !== undefined) return this.formation.hasEditor;
    return this.categoriesAvecEditeur.includes(this.formation.categorie);
  }

  getStackBlitzLabel(): string {
    const sb = this.formation.stackBlitzUrl || '';
    if (sb.includes('react'))      return 'React';
    if (sb.includes('angular'))    return 'Angular';
    if (sb.includes('vue'))        return 'Vue.js';
    if (sb.includes('python'))     return 'Python';
    if (sb.includes('node'))       return 'Node.js';
    if (sb.includes('javascript')) return 'JavaScript';
    return this.formation.categorie || 'Code';
  }

  isVideoVue(id: string): boolean { return this.videosVues.has(id); }

  getProgressionLabel(): string {
    return `${this.videosVues.size}/${this.playlistVideos.length || 1} vidéos terminées`;
  }

  getProgressionColor(): string {
    if (this.progression >= 100) return '#16a34a'; // Green stays for completion
    if (this.progression >= 50)  return '#fbbf24'; // Brighter amber/orange
    return '#fcd34d'; // Lighter amber for low progression
  }

  getQuizLabel(): string {
    if (this.parcoursId && this.niveau) {
      if (this.niveau === 'EXPERT') return 'Évaluation finale';
      const labels: any = {
        'DEBUTANT': 'Quiz Débutant',
        'INTERMEDIAIRE': 'Quiz Intermédiaire',
        'AVANCE': 'Quiz Avancé'
      };
      return labels[this.niveau] || 'Évaluation de niveau';
    }
    return 'Évaluation finale';
  }
}