import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../../api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { ActivatedRoute, Router } from '@angular/router';
import { EmotionAnalysisService } from '../../services/emotion-analysis.service';

interface EntretienForm {
  titre: string;
  description: string;
  type: string;
  mode: string;
  meetingLink: string;
  domaine: string;
  dateEntretien: string;
  candidatId: number | null;
  offreId: number | null;
  photo: string;
  seuilReussite: number | null;
  dureeMinutes: number | null;
}

@Component({
  selector: 'app-rd-interviews',
  imports: [CommonModule, FormsModule],
  templateUrl: './rd-interviews.html',
  styleUrls: ['./rd-interviews.scss'],
})
export class RdInterviews implements OnInit, OnDestroy {
  entretiens: any[] = [];
  searchTerm = '';
  filterType = 'TOUS';
  filterDomaine = 'TOUS';
  filterStatus = 'TOUS';
  selectedEntretienDetails: any | null = null;
  showEntretienDetailsModal = false;
  showEmotionRealtimeModal = false;
  selectedEmotionEntretien: any | null = null;
  emotionRealtimeData: any | null = null;
  emotionRealtimeError = '';
  emotionRealtimeLastUpdated: Date | null = null;
  candidats: any[] = [];
  candidaturesOffre: any[] = [];
  selectedOffreLabel = '';
  newEntretien: EntretienForm = {
    titre: '',
    description: '',
    type: '',
    mode: 'QUESTIONS',
    meetingLink: '',
    domaine: '',
    dateEntretien: '',
    candidatId: null,
    offreId: null,
    photo: '',
    seuilReussite: 70,
    dureeMinutes: 30
  };
  showCreateForm = false;
  editingEntretien: any = null;
  currentUser: any;
  currentUserId: number | null = null;
  typesEntretien = ['TECHNIQUE', 'RH', 'MANAGERIAL', 'FINAL', 'PRESELECTION', 'TEST'];
  modesEntretien = ['QUESTIONS', 'VIDEO'];
  private pendingCandidaturePrefill: {
    candidatId: number | null;
    nomComplet: string;
    email: string;
    poste: string;
  } | null = null;
  private pendingJobPrefill: {
    offreId: number | null;
    poste: string;
    description: string;
    localisation: string;
    contrat: string;
  } | null = null;
  private candidateEmailForInterview: string | null = null;
  private candidateNameForInterview: string | null = null;
  private emotionRealtimeIntervalId: number | null = null;
  private emotionRealtimeErrorStreak = 0;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private emotionAnalysisService: EmotionAnalysisService
  ) {}

  ngOnInit(): void {
    if (!this.isRecruteurSession()) {
      alert('Acces refuse. Veuillez vous connecter avec un compte recruteur.');
      this.router.navigate(['/login']);
      return;
    }

    this.getCurrentUser();
    this.preparePrefillFromRoute();
    this.loadEntretiens();
    this.loadCandidats();
    this.loadDomaines();
  }

  ngOnDestroy(): void {
    this.stopEmotionRealtimePolling();
  }

  get filteredEntretiens(): any[] {
    const term = this.normalizeForSearch(this.searchTerm);

    return this.entretiens.filter((item: any) => {
      const matchesText = !term || [
        item?.titre,
        item?.description,
        item?.type,
        item?.domaine,
        this.getCandidateName(item?.candidatId)
      ].some((value) => this.normalizeForSearch(value).includes(term));

      const itemType = String(item?.type || item?.categorie || '').toUpperCase();
      const itemDomaine = String(item?.domaine || '').toUpperCase();
      const itemStatus = item?.completed ? 'TERMINE' : 'EN_COURS';

      const matchesType = this.filterType === 'TOUS' || itemType === this.filterType;
      const matchesDomaine = this.filterDomaine === 'TOUS' || itemDomaine === this.filterDomaine;
      const matchesStatus = this.filterStatus === 'TOUS' || itemStatus === this.filterStatus;

      return matchesText && matchesType && matchesDomaine && matchesStatus;
    });
  }

  get domaineFilterOptions(): string[] {
    const set = new Set<string>();
    this.entretiens.forEach((item: any) => {
      const domaine = String(item?.domaine || '').toUpperCase().trim();
      if (domaine) {
        set.add(domaine);
      }
    });
    return ['TOUS', ...Array.from(set).sort()];
  }

  private normalizeForSearch(value: any): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }


  private preparePrefillFromRoute(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('createFromJob') === '1') {
        const rawOffreId = Number(params.get('offreId'));
        this.pendingJobPrefill = {
          offreId: Number.isFinite(rawOffreId) && rawOffreId > 0 ? rawOffreId : null,
          poste: params.get('poste') || '',
          description: params.get('description') || '',
          localisation: params.get('localisation') || '',
          contrat: params.get('contrat') || ''
        };

        this.showCreateForm = true;
        this.applyJobPrefillIfPossible();
        return;
      }

      if (params.get('createFromCandidature') !== '1') {
        return;
      }

      const rawCandidatId = Number(params.get('candidatId'));
      this.pendingCandidaturePrefill = {
        candidatId: Number.isFinite(rawCandidatId) && rawCandidatId > 0 ? rawCandidatId : null,
        nomComplet: params.get('nomComplet') || '',
        email: params.get('email') || '',
        poste: params.get('poste') || ''
      };

      this.showCreateForm = true;
      this.applyCandidaturePrefillIfPossible();
    });
  }

  private applyJobPrefillIfPossible(): void {
    if (!this.pendingJobPrefill) {
      return;
    }

    const prefill = this.pendingJobPrefill;
    const posteLabel = prefill.poste || 'ce poste';
    const contratLabel = prefill.contrat || 'non specifie';
    const localisationLabel = prefill.localisation || 'non specifiee';

    this.newEntretien = {
      ...this.newEntretien,
      titre: this.newEntretien.titre || `Entretien - ${posteLabel}`,
      description: this.newEntretien.description || `Entretien lie a l'offre ${posteLabel}. Contrat: ${contratLabel}. Localisation: ${localisationLabel}.\n\n${prefill.description || ''}`,
      type: this.newEntretien.type || 'TECHNIQUE',
      offreId: prefill.offreId
    };

    if (prefill.offreId) {
      this.selectedOffreLabel = posteLabel;
      this.loadCandidaturesForOffre(prefill.offreId);
    }
  }

  loadCandidaturesForOffre(offreId: number): void {
    this.apiService.getCandidaturesByOffre(offreId).subscribe({
      next: (data) => {
        const direct = this.extractArrayPayload(data);
        if (direct.length > 0) {
          this.candidaturesOffre = direct.filter((c: any) => this.isAcceptedCandidature(c));
          return;
        }

        // Fallback: certains endpoints renvoient vide/mal forme, on filtre la liste recruteur.
        this.apiService.getAllCandidaturesForRecruteur().subscribe({
          next: (allData) => {
            const all = this.extractArrayPayload(allData);
            this.candidaturesOffre = all.filter((c: any) => this.getOffreIdFromCandidature(c) === offreId && this.isAcceptedCandidature(c));
          },
          error: (fallbackError: any) => {
            console.error('❌ Erreur fallback candidatures recruteur:', fallbackError);
            this.candidaturesOffre = [];
          }
        });
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement candidatures de l\'offre:', error);

        // Fallback également en cas d'erreur API directe.
        this.apiService.getAllCandidaturesForRecruteur().subscribe({
          next: (allData) => {
            const all = this.extractArrayPayload(allData);
            this.candidaturesOffre = all.filter((c: any) => this.getOffreIdFromCandidature(c) === offreId && this.isAcceptedCandidature(c));
          },
          error: () => {
            this.candidaturesOffre = [];
          }
        });
      }
    });
  }

  private extractArrayPayload(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const nestedArray = Object.values(payload).find((value: any) => Array.isArray(value));
      return Array.isArray(nestedArray) ? nestedArray : [];
    }

    return [];
  }

  private getOffreIdFromCandidature(candidature: any): number {
    const raw = candidature?.offreId ?? candidature?.idOffre ?? candidature?.offre?.id ?? candidature?.offreEmploi?.id;
    const id = Number(raw);
    return Number.isFinite(id) ? id : 0;
  }

  private isAcceptedCandidature(candidature: any): boolean {
    const statut = String(candidature?.statut || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    return statut === 'ACCEPTEE' || statut === 'ACCEPTE' || statut === 'ACCEPTED';
  }

  private applyCandidaturePrefillIfPossible(): void {
    if (!this.pendingCandidaturePrefill) {
      return;
    }

    const prefill = this.pendingCandidaturePrefill;
    let resolvedCandidatId = prefill.candidatId;

    if (!resolvedCandidatId && prefill.email && this.candidats.length > 0) {
      const found = this.candidats.find((c: any) =>
        (c?.email || '').toLowerCase() === prefill.email.toLowerCase()
      );
      if (found?.id) {
        resolvedCandidatId = found.id;
      }
    }

    const candidatLabel = prefill.nomComplet || prefill.email || 'ce candidat';
    const posteLabel = prefill.poste || 'ce poste';

    // Store candidate email and name for later email notification
    this.candidateEmailForInterview = prefill.email || null;
    this.candidateNameForInterview = prefill.nomComplet || null;

    this.newEntretien = {
      ...this.newEntretien,
      titre: this.newEntretien.titre || `Entretien - ${posteLabel}`,
      description: this.newEntretien.description || `Entretien suite a la candidature de ${candidatLabel} pour ${posteLabel}.`,
      type: this.newEntretien.type || 'TECHNIQUE',
      candidatId: resolvedCandidatId
    };
  }

  private isRecruteurSession(): boolean {
    const token = localStorage.getItem('token');
    const role = (localStorage.getItem('userRole') || '').toUpperCase().replace(/^ROLE_/, '');
    return !!token && role === 'RECRUTEUR';
  }

  getCurrentUser(): void {
    // 1. Valeur locale temporaire (sera verifiee/rafraichie via API)
    const storedRecruteurId = localStorage.getItem('recruteurId');
    if (storedRecruteurId) {
      const parsedId = Number(storedRecruteurId);
      if (!isNaN(parsedId) && parsedId > 0) {
        this.currentUserId = parsedId;
      }
    }

    // 2. Recuperer via API (source de verite)
    this.apiService.getCurrentRecruteur().subscribe({
      next: (recruteur: any) => {
        if (recruteur && recruteur.id) {
          this.currentUserId = recruteur.id;
          localStorage.setItem('recruteurId', String(this.currentUserId));
        } else {
          this.fallbackFromToken();
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur recuperation recruteur via API:', error);
        if (error?.status === 401 || error?.status === 403) {
          localStorage.removeItem('recruteurId');
        }
        this.fallbackFromToken();
      }
    });
  }

  private fallbackFromToken(): void {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        this.currentUser = jwtDecode(token);
        const tokenId = this.currentUser?.id ||
                       this.currentUser?.sub ||
                       this.currentUser?.userId ||
                       this.currentUser?.recruteurId;

        if (tokenId) {
          const parsedTokenId = Number(tokenId);
          if (!isNaN(parsedTokenId) && parsedTokenId > 0) {
            this.currentUserId = parsedTokenId;
            localStorage.setItem('recruteurId', String(this.currentUserId));
            return;
          }
        }
      } catch (error) {
        console.error('❌ Erreur token fallback:', error);
      }
    }

    this.currentUserId = null;
  }

  loadCandidats(): void {
    this.apiService.getCandidats().subscribe({
      next: (data) => {
        // Si c'est un object avec un tableau à l'intérieur, l'extraire
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Chercher un tableau dans l'objet
          const arrayValue = Object.values(data).find((v: any) => Array.isArray(v));
          if (arrayValue) {
            this.candidats = arrayValue as any[];
            this.applyCandidaturePrefillIfPossible();
            return;
          }
        }
        
        this.candidats = Array.isArray(data) ? data : [];
        this.applyCandidaturePrefillIfPossible();
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement candidats:', error);
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('recruteurId');
          alert('Session expirée. Veuillez vous reconnecter.');
          this.router.navigate(['/login']);
          return;
        }
        this.candidats = [];
      }
    });
  }

  loadEntretiens(): void {
    this.apiService.getEntretiens().subscribe({
      next: (data: any[]) => {
        this.entretiens = Array.isArray(data) ? data : [];
      },
      error: (error: any) => {
        console.error('Erreur chargement entretiens', error);
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('recruteurId');
          alert('Session expirée. Veuillez vous reconnecter.');
          this.router.navigate(['/login']);
          return;
        }
        this.entretiens = [];
      }
    });
  }

  private loadDemoEntretiens(): void {
    // Charger des données de démo pour démonstration
    this.entretiens = [
      {
        id: 1,
        titre: 'Entretien Développeur Angular',
        description: 'Entretien technique pour poste développeur Angular',
        type: 'TECHNIQUE',
        dateEntretien: new Date().toISOString(),
        completed: false
      },
      {
        id: 2,
        titre: 'Entretien RH',
        description: 'Entretien RH de présentation',
        type: 'RH',
        dateEntretien: new Date().toISOString(),
        completed: false
      }
    ];
  }

  createEntretien(): void {
    if (!this.validateEntretienForm()) {
      return;
    }

    const isTest = this.newEntretien.type === 'TEST';

    const payload: any = {
      titre: this.newEntretien.titre,
      description: this.newEntretien.description,
      mode: this.newEntretien.mode,
      meetingLink: this.newEntretien.mode === 'VIDEO' ? (this.newEntretien.meetingLink || null) : null,
      domaine: this.newEntretien.domaine,
      categorie: this.newEntretien.type,
      type: this.newEntretien.type,
      dateEntretien: this.newEntretien.dateEntretien,
      dureeMinutes: this.newEntretien.dureeMinutes ?? 30,
      photo: this.newEntretien.photo || null,
    };
    if (isTest) {
      payload.seuilReussite = null;
    } else {
      payload.seuilReussite = this.newEntretien.seuilReussite ?? 70;
    }

    const isVideoMode = String(this.newEntretien.mode || '').toUpperCase() === 'VIDEO';

    if (isVideoMode) {
      if (this.newEntretien.offreId !== null && this.newEntretien.offreId !== undefined) {
        payload.offreId = this.newEntretien.offreId;
      }
      payload.candidatId = this.newEntretien.candidatId;
    } else if (this.newEntretien.offreId !== null && this.newEntretien.offreId !== undefined) {
      payload.offreId = this.newEntretien.offreId;
    } else if (this.newEntretien.candidatId !== null && this.newEntretien.candidatId !== undefined) {
      payload.candidatId = this.newEntretien.candidatId;
    }

    const recruteurId = this.currentUserId;

    if (!recruteurId || isNaN(recruteurId) || recruteurId <= 0) {
      console.error('❌ ID Recruteur invalide:', recruteurId);
      alert('Erreur : ID du recruteur manquant ou invalide. Veuillez vous reconnecter.');
      return;
    }

    this.submitCreateEntretien(payload, recruteurId, false);
  }

  private submitCreateEntretien(payload: any, recruteurId: number, hasRetried: boolean): void {
    this.apiService.createEntretien(payload, recruteurId).subscribe({
      next: (response) => {
        const interviewLink = this.buildInterviewLink(response, payload);
        const createdMode = String(
          response?.mode || response?.modeEntretien || payload?.mode || this.newEntretien.mode || ''
        ).toUpperCase();

        const postCreateMessage = createdMode === 'VIDEO'
          ? 'Redirection vers la liste des entretiens...'
          : 'Redirection vers l\'ajout de questions...';

        alert(`Entretien créé avec succès!\n\nLien de l'entretien: ${interviewLink}\n\n${postCreateMessage}`);
        this.entretiens.push(response);
        
        // Send confirmation email to candidate
        this.sendInterviewConfirmationEmail(response, interviewLink);

        this.resetForm();
        this.showCreateForm = false;
        
        if (createdMode === 'VIDEO') {
          alert('Entretien vidéo créé avec succès. Le candidat pourra rejoindre l’entretien depuis son tableau de bord.');
          this.router.navigate(['/recruiter-dashboard/interviews']);
        } else {
          this.router.navigate(['/recruiter-dashboard/interviews/add-questions', response.id]);
        }
      },
      error: (error) => {
        console.error('❌ Erreur complète:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Headers:', error.headers);
        console.error('❌ Error body:', error.error);

        const backendMessage = typeof error?.error === 'string'
          ? error.error
          : (error?.error?.message || error?.message || '');
        const isRecruteurNotFound = /Recruteur non trouv/i.test(String(backendMessage));

        if (!hasRetried && (error?.status === 404 || error?.status === 400) && isRecruteurNotFound) {
          localStorage.removeItem('recruteurId');

          this.apiService.getCurrentRecruteur().subscribe({
            next: (recruteur: any) => {
              const refreshedId = Number(recruteur?.id);
              if (!isNaN(refreshedId) && refreshedId > 0) {
                this.currentUserId = refreshedId;
                localStorage.setItem('recruteurId', String(refreshedId));
                this.submitCreateEntretien(payload, refreshedId, true);
                return;
              }
              alert('Erreur : impossible de récupérer un ID recruteur valide. Veuillez vous reconnecter.');
            },
            error: (refreshError: any) => {
              if (refreshError?.status === 401 || refreshError?.status === 403) {
                alert('Acces refuse au profil recruteur (401/403). Connectez-vous avec un compte recruteur.');
                return;
              }
              alert('Erreur : session invalide. Veuillez vous reconnecter.');
            }
          });
          return;
        }

        alert(`Erreur lors de la création de l'entretien (${error.status}): ${backendMessage || error.statusText}`);
      }
    });
  }

  private buildInterviewLink(entretien: any, fallback?: any): string {
    const origin = window.location.origin;
    const type = String(entretien?.type || entretien?.categorie || '').toUpperCase();
    const mode = String(entretien?.mode || entretien?.modeEntretien || fallback?.mode || '').toUpperCase();
    const meetingLink = this.resolveMeetingLink(entretien, fallback);
    const entretienId = Number(entretien?.id);

    if (mode === 'VIDEO' && Number.isFinite(entretienId) && entretienId > 0) {
      return `${origin}/entretiens/video/${entretienId}`;
    }

    if (mode === 'VIDEO' && meetingLink) {
      return meetingLink;
    }

    if (type === 'TEST' && Number.isFinite(entretienId) && entretienId > 0) {
      return `${origin}/entretiens/test/${entretienId}`;
    }

    // For non-test interviews, candidate accesses interview list after authentication.
    return `${origin}/candidate-entretiens`;
  }

  private sendInterviewConfirmationEmail(entretien: any, interviewLink: string): void {
    if (entretien?.offreId) {
      const applicants = this.candidaturesOffre.length > 0 ? this.candidaturesOffre : [];

      applicants.forEach((candidature: any) => {
        const candidateEmail = candidature?.email;
        if (!candidateEmail) {
          return;
        }

        const candidateName = candidature?.nomComplet || candidature?.candidatNom || 'Candidat';
        const sharedEmailData = {
          receiverEmail: candidateEmail,
          receiverName: candidateName,
          subject: 'Entretien programmé pour votre candidature',
          contenu: `Bonjour ${candidateName},

Un entretien a été programmé pour l'offre "${entretien.offreTitre || entretien.titre || 'Offre'}".

Détails de l'entretien:
- Titre: ${entretien.titre}
- Type: ${entretien.type}
- Description: ${entretien.description}
${entretien.dateEntretien ? `- Date: ${new Date(entretien.dateEntretien).toLocaleDateString('fr-FR')}` : ''}

Vous pouvez consulter votre tableau de bord candidat pour accéder à cet entretien.

Cordialement,
L'équipe de recrutement`,
          type: 'ENTRETIEN'
        };

        this.apiService.sendMessage(sharedEmailData).subscribe({
          next: () => console.log('✅ Message d\'entretien envoyé à', candidateEmail),
          error: (err) => console.error('❌ Erreur envoi message entretien partagé:', err)
        });
      });

      return;
    }

    // If we don't have a candidate email, try to get it from the candidats list
    let candidateEmail = this.candidateEmailForInterview;
    let candidateName = this.candidateNameForInterview;

    if (!candidateEmail && entretien.candidatId) {
      const candidate = this.candidats.find((c: any) => c.id === entretien.candidatId);
      if (candidate) {
        candidateEmail = candidate.email || null;
        candidateName = candidate.nomComplet || candidate.nom || null;
      }
    }

    if (!candidateEmail) {
      console.warn('⚠ Email du candidat non disponible - Email de confirmation non envoyé');
      return;
    }
    
    const emailData = {
      receiverEmail: candidateEmail,
      receiverName: candidateName || 'Candidat',
      subject: 'Félicitations - Entretien confirmé!',
      contenu: `Chère ${candidateName || 'Candidat'},

Bonne nouvelle! Votre candidature a été acceptée et nous aimerions vous conviter à un entretien.

Détails de l'entretien:
- Titre: ${entretien.titre}
- Type: ${entretien.type}
- Description: ${entretien.description}
${entretien.dateEntretien ? `- Date: ${new Date(entretien.dateEntretien).toLocaleDateString('fr-FR')}` : ''}

Veuillez consulter votre tableau de bord ou cliquer sur le lien ci-dessous pour plus de détails et pour confirmer votre disponibilité.

Lien: ${interviewLink}

Cordialement,
L'équipe de recrutement`,
      type: 'ENTRETIEN'
    };

    this.apiService.sendMessage(emailData).subscribe({
      next: () => {
        console.log('✅ Message d\'entretien envoyé avec succès au candidat');
      },
      error: (err) => {
        console.error('❌ Erreur lors de l\'envoi du message d\'entretien:', err);
        // Don't show alert as it's not critical - the interview is already created
      }
    });
  }

  private resetForm(): void {
    this.newEntretien = {
      titre: '',
      description: '',
      type: '',
      mode: 'QUESTIONS',
      meetingLink: '',
      domaine: '',
      dateEntretien: '',
      candidatId: null,
      offreId: null,
      photo: '',
      seuilReussite: 70,
      dureeMinutes: 30
    };
    this.candidateEmailForInterview = null;
    this.candidateNameForInterview = null;
    this.candidaturesOffre = [];
    this.selectedOffreLabel = '';
  }

  completeEntretien(id: number): void {
    this.apiService.completeEntretien(id).subscribe({
      next: () => {
        const entretien = this.entretiens.find(e => e.id === id);
        if (entretien) entretien.completed = true;

        if (entretien && this.isVideoEntretien(entretien)) {
          this.emotionAnalysisService.completeEmotionAnalysis(id).subscribe({
            next: () => console.log('Emotion analysis marked as completed for interview', id),
            error: (emotionError) => console.warn('Unable to complete emotion analysis automatically:', emotionError)
          });
        }
      },
      error: (error) => console.error('Error completing entretien', error)
    });
  }

  viewResult(entretien: any): void {
    if (this.isVideoEntretien(entretien)) {
      this.openEmotionRealtime(entretien);
      return;
    }

    const id = Number(entretien?.id);
    this.apiService.getResultat(id).subscribe({
      next: (result: any) => {
        const scoreText = result?.score != null ? `${result.score}%` : 'N/A';
        const decisionText = result?.decision || 'N/A';
        const reportText = result?.commentaire ? `\n\nRapport candidat:\n${result.commentaire}` : '';
        alert(`Score: ${scoreText}, Decision: ${decisionText}${reportText}`);
      },
      error: (error: any) => console.error('Error getting result', error)
    });
  }

  openEmotionRealtime(entretien: any): void {
    if (!this.isVideoEntretien(entretien)) {
      alert('Le suivi émotionnel en temps réel est disponible uniquement pour les entretiens vidéo.');
      return;
    }

    const entretienId = Number(entretien?.id);
    if (!Number.isFinite(entretienId) || entretienId <= 0) {
      alert('Identifiant entretien invalide.');
      return;
    }

    this.selectedEmotionEntretien = entretien;
    this.showEmotionRealtimeModal = true;
    this.emotionRealtimeError = '';
    this.emotionRealtimeErrorStreak = 0;
    this.loadEmotionRealtime(entretienId);

    this.stopEmotionRealtimePolling();
    this.emotionRealtimeIntervalId = window.setInterval(() => {
      this.loadEmotionRealtime(entretienId);
    }, 4000);
  }

  closeEmotionRealtime(): void {
    this.showEmotionRealtimeModal = false;
    this.selectedEmotionEntretien = null;
    this.stopEmotionRealtimePolling();
  }

  private stopEmotionRealtimePolling(): void {
    if (this.emotionRealtimeIntervalId != null) {
      window.clearInterval(this.emotionRealtimeIntervalId);
      this.emotionRealtimeIntervalId = null;
    }
  }

  private loadEmotionRealtime(entretienId: number): void {
    this.emotionAnalysisService.getEmotionAnalysis(entretienId).subscribe({
      next: (response: any) => {
        this.emotionRealtimeData = response?.data || response || null;
        this.emotionRealtimeLastUpdated = new Date();
        this.emotionRealtimeError = '';
        this.emotionRealtimeErrorStreak = 0;
      },
      error: (error: any) => {
        this.emotionRealtimeErrorStreak += 1;
        this.emotionRealtimeError = `Resultat emotion non disponible (${error?.status || 'erreur'}).`;

        if (this.emotionRealtimeErrorStreak >= 3) {
          this.emotionRealtimeError = `Resultat emotion non disponible (${error?.status || 'erreur'}). Le rafraichissement auto a ete suspendu.`;
          this.stopEmotionRealtimePolling();
        }
      }
    });
  }

  formatPercent(value: any): string {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(0)}%` : 'N/A';
  }

  async downloadEmotionPdf(entretien: any): Promise<void> {
    if (!this.isVideoEntretien(entretien)) {
      alert('Le PDF émotion est disponible uniquement pour les entretiens vidéo.');
      return;
    }

    const entretienId = Number(entretien?.id);
    if (!Number.isFinite(entretienId) || entretienId <= 0) {
      alert('Identifiant entretien invalide.');
      return;
    }

    // Récupérer d'abord l'analyse globale, puis les frames détaillées
    this.emotionAnalysisService.getEmotionAnalysis(entretienId).subscribe({
      next: async (response: any) => {
        const data = response?.data || response;
        if (!data) {
          alert('Aucune donnée émotion disponible pour générer le PDF.');
          return;
        }

        // Récupérer les frames détaillées
        this.emotionAnalysisService.getEmotionFrames(entretienId).subscribe({
          next: async (frames: any[]) => {
            const { jsPDF } = await import('jspdf');
            // @ts-ignore
            const Chart = (await import('chart.js/auto')).default;
            const doc = new jsPDF();
            const title = `Rapport Emotion - Entretien #${entretienId}`;
            const generatedAt = new Date().toLocaleString('fr-FR');

            doc.setFontSize(16);
            doc.text(title, 14, 16);

            doc.setFontSize(11);
            doc.text(`Genere le: ${generatedAt}`, 14, 24);
            doc.text(`Titre entretien: ${entretien?.titre || 'Sans titre'}`, 14, 31);

            let y = 42;
            const line = (label: string, value: string) => {
              doc.text(`${label}: ${value}`, 14, y);
              y += 8;
            };

            // Résumé global facial & vocal
            line('Etat analyse', String(data?.status || 'N/A'));
            line('Emotion dominante', String(data?.dominantEmotion || 'N/A'));
            line('Engagement', this.formatPercent(data?.engagementScore));
            line('Confiance moyenne', this.formatPercent(data?.averageConfidence));
            line('Stress moyen', this.formatPercent(data?.averageStressLevel));
            line('Joie moyenne', this.formatPercent(data?.averageJoy));
            line('Neutralite moyenne', this.formatPercent(data?.averageNeutral));
            line('Tristesse moyenne', this.formatPercent(data?.averageSadness));
            line('Colère moyenne', this.formatPercent(data?.averageAnger));
            line('Surprise moyenne', this.formatPercent(data?.averageSurprise));
            line('Peur moyenne', this.formatPercent(data?.averageFear));
            // Ajout vocal si dispo
            if (typeof data?.averagePitchVariation !== 'undefined') {
              line('Variation moyenne du pitch', String(data?.averagePitchVariation));
            }
            if (typeof data?.speakingRate !== 'undefined') {
              line('Débit de parole', String(data?.speakingRate) + ' mots/min');
            }
            if (typeof data?.silenceDuration !== 'undefined') {
              line('Durée silence', String(data?.silenceDuration) + ' sec');
            }
            line('Frames traités', String(data?.processedFrames ?? 'N/A'));

            y += 4;
            doc.setFontSize(12);
            doc.text('Synthese automatique', 14, y);
            y += 7;
            doc.setFontSize(10);
            // Synthèse IA simple (exemple)
            let synthese = '';
            if (data?.averageStressLevel > 0.5) {
              synthese += 'Le candidat a montré un niveau de stress notable.\n';
            } else {
              synthese += 'Le candidat est resté globalement calme.\n';
            }
            if (data?.averageJoy > 0.5) {
              synthese += 'Une attitude positive et joyeuse a été observée.\n';
            }
            if (data?.averageConfidence > 0.5) {
              synthese += 'Bonne confiance vocale détectée.\n';
            }
            if (data?.averageSadness > 0.4) {
              synthese += 'Des signes de tristesse ont été détectés.\n';
            }
            if (data?.dominantEmotion) {
              synthese += `Emotion dominante: ${data.dominantEmotion}.\n`;
            }
            // Recommandations automatiques
            let recommandations = '';
            if (data?.averageStressLevel < 0.4 && data?.averageConfidence > 0.5) {
              recommandations += 'Candidat recommandé pour des postes nécessitant calme et assurance.';
            } else if (data?.averageStressLevel > 0.7) {
              recommandations += 'Prévoir un accompagnement pour la gestion du stress.';
            } else {
              recommandations += 'A approfondir lors d’un second entretien.';
            }
            const assessment = String(data?.overallAssessment || '');
            const wrapped = doc.splitTextToSize(synthese + '\n' + assessment, 180);
            doc.text(wrapped, 14, y);
            y += wrapped.length * 5 + 5;
            doc.setFontSize(11);
            doc.text('Recommandations:', 14, y);
            y += 6;
            doc.setFontSize(10);
            const wrappedRec = doc.splitTextToSize(recommandations, 180);
            doc.text(wrappedRec, 14, y);

            // Génération du graphique (courbe d’évolution de la joie, stress, confiance)
            // Création d’un canvas temporaire pour Chart.js
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            const labels = (frames || []).map(f => f.timestampSeconds);
            const joy = (frames || []).map(f => f.joy);
            const stress = (frames || []).map(f => f.voiceStress ?? 0);
            const confidence = (frames || []).map(f => f.voiceConfidence ?? 0);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const chart = new Chart(ctx!, {
              type: 'line',
              data: {
                labels,
                datasets: [
                  { label: 'Joie', data: joy, borderColor: 'green', fill: false },
                  { label: 'Stress vocal', data: stress, borderColor: 'red', fill: false },
                  { label: 'Confiance vocale', data: confidence, borderColor: 'blue', fill: false }
                ]
              },
              options: {
                responsive: false,
                plugins: { legend: { display: true } },
                scales: { x: { title: { display: true, text: 'Temps (s)' } }, y: { min: 0, max: 1 } }
              }
            });
            // Attendre le rendu du graphique
            await new Promise(res => setTimeout(res, 500));
            const chartImg = canvas.toDataURL('image/png');
            doc.addPage();
            doc.setFontSize(13);
            doc.text('Courbe d’évolution des émotions', 14, 16);
            doc.addImage(chartImg, 'PNG', 14, 22, 180, 80);

            // Nouvelle page pour le tableau détaillé
            doc.addPage();
            doc.setFontSize(13);
            doc.text('Tableau détaillé des frames (émotions faciales & vocales)', 14, 16);
            doc.setFontSize(9);

            // En-têtes du tableau
            const headers = [
              'Frame', 'Temps (s)', 'Joie', 'Colère', 'Tristesse', 'Surprise', 'Peur', 'Neutre', 'Face?', 'Stress vocal', 'Confiance vocale', 'Pitch', 'Volume', 'Notes'
            ];
            let tableY = 24;
            doc.text(headers.join(' | '), 14, tableY);
            tableY += 5;

            // Afficher max 30 frames pour éviter surcharge PDF
            const maxRows = 30;
            (frames || []).slice(0, maxRows).forEach((f) => {
              const row = [
                f.frameNumber,
                f.timestampSeconds,
                f.joy,
                f.anger,
                f.sadness,
                f.surprise,
                f.fear,
                f.neutral,
                f.faceDetected ? 'Oui' : 'Non',
                f.voiceStress ?? '',
                f.voiceConfidence ?? '',
                f.pitch ?? '',
                f.volumeLevel ?? '',
                f.notes ?? ''
              ];
              doc.text(row.map(String).join(' | '), 14, tableY);
              tableY += 5;
              if (tableY > 270) {
                doc.addPage();
                tableY = 16;
              }
            });
            if ((frames || []).length > maxRows) {
              doc.text(`... (${frames.length - maxRows} frames supplémentaires non affichées)`, 14, tableY);
            }

            doc.save(`emotion-result-entretien-${entretienId}.pdf`);
          },
          error: (error: any) => {
            alert(`Impossible de récupérer les frames détaillées (${error?.status || 'erreur'}).`);
          }
        });
      },
      error: (error: any) => {
        alert(`Impossible de generer le PDF (${error?.status || 'erreur'}).`);
      }
    });
  }

  openEntretienDetails(entretien: any): void {
    this.selectedEntretienDetails = entretien;
    this.showEntretienDetailsModal = true;
  }

  closeEntretienDetails(): void {
    this.showEntretienDetailsModal = false;
    this.selectedEntretienDetails = null;
  }

  getStatusLabel(entretien: any): string {
    return entretien?.completed ? 'Termine' : 'En cours';
  }

  getStatusClass(entretien: any): string {
    return entretien?.completed ? 'status-completed' : 'status-pending';
  }

  getEntretienDescriptionPreview(description: string | null | undefined): string {
    const value = (description || '').trim();
    if (!value) {
      return '-';
    }
    return value.length > 85 ? `${value.slice(0, 85)}...` : value;
  }

  getTotalEntretiensCount(): number {
    return this.entretiens.length;
  }

  getCompletedEntretiensCount(): number {
    return this.entretiens.filter(e => !!e.completed).length;
  }

  getActiveEntretiensCount(): number {
    return this.entretiens.filter(e => !e.completed).length;
  }

  formatEntretienDate(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return 'Non planifiee';
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    return date.toLocaleString('fr-FR');
  }

  goToAddQuestions(entretienId: number): void {
    this.loadQuestions(entretienId);
  }

  isVideoEntretien(entretien: any): boolean {
    const mode = String(entretien?.mode || entretien?.modeEntretien || '').toUpperCase();
    return mode === 'VIDEO';
  }

  openVideoRoom(entretien: any): void {
    if (!this.isVideoEntretien(entretien)) {
      alert('Cet entretien n est pas en mode video.');
      return;
    }

    const entretienId = Number(entretien?.id);
    if (Number.isFinite(entretienId) && entretienId > 0) {
      this.router.navigate(['/entretiens/video', entretienId]);
      return;
    }

    const meetingLink = this.resolveMeetingLink(entretien);
    if (meetingLink) {
      window.open(meetingLink, '_blank', 'noopener,noreferrer');
      return;
    }

    alert('Impossible d ouvrir la salle video: identifiant ou lien manquant.');
  }

  editEntretien(entretien: any): void {
    this.editingEntretien = { ...entretien };
    this.editingEntretien.offreId = this.resolveOffreId(entretien);
    this.editingEntretien.candidatId = this.resolveCandidatId(entretien);
    if (this.editingEntretien.offreId) {
      this.loadCandidaturesForOffre(this.editingEntretien.offreId);
    }
    if (!this.editingEntretien.dureeMinutes) {
      this.editingEntretien.dureeMinutes = 30;
    }
    // Convertir la date pour l'input datetime-local
    if (this.editingEntretien.dateEntretien) {
      this.editingEntretien.dateEntretien = this.formatDateForInput(this.editingEntretien.dateEntretien);
    }
    this.showCreateForm = false; // Masquer le formulaire de création si ouvert
  }

  // Méthodes CRUD supplémentaires
  updateEntretien(entretien: any): void {
    if (!this.currentUserId) {
      alert('Erreur : ID du recruteur manquant.');
      return;
    }

    localStorage.setItem('recruteurId', String(this.currentUserId));

    if (!this.validateEntretienUpdate(entretien)) {
      return;
    }

    const isTestUpdate = (entretien.type || '').toUpperCase() === 'TEST';
    const updatedMode = String(entretien.mode || entretien.modeEntretien || 'QUESTIONS').toUpperCase();
    const resolvedOffreId = this.resolveOffreId(entretien);
    const resolvedCandidatId = this.resolveCandidatId(entretien) || this.resolveAcceptedCandidatIdFromOffre(resolvedOffreId);
    const submittedDate = this.normalizeUpdateDate(entretien.dateEntretien);
    const updatedData: any = {
      titre: entretien.titre,
      description: entretien.description,
      domaine: entretien.domaine,
      type: entretien.type?.toUpperCase(),
      categorie: entretien.type?.toUpperCase(),
      mode: updatedMode,
      meetingLink: updatedMode === 'VIDEO' ? this.resolveMeetingLink(entretien) : null,
      dateEntretien: submittedDate,
      dureeMinutes: Number(entretien.dureeMinutes ?? 30),
      photo: entretien.photo || null,
    };
    updatedData.seuilReussite = isTestUpdate ? null : (entretien.seuilReussite ?? 70);

    if (resolvedCandidatId) {
      updatedData.candidatId = resolvedCandidatId;
    }

    if (resolvedOffreId) {
      updatedData.offreId = resolvedOffreId;
    }

    console.log('📤 updateEntretien payload:', updatedData);

    this.apiService.updateEntretien(entretien.id, updatedData).subscribe({
      next: (response) => {
        alert('Entretien mis à jour avec succès!');
        this.editingEntretien = null;
        this.loadEntretiens();
      },
      error: (error: any) => {
        const backendMessage = String(error?.error?.message || error?.error || error?.message || '');
        const dateRelatedFailure = error?.status === 400 && /date|futur|future/i.test(backendMessage);

        if (dateRelatedFailure && !updatedData._retryWithFutureDate) {
          const retryPayload = {
            ...updatedData,
            dateEntretien: this.ensureFutureDateForBackend(updatedData.dateEntretien),
            _retryWithFutureDate: true
          };

          console.warn('⚠ Retraitement updateEntretien avec date future de secours:', retryPayload);
          this.apiService.updateEntretien(entretien.id, retryPayload).subscribe({
            next: () => {
              alert('Entretien mis à jour avec succès!');
              this.editingEntretien = null;
              this.loadEntretiens();
            },
            error: (retryError: any) => {
              console.error('Erreur mise à jour entretien:', retryError);
              console.error('🔻 body:', retryError.error);
              console.error('🔻 status:', retryError.status, retryError.statusText);
              alert(`Erreur mise à jour entretien: ${retryError.error?.message || retryError.message || '500 interne'}`);
            }
          });
          return;
        }

        console.error('Erreur mise à jour entretien:', error);
        console.error('🔻 body:', error.error);
        console.error('🔻 status:', error.status, error.statusText);
        alert(`Erreur mise à jour entretien: ${error.error?.message || error.message || '500 interne'}`);
      }
    });
  }

  deleteEntretien(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet entretien ? Cette action est irréversible.')) {
      if (!this.currentUserId) {
        alert('Erreur : ID du recruteur manquant.');
        return;
      }

      localStorage.setItem('recruteurId', String(this.currentUserId));

      this.apiService.deleteEntretien(id).subscribe({
        next: () => {
          alert('Entretien supprimé avec succès!');
          this.entretiens = this.entretiens.filter(e => e.id !== id);
        },
        error: (error) => {
          console.error('Erreur suppression entretien:', error);
          alert(`Erreur lors de la suppression: ${error.error?.message || error.message}`);
        }
      });
    }
  }

  // Méthodes de validation
  validateEntretienForm(): boolean {
    if (!this.newEntretien.description || this.newEntretien.description.trim().length < 10) {
      alert('La description doit contenir au moins 10 caractères.');
      return false;
    }

    if (this.newEntretien.description.length > 1000) {
      alert('La description ne peut pas dépasser 1000 caractères.');
      return false;
    }

    if (!this.newEntretien.dateEntretien || this.newEntretien.dateEntretien.trim() === '') {
      alert('La date et heure de l\'entretien sont obligatoires.');
      return false;
    }

    const duree = Number(this.newEntretien.dureeMinutes);
    if (!Number.isFinite(duree) || duree < 1 || duree > 300) {
      alert('La duree de l\'entretien doit etre entre 1 et 300 minutes.');
      return false;
    }

    if (this.newEntretien.mode == null || this.newEntretien.mode.trim() === '') {
      alert("Le mode de l'entretien est obligatoire.");
      return false;
    }

    if (this.newEntretien.mode === 'VIDEO') {
      const link = (this.newEntretien.meetingLink || '').trim();
      if (!link) {
        alert('Le lien de réunion est obligatoire pour un entretien vidéo.');
        return false;
      }
      if (!/^https?:\/\//i.test(link)) {
        alert('Le lien de réunion doit commencer par http:// ou https://');
        return false;
      }

      const selectedCandidateId = Number(this.newEntretien.candidatId);
      if (!Number.isFinite(selectedCandidateId) || selectedCandidateId <= 0) {
        alert('Pour un entretien vidéo, veuillez sélectionner un seul candidat accepté.');
        return false;
      }

      if (this.newEntretien.offreId && this.candidaturesOffre.length > 0) {
        const selectedIsAccepted = this.candidaturesOffre.some((candidature: any) => {
          const raw = candidature?.candidatId ?? candidature?.candidat?.id ?? candidature?.idCandidat;
          return Number(raw) === selectedCandidateId;
        });

        if (!selectedIsAccepted) {
          alert('Le candidat sélectionné doit appartenir à la liste des candidats acceptés.');
          return false;
        }
      }
    }

    if (this.newEntretien.domaine == null || this.newEntretien.domaine.trim() === '') {
      alert('Le domaine est obligatoire.');
      return false;
    }

    if (this.newEntretien.type !== 'TEST' && !this.newEntretien.offreId) {
      const s = this.newEntretien.seuilReussite;
      if (s == null || s < 0 || s > 100) {
        alert('Le seuil de réussite doit être entre 0 et 100.');
        return false;
      }
    }

    return true;
  }

  validateEntretienUpdate(entretien: any): boolean {
    if (!entretien.description || entretien.description.trim().length < 10) {
      alert('La description doit contenir au moins 10 caractères.');
      return false;
    }

    if (entretien.description.length > 1000) {
      alert('La description ne peut pas dépasser 1000 caractères.');
      return false;
    }

    if (!entretien.type) {
      alert('Le type d\'entretien est requis.');
      return false;
    }

    if (!entretien.dateEntretien) {
      alert('La date/heure est requise.');
      return false;
    }

    const duree = Number(entretien.dureeMinutes);
    if (!Number.isFinite(duree) || duree < 1 || duree > 300) {
      alert('La duree de l\'entretien doit etre entre 1 et 300 minutes.');
      return false;
    }

    if (!entretien.domaine || entretien.domaine.trim() === '') {
      alert('Le domaine est obligatoire.');
      return false;
    }

    const mode = String(entretien.mode || entretien.modeEntretien || 'QUESTIONS').toUpperCase();
    if (mode === 'VIDEO') {
      const link = this.resolveMeetingLink(entretien);
      if (!link) {
        alert('Le lien de réunion est obligatoire pour un entretien vidéo.');
        return false;
      }
      if (!/^https?:\/\//i.test(link)) {
        alert('Le lien de réunion doit commencer par http:// ou https://');
        return false;
      }
    }

    if (entretien.type !== 'TEST') {
      const s = entretien.seuilReussite;
      if (s == null || s < 0 || s > 100) {
        alert('Le seuil de réussite doit être entre 0 et 100.');
        return false;
      }
    }

    return true;
  }

  private normalizeUpdateDate(value: string): string {
    const trimmed = String(value || '').trim();
    return trimmed;
  }

  private ensureFutureDateForBackend(value: string): string {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return new Date(Date.now() + 5 * 60 * 1000).toISOString();
    }

    const minimumFuture = Date.now() + 5 * 60 * 1000;
    if (parsed.getTime() <= minimumFuture) {
      return new Date(minimumFuture).toISOString();
    }

    return parsed.toISOString();
  }

  private resolveOffreId(entretien: any): number | null {
    const raw = entretien?.offreId ?? entretien?.offre?.id ?? entretien?.offreEmploi?.id ?? entretien?.offreEmploiId;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private resolveCandidatId(entretien: any): number | null {
    const raw = entretien?.candidatId ?? entretien?.candidat?.id;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private resolveAcceptedCandidatIdFromOffre(offreId: number | null): number | null {
    if (!offreId) {
      return null;
    }

    const acceptedCandidate = this.candidaturesOffre.find((candidature: any) => this.isAcceptedCandidature(candidature));
    const raw = acceptedCandidate?.candidatId ?? acceptedCandidate?.candidat?.id ?? acceptedCandidate?.idCandidat;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // Méthode utilitaire pour formater les dates
  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }

    // Build datetime-local in local timezone (avoids UTC shift to past dates).
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Méthode pour obtenir le nom du candidat
  getCandidateName(candidatId: number): string {
    const candidat = this.candidats.find(c => c.id === candidatId);
    return candidat ? `${candidat.nom} ${candidat.prenom}` : 'Candidat inconnu';
  }

  private resolveMeetingLink(primary: any, fallback?: any): string {
    return String(
      primary?.meetingLink || primary?.lienEntretien || primary?.videoUrl ||
      fallback?.meetingLink || fallback?.lienEntretien || ''
    ).trim();
  }

  generateMeetingLinkForCreate(): void {
    const slug = `jobmatch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.newEntretien.meetingLink = `https://meet.jit.si/${slug}`;
  }

  generateMeetingLinkForEdit(): void {
    if (!this.editingEntretien) {
      return;
    }
    const slug = `jobmatch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.editingEntretien.meetingLink = `https://meet.jit.si/${slug}`;
  }

  // Méthodes pour la gestion des questions
  questions: any[] = [];
  selectedEntretienId: number | null = null;
  showQuestionsForm = false;
  newQuestion = {
    question: '',
    type: 'QCM',
    options: ['', '', '', ''],
    bonneReponse: '',
    bonneReponses: [] as number[],
    points: 1,
    domaineId: null
  };
  editingQuestion: any = null;
  domaines: any[] = [];
  typesQuestion = ['QCM', 'VRAI_FAUX', 'LIBRE', 'CODE'];

  trackByIndex(index: number, item: any): number {
    return index;
  }

  toggleCorrectChoice(index: number): void {
    const pos = this.newQuestion.bonneReponses.indexOf(index);
    if (pos > -1) {
      this.newQuestion.bonneReponses.splice(pos, 1);
    } else {
      this.newQuestion.bonneReponses.push(index);
    }
  }

  onQuestionTypeChange(): void {
    if (this.newQuestion.type !== 'QCM') {
      this.newQuestion.bonneReponses = [];
      this.newQuestion.bonneReponse = '';
    }
    if (this.newQuestion.type === 'VRAI_FAUX') {
      this.newQuestion.options = [];
    } else if (this.newQuestion.type !== 'VRAI_FAUX' && this.newQuestion.options.length < 2) {
      this.newQuestion.options = ['', '', '', ''];
    }
  }

  loadQuestions(entretienId: number): void {
    this.selectedEntretienId = entretienId;
    this.apiService.getQuestionsByEntretien(entretienId).subscribe({
      next: (data: any[]) => {
        this.questions = Array.isArray(data) ? data : [];
        this.showQuestionsForm = true;
      },
      error: (error) => {
        console.error('Erreur chargement questions', error);
        this.questions = [];
      }
    });
  }

  private getFallbackDomaines(): any[] {
    return [
      { id: 1, nom: 'INFORMATIQUE' },
      { id: 2, nom: 'BUSINESS' },
      { id: 3, nom: 'SANTÉ' },
      { id: 4, nom: 'INGÉNIERIE' },
      { id: 5, nom: 'ÉDUCATION' },
      { id: 6, nom: 'DESIGN' },
      { id: 7, nom: 'COMMUNICATION' },
      { id: 8, nom: 'INDUSTRIE' },
      { id: 9, nom: 'COMMERCE' },
      { id: 10, nom: 'AUTRE' }
    ];
  }

  loadDomaines(): void {
    this.apiService.getDomaines().subscribe({
      next: (data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          if (typeof data[0] === 'string') {
            this.domaines = data.map((nom: string, index: number) => ({ id: index + 1, nom }));
          } else if (data[0] && (data[0].nom !== undefined || data[0].name !== undefined)) {
            this.domaines = data.map((item: any, index: number) => ({
              id: item.id ?? index + 1,
              nom: item.nom ?? item.name ?? item.label ?? `Domaine ${index + 1}`
            }));
          } else {
            this.domaines = this.getFallbackDomaines();
          }
        } else {
          console.warn('Aucun domaine reçu du backend, fallback appliqué');
          this.domaines = this.getFallbackDomaines();
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement domaines', error);
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('recruteurId');
          alert('Session expirée. Veuillez vous reconnecter.');
          this.router.navigate(['/login']);
          return;
        }
        // Faites tomber 500 ou autre sur fallback pour éviter select vide
        this.domaines = this.getFallbackDomaines();
      }
    });
  }

  createQuestion(): void {
    if (!this.validateQuestionForm()) {
      return;
    }

    if (!this.selectedEntretienId) {
      alert('Erreur : Aucun entretien sélectionné.');
      return;
    }

    const payload: any = {
      question: this.newQuestion.question,
      type: this.newQuestion.type,
      options: this.newQuestion.type === 'QCM' ? this.newQuestion.options : null,
      points: this.newQuestion.points,
      domaineId: this.newQuestion.domaineId,
      entretienId: this.selectedEntretienId
    };

    if (this.newQuestion.type === 'QCM') {
      payload.bonneReponses = this.newQuestion.bonneReponses;
      // Pour compatibilité descendante
      payload.bonneReponse = this.newQuestion.bonneReponses.length > 0
        ? this.newQuestion.options[this.newQuestion.bonneReponses[0]]
        : '';
    } else {
      payload.bonneReponse = this.newQuestion.bonneReponse;
    }


    this.apiService.createQuestion(payload).subscribe({
      next: (response) => {
        alert('Question créée avec succès!');
        this.questions.push(response);
        this.resetQuestionForm();
      },
      error: (error) => {
        console.error('Erreur création question:', error);
        alert(`Erreur lors de la création: ${error.error?.message || error.message}`);
      }
    });
  }

  updateQuestion(question: any): void {
    const updatedData: any = {
      question: question.question,
      type: question.type,
      options: question.type === 'QCM' ? question.options : null,
      points: question.points,
      domaineId: question.domaineId
    };

    if (question.type === 'QCM') {
      updatedData.bonneReponses = question.bonneReponses || [];
      updatedData.bonneReponse = updatedData.bonneReponses.length > 0
        ? question.options[updatedData.bonneReponses[0]]
        : '';
    } else {
      updatedData.bonneReponse = question.bonneReponse;
    }

    this.apiService.updateQuestion(question.id, updatedData).subscribe({
      next: (response) => {
        alert('Question mise à jour avec succès!');
        this.loadQuestions(this.selectedEntretienId!);
      },
      error: (error) => {
        console.error('Erreur mise à jour question:', error);
        alert(`Erreur lors de la mise à jour: ${error.error?.message || error.message}`);
      }
    });
  }

  deleteQuestion(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
      this.apiService.deleteQuestion(id).subscribe({
        next: () => {
          alert('Question supprimée avec succès!');
          this.questions = this.questions.filter(q => q.id !== id);
        },
        error: (error) => {
          console.error('Erreur suppression question:', error);
          alert(`Erreur lors de la suppression: ${error.error?.message || error.message}`);
        }
      });
    }
  }

  editQuestion(question: any): void {
    this.editingQuestion = { ...question };
  }

  cancelEdit(): void {
    this.editingQuestion = null;
  }

  viewQuestionDetails(question: any): void {
    let details = `
Détails de la question:

ID: ${question.id}
Question: ${question.question}
Type: ${question.type}
Points: ${question.points}
Domaine: ${question.domaineId ? 'ID: ' + question.domaineId : 'Non spécifié'}
`;

    if (question.type === 'QCM' && question.options && question.options.length > 0) {
      details += '\nOptions:\n';
      question.options.forEach((option: string, index: number) => {
        const marker = question.bonneReponses && question.bonneReponses.includes(index) ? ' ✓' : '';
        details += `${index + 1}. ${option}${marker}\n`;
      });
    }

    if (question.type === 'QCM') {
      const corrects = Array.isArray(question.bonneReponses)
        ? question.bonneReponses.map((i: number) => question.options?.[i] || '').filter((o: string) => o)
        : [question.bonneReponse];
      details += `\nBonne(s) réponse(s): ${corrects.join(', ')}`;
    } else {
      details += `\nBonne réponse: ${question.bonneReponse}`;
    }

    alert(details);
  }

  private resetQuestionForm(): void {
    this.newQuestion = {
      question: '',
      type: 'QCM',
      options: ['', '', '', ''],
      bonneReponse: '',
      bonneReponses: [],
      points: 1,
      domaineId: null
    };
  }

  validateQuestionForm(): boolean {
    if (!this.newQuestion.question || this.newQuestion.question.trim().length < 5) {
      alert('La question doit contenir au moins 5 caractères.');
      return false;
    }

    if (this.newQuestion.question.length > 500) {
      alert('La question ne peut pas dépasser 500 caractères.');
      return false;
    }

    if (!this.newQuestion.type) {
      alert('Veuillez sélectionner un type de question.');
      return false;
    }

    if (this.newQuestion.type === 'QCM') {
      const validOptions = this.newQuestion.options.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        alert('Une question QCM doit avoir au moins 2 options.');
        return false;
      }
      if (!this.newQuestion.bonneReponses || this.newQuestion.bonneReponses.length === 0) {
        alert('Une question QCM doit avoir au moins une réponse correcte.');
        return false;
      }
      const allSelectedValid = this.newQuestion.bonneReponses.every(index => index >= 0 && index < this.newQuestion.options.length && this.newQuestion.options[index].trim() !== '');
      if (!allSelectedValid) {
        alert('Toutes les réponses correctes doivent correspondre à des options valides.');
        return false;
      }
    }

    if (this.newQuestion.points < 1 || this.newQuestion.points > 10) {
      alert('Les points doivent être entre 1 et 10.');
      return false;
    }

    return true;
  }

  addOption(): void {
    if (this.newQuestion.options.length < 6) {
      this.newQuestion.options.push('');
    }
  }

  removeOption(index: number): void {
    if (this.newQuestion.options.length > 2) {
      this.newQuestion.options.splice(index, 1);
    }
  }
}
