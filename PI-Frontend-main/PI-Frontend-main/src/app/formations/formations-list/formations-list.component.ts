import { Component, OnInit } from '@angular/core';
import { Formation, FormationStats } from '../models/formation.model';
import { FormationService } from '../services/formation.service';
import { FeedbackService } from '../services/feedback.service';
import { ApiService } from '../../api.service';
import { ParcoursService } from '../services/parcours.service';
import { ParcoursFormation } from '../models/parcours.model';

@Component({
  selector: 'app-formations-list',
  standalone: false,
  templateUrl: './formations-list.component.html',
  styleUrls: ['./formations-list.component.scss']
})
export class FormationsListComponent implements OnInit {

  formations: Formation[] = [];
  filtered:   Formation[] = [];
  parcours: ParcoursFormation[] = [];
  searchTerm   = '';
  activeFilter = 'Toutes';
  filters = ['Toutes', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
  loading = false;
  refreshing = false;
  isAdmin = false;
  ratings: { [formationId: number]: { moyenne: number; total: number } } = {};
  stars = [1, 2, 3, 4, 5];

  stats:          FormationStats[] = [];
  topFormations:  FormationStats[] = [];
  badgeFilter     = '';
  categorieFilter = '';
  contentTypeFilter: 'all' | 'formation' | 'parcours' = 'all';

  unifiedFiltered: any[] = [];

  // --- RECOMMANDATIONS ML ---
  isRecommandationMode = false;
  recommandations: { formation: Formation; score_match: number; raisons: string[] }[] = [];
  loadingRecommandations = false;

  readonly badges = ['', 'Tendance', 'Populaire', 'Top noté', 'Bien noté', 'En progression'];
  readonly categories = [
    '', 'Frontend', 'Backend', 'IA', 'Data',
    'DevOps', 'Design', 'Mobile', 'Développement'
  ];
  // Skill Gap Analysis
  isGapAnalysisMode: boolean = false;
  gapResult: any = null;
  selectedTargetJob: string = 'DevOps Engineer';
  targetJobs: string[] = [
    'Full Stack Developer',
    'Backend Developer',
    'Frontend Developer',
    'Data Scientist',
    'Data Engineer',
    'DevOps Engineer',
    'Cloud Architect',
    'Mobile Developer',
    'Cybersecurity Analyst',
    'AI Engineer',
    'UI/UX Designer',
    'Product Manager',
    'QA Automation Engineer'
  ];
  loadingGap: boolean = false;

  constructor(
    private formationService: FormationService,
    private feedbackService:  FeedbackService,
    private parcoursService: ParcoursService,
    private apiService:       ApiService
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('userRole') || '').toUpperCase().replace('ROLE_', '');
    this.isAdmin = role === 'ADMIN';

    // Sécurité : récupérer le candidatId s'il manque mais que l'utilisateur est connecté
    const email = localStorage.getItem('userEmail');
    const existingId = localStorage.getItem('candidatId');
    if (role === 'CANDIDAT' && email && !existingId) {
      this.apiService.getCandidateByEmail(email).subscribe({
        next: (cand: any) => {
          if (cand && cand.id) {
            localStorage.setItem('candidatId', String(cand.id));
          }
        }
      });
    }

    this.loadAll();
    this.loadParcours();
  }

  loadAll(): void {
    this.loadFormations();
    this.loadStats();
    this.loadTop();
  }

  loadParcours(): void {
    this.parcoursService.getAll().subscribe({
      next: (data) => {
        this.parcours = data.filter(p => p.statut !== 'Archivée');
        this.applySearch();
      },
      error: () => {
        this.parcours = [];
      }
    });
  }

  // IDs des formations rattachées à un parcours (pour filter la liste publique)
  private get usedFormationIds(): Set<number> {
    const ids = new Set<number>();
    this.parcours.forEach(p => {
      if (p.niveauDebutant?.id)      ids.add(Number(p.niveauDebutant.id));
      if (p.niveauIntermediaire?.id) ids.add(Number(p.niveauIntermediaire.id));
      if (p.niveauAvance?.id)        ids.add(Number(p.niveauAvance.id));
      if (p.niveauExpert?.id)        ids.add(Number(p.niveauExpert.id));
    });
    return ids;
  }

  loadFormations(): void {
    this.loading = true;
    this.formationService.getAllFormations().subscribe({
      next: (data: Formation[]) => {
        this.formations = data.filter(f => f.statut !== 'Archivée');
        this.filtered   = [...this.formations];
        this.loading    = false;
        this.loadRatings();
      },
      error: () => { this.loading = false; }
    });
  }

  loadStats(): void {
    const req = this.categorieFilter
      ? this.formationService.getStatsByCategorie(this.categorieFilter)
      : this.formationService.getStats();

    req.subscribe({ next: (data) => { this.stats = data; } });
  }

  loadTop(): void {
    this.formationService.getTopFormations().subscribe({
      next: (data) => {
        this.topFormations = data;
        // Charger les ratings pour chaque formation du top
        this.topFormations.forEach(t => {
          const key = t.formationId;
          if (!this.ratings[key]) {
            this.feedbackService.getStats(key).subscribe({
              next:  (s) => { this.ratings[key] = s; },
              error: ()  => { this.ratings[key] = { moyenne: 0, total: 0 }; }
            });
          }
        });
      }
    });
  }

  refreshStatistics(): void {
    this.refreshing = true;
    this.formationService.refreshScoresAndBadges().subscribe({
      next: () => {
        this.refreshing = false;
        this.loadAll();
      },
      error: () => {
        this.refreshing = false;
        this.loadAll();
      }
    });
  }

  private loadRatings(): void {
    // 1. Collecter tous les IDs de formations (simples + parcours)
    const allIds = new Set<number>();
    this.formations.forEach(f => allIds.add(f.id));
    this.parcours.forEach(p => {
      if (p.niveauDebutant?.id)      allIds.add(p.niveauDebutant.id);
      if (p.niveauIntermediaire?.id) allIds.add(p.niveauIntermediaire.id);
      if (p.niveauAvance?.id)        allIds.add(p.niveauAvance.id);
      if (p.niveauExpert?.id)        allIds.add(p.niveauExpert.id);
    });

    // 2. Charger les ratings
    allIds.forEach(id => {
      this.feedbackService.getStats(id).subscribe({
        next:  (s) => { this.ratings[id] = s; this.applySearch(); },
        error: ()  => { this.ratings[id] = { moyenne: 0, total: 0 }; }
      });
    });
  }

  getParcoursRating(p: ParcoursFormation): { moyenne: number; total: number } {
    let sum = 0;
    let count = 0;
    let totalAvis = 0;

    const levels = [p.niveauDebutant, p.niveauIntermediaire, p.niveauAvance, p.niveauExpert];
    levels.forEach(f => {
      if (f && this.ratings[f.id]) {
        const r = this.ratings[f.id];
        if (r.total > 0) {
          sum += r.moyenne;
          count++;
          totalAvis += r.total;
        }
      }
    });

    return {
      moyenne: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      total: totalAvis
    };
  }


  onBadgeChange(badge: string): void {
    this.badgeFilter = badge;
    this.applySearch();
  }

  onCategorieChange(cat: string): void {
    this.categorieFilter = cat;
    this.loadStats();
    this.applySearch();
  }

  onTypeChange(type: 'all' | 'formation' | 'parcours'): void {
    this.contentTypeFilter = type;
    this.isRecommandationMode = false;
    this.isGapAnalysisMode = false;
    this.activeFilter = 'Toutes'; 
    this.applySearch();
  }

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    this.isRecommandationMode = false;
    this.isGapAnalysisMode = false;
    this.applySearch();
  }

  activerGapAnalysis(): void {
    this.isGapAnalysisMode = true;
    this.isRecommandationMode = false;
    this.activeFilter = '';
    this.gapResult = null;
  }

  analyzeGap(): void {
    const candidatId = Number(localStorage.getItem('candidatId'));
    if (!candidatId) {
      alert('Vous devez être connecté pour analyser votre carrière.');
      return;
    }

    this.loadingGap = true;
    this.apiService.analyzeSkillGap(candidatId, this.selectedTargetJob).subscribe({
      next: (data: any) => {
        // Enrichir les recommandations avec les objets formations complets de notre liste locale
        if (data && data.recommended_formations) {
          data.recommended_formations = data.recommended_formations.map((rec: any) => {
            const fullFormation = this.formations.find(f => f.id === rec.formation_id);
            return {
              ...rec,
              formation: fullFormation || { 
                id: rec.formation_id, 
                titre: `Formation #${rec.formation_id}`, 
                categorie: 'Informatique',
                imageUrl: null
              }
            };
          });
        }
        this.gapResult = data;
        this.loadingGap = false;
      },
      error: () => {
        alert('Erreur lors de l\'analyse de l\'écart de compétences.');
        this.loadingGap = false;
      }
    });
  }

  activerRecommandations(): void {
    this.isRecommandationMode = true;
    this.isGapAnalysisMode = false;
    this.activeFilter = '';

    const candidatId = Number(localStorage.getItem('candidatId'));
    if (!candidatId) {
      alert('Vous devez être connecté en tant que candidat pour voir vos recommandations.');
      this.isRecommandationMode = false;
      this.activeFilter = 'Toutes';
      return;
    }

    this.loadingRecommandations = true;
    this.formationService.getFormationsRecommandees(candidatId).subscribe({
      next: (data: any[]) => {
        this.recommandations = data.map(item => ({
          formation: item.formation as Formation,
          score_match: item.score_match || 0,
          raisons: item.raisons || []
        }));
        this.loadingRecommandations = false;
      },
      error: () => {
        this.loadingRecommandations = false;
        alert('Le service de recommandation IA est indisponible. Vérifiez que le serveur Python tourne sur le port 5000.');
        this.isRecommandationMode = false;
        this.activeFilter = 'Toutes';
      }
    });
  }

  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const usedIds = this.usedFormationIds;

    // 1. Filtrer les formations
    let filteredFormations = this.formations.filter(f => {
      // Exclure les formations qui sont déjà dans un parcours pour éviter les doublons
      if (usedIds.has(Number(f.id))) return false;

      const matchNiv = this.activeFilter === 'Toutes' || f.niveau === this.activeFilter;
      const matchCat = !this.categorieFilter || f.categorie === this.categorieFilter;
      const matchBadge = !this.badgeFilter || f.badge === this.badgeFilter;
      const matchTerm = !term || f.titre.toLowerCase().includes(term) || f.categorie.toLowerCase().includes(term);
      
      return matchNiv && matchCat && matchBadge && matchTerm;
    });

    // 2. Filtrer les parcours
    let filteredParcours = this.parcours.filter(p => {
      const matchCat = !this.categorieFilter || p.categorie === this.categorieFilter;
      const matchBadge = !this.badgeFilter || this.getParcoursBadge(p) === this.badgeFilter;
      const matchTerm = !term || p.titre.toLowerCase().includes(term) || p.categorie.toLowerCase().includes(term);
      // Les parcours n'ont pas de niveau unique (ils sont multi-niveaux)
      const matchNiv = this.activeFilter === 'Toutes'; 
      
      return matchCat && matchBadge && matchTerm && matchNiv;
    });

    // 3. Appliquer le filtre de TYPE
    if (this.contentTypeFilter === 'formation') {
      this.unifiedFiltered = filteredFormations.map(f => ({ ...f, type: 'formation' }));
    } else if (this.contentTypeFilter === 'parcours') {
      this.unifiedFiltered = filteredParcours.map(p => {
        const pRating = this.getParcoursRating(p);
        return { 
          ...p, 
          type: 'parcours',
          plateforme: 'Parcours', 
          niveau: 'Multi-niveaux',
          duree: '4 niveaux',
          totalInscrits: (p as any).totalInscrits || 0,
          noteMoyenne: pRating.moyenne,
          nbAvis: pRating.total,
          badge: this.getParcoursBadge(p)
        };
      });
    } else {
      // Conserver l'ordre : Parcours d'abord, puis formations
      const pItems = filteredParcours.map(p => {
        const pRating = this.getParcoursRating(p);
        return { 
          ...p, 
          type: 'parcours',
          plateforme: 'Parcours',
          niveau: 'Multi-niveaux',
          duree: '4 niveaux',
          totalInscrits: (p as any).totalInscrits || 0,
          noteMoyenne: pRating.moyenne,
          nbAvis: pRating.total,
          badge: this.getParcoursBadge(p)
        };
      });
      const fItems = filteredFormations.map(f => ({ ...f, type: 'formation' }));
      this.unifiedFiltered = [...pItems, ...fItems];
    }

    this.filtered = filteredFormations; // Rétro-compatibilité si besoin
  }

  getDisponibles(): number {
    return this.formations.filter(f => f.statut === 'Disponible').length;
  }

  get totalCount(): number {
    const usedIds = this.usedFormationIds;
    // Formations qui ne sont pas dans un parcours
    const standaloneCount = this.formations.filter(f => !usedIds.has(Number(f.id))).length;
    // Plus le nombre de parcours
    return standaloneCount + this.parcours.length;
  }

  getRankClass(index: number): string {
    if (index === 0) return 'rank-gold';
    if (index === 1) return 'rank-silver';
    if (index === 2) return 'rank-bronze';
    return 'rank-other';
  }

  getRankLabel(index: number): string {
    if (index === 0) return 'Or';
    if (index === 1) return 'Argent';
    if (index === 2) return 'Bronze';
    return '';
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#633806'; // doré — top qualité
    if (score >= 50) return '#444441'; // argenté — bon
    if (score >= 30) return '#712B13'; // bronze — moyen
    return '#185FA5';                  // bleu — débutant
  }

  getTopNoteMoyenne(top: FormationStats): string | null {
    const r = this.ratings[top.formationId];
    if (r && r.moyenne > 0) return r.moyenne.toFixed(1);
    if (top.noteMoyenne && top.noteMoyenne > 0) return top.noteMoyenne.toFixed(1);
    return null;
  }

  getTopNbAvis(top: FormationStats): number {
    const r = this.ratings[top.formationId];
    if (r) return r.total;
    return 0;
  }

  getTopNoteEtoiles(top: FormationStats): number {
    const r = this.ratings[top.formationId];
    if (r && r.moyenne > 0) return Math.round(r.moyenne);
    if (top.noteMoyenne && top.noteMoyenne > 0) return Math.round(top.noteMoyenne);
    return 0;
  }

  getTopParticipants(top: FormationStats): number {
    return top.totalInscrits || 0;
  }


  getIconEmoji(categorie: string): string {
    const map: Record<string, string> = {
      'Data':          '📊',
      'Frontend':      '⚡',
      'Backend':       '🔧',
      'IA':            '🤖',
      'Design':        '🎨',
      'DevOps':        '🚀',
      'Développement': '💻',
      'Mobile':        '📱',
      'Cloud':         '☁️'
    };
    return map[categorie] || '📚';
  }

  getCatClass(categorie: string): string {
    const map: Record<string, string> = {
      'Développement': 'cat-dev',
      'Frontend':      'cat-frontend',
      'Backend':       'cat-backend',
      'IA':            'cat-ia',
      'Data':          'cat-data',
      'Design':        'cat-design',
      'DevOps':        'cat-devops'
    };
    return map[categorie] || 'cat-default';
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      'Disponible': 'disponible',
      'Bientôt':    'bientot',
      'Archivée':   'archivee'
    };
    return map[statut] || 'disponible';
  }

  getNiveauClass(niveau: string): string {
    const map: Record<string, string> = {
      'Débutant':      'debutant',
      'Intermédiaire': 'intermediaire',
      'Avancé':        'avance',
      'Expert':        'expert'
    };
    return map[niveau] || 'debutant';
  }


  getBadgeClass(badge: string | null | undefined): string {
    const map: Record<string, string> = {
      'Tendance':       'badge-purple',
      'Populaire':      'badge-blue',
      'Top noté':       'badge-green',
      'Bien noté':      'badge-teal',
      'En progression': 'badge-amber'
    };
    return badge ? (map[badge] || 'badge-gray') : '';
  }

  getBadgeIcon(badge: string | null | undefined): string {
    const map: Record<string, string> = {
      'Tendance':       '🔥',
      'Populaire':      '⭐',
      'Top noté':       '🏆',
      'Bien noté':      '👍',
      'En progression': '📈'
    };
    return badge ? (map[badge] || '') : '';
  }

  getParcoursBadge(p: ParcoursFormation): string | undefined {
    return p.niveauDebutant?.badge 
        || p.niveauIntermediaire?.badge 
        || p.niveauAvance?.badge 
        || p.niveauExpert?.badge;
  }
}