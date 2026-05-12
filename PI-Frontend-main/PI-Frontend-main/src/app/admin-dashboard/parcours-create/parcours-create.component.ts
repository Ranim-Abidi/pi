import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ParcoursService } from '../../formations/services/parcours.service';
import { FormationService, FormationCreatePayload } from '../../formations/services/formation.service';

interface NiveauStep {
  label: string;
  niveau: string;
  titre: string;
  categorie: string;
  plateforme: string;
  statut: string;
  duree: string;
  playlistId: string;
  youtubeId: string;
  lienExterne: string;
  writtenUrl: string;
  hasEditor: boolean;
  stackBlitzUrl: string;
  searchQuery: string;
  suggestions: any[];
  selectedSuggestion: any | null;
  searching: boolean;
  formationId?: number; // ID de la formation existante (mode édition)
}

@Component({
  selector: 'app-parcours-create',
  standalone: false,
  templateUrl: './parcours-create.component.html',
  styleUrls: ['./parcours-create.component.scss']
})
export class ParcoursCreateComponent implements OnInit {

  currentStep  = 0;
  parcoursTitre       = '';
  parcoursCategorie   = '';
  parcoursDescription = '';
  parcoursImageUrl    = '';
  submitting  = false;
  submitted   = false;

  // ── Mode édition ──────────────────────────────────────────────
  editMode    = false;
  parcoursId: number | null = null;
  loadingEdit = false;

  readonly stackBlitzTemplates = [
    { label: '-- Aucun --',   value: '' },
    { label: 'React',         value: 'https://stackblitz.com/fork/react?embed=1&hideNavigation=1&theme=dark&file=src/App.jsx' },
    { label: 'Angular',       value: 'https://stackblitz.com/fork/angular?embed=1&hideNavigation=1&theme=dark&file=src/app/app.component.ts' },
    { label: 'JavaScript',    value: 'https://stackblitz.com/fork/javascript?embed=1&hideNavigation=1&theme=dark&file=index.js' },
    { label: 'HTML / CSS',    value: 'https://stackblitz.com/fork/web?embed=1&hideNavigation=1&theme=dark&file=index.html' },
    { label: 'Node.js',       value: 'https://stackblitz.com/fork/node?embed=1&hideNavigation=1&theme=dark&file=index.js' },
    { label: 'Python',        value: 'https://stackblitz.com/fork/python?embed=1&hideNavigation=1&theme=dark&file=main.py' },
    { label: 'Vue.js',        value: 'https://stackblitz.com/fork/vue?embed=1&hideNavigation=1&theme=dark&file=src/App.vue' },
  ];

  steps: NiveauStep[] = [
    this.createStep('Débutant',      'Débutant'),
    this.createStep('Intermédiaire', 'Intermédiaire'),
    this.createStep('Avancé',        'Avancé'),
    this.createStep('Expert',        'Expert'),
  ];

  constructor(
    private parcoursService: ParcoursService,
    private formationService: FormationService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode   = true;
      this.parcoursId = Number(id);
      this.loadParcours(this.parcoursId);
    }
  }

  // ── Chargement données existantes ─────────────────────────────
  private loadParcours(id: number): void {
    this.loadingEdit = true;
    this.parcoursService.getById(id).subscribe({
      next: (p) => {
        this.parcoursTitre       = p.titre       || '';
        this.parcoursCategorie   = p.categorie   || '';
        this.parcoursDescription = p.description || '';
        this.parcoursImageUrl    = p.imageUrl    || '';

        this.mapFormationToStep(0, p.niveauDebutant);
        this.mapFormationToStep(1, p.niveauIntermediaire);
        this.mapFormationToStep(2, p.niveauAvance);
        this.mapFormationToStep(3, p.niveauExpert);

        this.loadingEdit = false;
      },
      error: () => { this.loadingEdit = false; }
    });
  }

  private mapFormationToStep(index: number, formation: any | undefined): void {
    if (!formation) return;
    const s          = this.steps[index];
    s.formationId    = formation.id;
    s.titre          = formation.titre        || '';
    s.categorie      = formation.categorie    || '';
    s.plateforme     = formation.plateforme   || 'YouTube';
    s.statut         = formation.statut       || 'Disponible';
    s.duree          = formation.duree        || '';
    s.playlistId     = formation.playlistId   || '';
    s.youtubeId      = formation.youtubeId    || '';
    s.lienExterne    = formation.lienExterne  || '';
    s.writtenUrl     = formation.writtenUrl   || '';
    s.hasEditor      = formation.hasEditor    ?? false;
    s.stackBlitzUrl  = formation.stackBlitzUrl || '';
  }

  private createStep(label: string, niveau: string): NiveauStep {
    return {
      label, niveau, titre: '', categorie: '', plateforme: 'YouTube', statut: 'Disponible',
      duree: '', playlistId: '', youtubeId: '', lienExterne: '', writtenUrl: '',
      hasEditor: false, stackBlitzUrl: '', searchQuery: '',
      suggestions: [], selectedSuggestion: null, searching: false
    };
  }

  // ── YouTube Search ────────────────────────────────────────────
  searchYoutube(stepIndex: number): void {
    const step = this.steps[stepIndex];
    if (!step.searchQuery || step.searchQuery.trim().length < 3) return;
    step.searching   = true;
    step.suggestions = [];
    this.http.get<any[]>(
      `${environment.apiUrl}/suggestions/formations?titre=${encodeURIComponent(step.searchQuery)}&niveau=${encodeURIComponent(step.niveau)}`
    ).subscribe({
      next: (data) => { step.suggestions = data; step.searching = false; },
      error: ()     => { step.searching = false; }
    });
  }

  selectSuggestion(stepIndex: number, suggestion: any): void {
    const step          = this.steps[stepIndex];
    step.selectedSuggestion = suggestion;
    step.titre          = suggestion.titre;
    step.playlistId     = suggestion.playlistId || '';
    step.categorie      = suggestion.categorie  || '';
    step.duree          = this.getDureeEstimee(suggestion);
    step.plateforme     = 'YouTube';
    step.statut         = 'Disponible';
    step.hasEditor      = ['Frontend', 'Backend', 'Data', 'IA', 'Développement'].includes(step.categorie);

    if (stepIndex === 0 && !this.parcoursCategorie) {
      this.parcoursCategorie = suggestion.categorie || '';
    }
  }

  clearSelection(stepIndex: number): void {
    const step          = this.steps[stepIndex];
    step.selectedSuggestion = null;
    step.titre          = '';
    step.playlistId     = '';
  }

  getDureeEstimee(suggestion: any): string {
    if (suggestion.dureeTotale) return suggestion.dureeTotale;
    if (suggestion.nbVideos > 0) {
      const h = Math.round(suggestion.nbVideos * 10 / 60 * 10) / 10;
      return `${h}h`;
    }
    return 'Durée à confirmer';
  }

  // ── Navigation ────────────────────────────────────────────────
  hasError(stepIndex: number, field: string): boolean {
    const step = this.steps[stepIndex];
    if (!step) return false;

    // On ne montre l'erreur que si l'utilisateur a déjà interagi ou essayé de passer à l'étape suivante
    if (!step.titre && field !== 'titre') return false; 

    switch (field) {
      case 'titre':
        return !step.titre || step.titre.trim().length < 3;
      case 'categorie':
        return !step.categorie;
      case 'plateforme':
        return !step.plateforme;
      case 'duree':
        return !step.duree || step.duree.trim().length === 0;
      case 'playlistId':
        // Requis si Disponible et pas de lien externe
        return step.statut === 'Disponible' && !step.playlistId && !step.lienExterne;
      case 'parcoursTitre':
        return !this.parcoursTitre && !this.autoTitre;
      case 'parcoursCategorie':
        return !this.parcoursCategorie && !this.steps[0].categorie;
      default:
        return false;
    }
  }

  getError(stepIndex: number, field: string): string {
    switch (field) {
      case 'titre':
        return "Le titre est requis (min. 3 caractères)";
      case 'categorie':
        return "Veuillez choisir une catégorie";
      case 'plateforme':
        return "Veuillez choisir une plateforme";
      case 'duree':
        return "La durée est requise (ex: 5h)";
      case 'playlistId':
        return "Une playlist YouTube ou un lien externe est requis pour une formation disponible";
      case 'parcoursTitre':
        return "Le titre du parcours est requis";
      case 'parcoursCategorie':
        return "La catégorie du parcours est requise";
      default:
        return "";
    }
  }

  get canProceed(): boolean {
    if (this.currentStep >= 4) return false;
    
    // Pour pouvoir passer à l'étape suivante, tous les champs requis doivent être valides
    return !this.hasError(this.currentStep, 'titre') &&
           !this.hasError(this.currentStep, 'categorie') &&
           !this.hasError(this.currentStep, 'plateforme') &&
           !this.hasError(this.currentStep, 'duree') &&
           !this.hasError(this.currentStep, 'playlistId');
  }

  nextStep(): void { if (this.canProceed && this.currentStep < 4) this.currentStep++; }
  prevStep(): void  { if (this.currentStep > 0) this.currentStep--; }

  goToStep(index: number): void {
    if (index <= this.currentStep || index <= this.getMaxReachedStep()) {
      this.currentStep = index;
    }
  }

  private getMaxReachedStep(): number {
    for (let i = 0; i < 4; i++) {
      if (!this.steps[i].titre || this.steps[i].titre.trim().length < 3) return i;
    }
    return 4;
  }

  // ── Auto-title ────────────────────────────────────────────────
  get autoTitre(): string {
    if (this.parcoursTitre) return this.parcoursTitre;
    const first = this.steps[0];
    if (first.titre) {
      const words = first.titre.split(/[\s\-\u2013\u2014:]+/).filter((w: string) => w.length > 3);
      return `Parcours ${words.slice(0, 3).join(' ')}`;
    }
    return 'Parcours Multi-Niveaux';
  }

  // ── Submit : création ou mise à jour ──────────────────────────
  submit(): void {
    if (this.submitting) return;
    this.submitting = true;

    const titre       = this.parcoursTitre    || this.autoTitre;
    const categorie   = this.parcoursCategorie || this.steps[0].categorie || 'Développement';
    const description = this.parcoursDescription || '';
    const imageUrl    = this.parcoursImageUrl  || '';

    const parcoursPayload: any = { titre, categorie, imageUrl, description };

    const d = this.buildFormationPayload(this.steps[0], 'Débutant');
    const i = this.buildFormationPayload(this.steps[1], 'Intermédiaire');
    const a = this.buildFormationPayload(this.steps[2], 'Avancé');
    const e = this.buildFormationPayload(this.steps[3], 'Expert');

    if (d) parcoursPayload.formationDebutant      = d;
    if (i) parcoursPayload.formationIntermediaire = i;
    if (a) parcoursPayload.formationAvance        = a;
    if (e) parcoursPayload.formationExpert        = e;

    const request$ = (this.editMode && this.parcoursId)
      ? this.parcoursService.update(this.parcoursId, parcoursPayload)
      : this.parcoursService.createAvecFormations(parcoursPayload);

    request$.subscribe({
      next: () => {
        this.submitted  = true;
        this.submitting = false;
        setTimeout(() => this.router.navigate(['/admin-dashboard/formations']), 2000);
      },
      error: (err) => {
        console.error(this.editMode ? 'Erreur mise à jour parcours:' : 'Erreur création parcours:', err);
        this.submitting = false;
      }
    });
  }

  private buildFormationPayload(step: NiveauStep, niveau: string): any {
    if (!step.titre || !step.titre.trim()) return undefined;

    const toUndefined = (val: string) => (val && val.trim()) ? val.trim() : undefined;

    const payload: any = {
      titre:         step.titre.trim(),
      categorie:     step.categorie  || this.parcoursCategorie || 'Développement',
      plateforme:    step.plateforme || 'YouTube',
      statut:        step.statut     || 'Disponible',
      duree:         step.duree      || 'Variable',
      niveau,
      playlistId:    toUndefined(step.playlistId),
      youtubeId:     toUndefined(step.youtubeId),
      lienExterne:   toUndefined(step.lienExterne),
      hasEditor:     step.hasEditor,
      stackBlitzUrl: toUndefined(step.stackBlitzUrl),
      writtenUrl:    toUndefined(step.writtenUrl)
    };

    // Mode édition : inclure l'ID de la formation pour la mettre à jour (pas en créer une nouvelle)
    if (this.editMode && step.formationId) {
      payload.id = step.formationId;
    }

    if (payload.statut === 'Bientôt') {
      payload.playlistId  = undefined;
      payload.youtubeId   = undefined;
      payload.lienExterne = undefined;
    }

    return payload;
  }
}
