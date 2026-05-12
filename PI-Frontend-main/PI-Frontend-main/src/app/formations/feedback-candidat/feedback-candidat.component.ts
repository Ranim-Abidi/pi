import { Component, OnInit, Input } from '@angular/core';
import {
  FormBuilder, Validators, FormGroup,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { Feedback, FeedbackCreatePayload } from '../models/feedback.model';
import { FeedbackService }   from '../services/feedback.service';
import { FormationService }  from '../services/formation.service';
import { Inscription }       from '../models/inscription.model';
import { ParcoursService }   from '../services/parcours.service';

@Component({
  selector: 'app-feedback-candidat',
  standalone: false,
  templateUrl: './feedback-candidat.component.html',
  styleUrls: ['./feedback-candidat.component.scss']
})
export class FeedbackCandidatComponent implements OnInit {

  @Input() formationId!: number;
  @Input() parcoursId?: number;

  feedbacks:    any[]           = [];
  myFeedback:   any             = null;
  candidatId:   number | null   = null;
  loading       = false;
  saving        = false;
  deletingId:   number | null   = null;
  editing       = false;
  showForm      = false;
  errorMsg      = '';
  successMsg    = '';

  serverErrors: Record<string, string> = {};

  aTermine        = false;
  checkingTermine = false;

  form: FormGroup;
  stars = [1, 2, 3, 4, 5];
  hoveredStar = 0;

  constructor(
    private fb:               FormBuilder,
    private feedbackService:  FeedbackService,
    private formationService: FormationService,
    private parcoursService:  ParcoursService
  ) {
    this.form = this.fb.group({
      note: [0, [
        Validators.required,
        Validators.min(1),
        Validators.max(5),
        this.noteMinValidator
      ]],
      commentaire: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(1000),
        this.noWhitespaceValidator
      ]]
    });
  }

  noteMinValidator(ctrl: AbstractControl): ValidationErrors | null {
    return ctrl.value < 1 ? { noteMin: true } : null;
  }

  noWhitespaceValidator(ctrl: AbstractControl): ValidationErrors | null {
    const val = (ctrl.value || '').trim();
    return val.length < (ctrl.value || '').length && val.length === 0
      ? { whitespace: true }
      : null;
  }

  ngOnInit(): void {
    this.resolveCandidatId();
  }

  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getError(field: string): string {
    if (this.serverErrors[field]) return this.serverErrors[field];
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.errors) return '';
    const e = ctrl.errors;

    if (field === 'note') {
      if (e['required'] || e['noteMin'] || e['min'])
        return 'Veuillez sélectionner une note entre 1 et 5 étoiles.';
      if (e['max']) return 'La note ne peut pas dépasser 5.';
    }

    if (field === 'commentaire') {
      if (e['required'] || e['whitespace'])
        return 'Le commentaire est obligatoire.';
      if (e['minlength'])
        return `Minimum ${e['minlength'].requiredLength} caractères.`;
      if (e['maxlength'])
        return `Maximum ${e['maxlength'].requiredLength} caractères.`;
    }
    return 'Valeur invalide.';
  }

  get commentaireRestant(): number {
    const val = this.form.get('commentaire')?.value || '';
    return 1000 - val.length;
  }

  private resolveCandidatId(): void {
    const role = (localStorage.getItem('userRole') || '').toUpperCase().replace(/^ROLE_/, '');
    const email = localStorage.getItem('userName') || '';

    if (email && role === 'CANDIDAT') {
      this.formationService.getCandidatByEmail(email).subscribe({
        next: (candidat: any) => {
          const id = Number(candidat?.id || 0);
          if (id > 0) {
            this.candidatId = id;
            localStorage.setItem('candidatId', String(id));
            this.loadData();
            return;
          }
          this.resolveCandidatIdFromCacheOrToken();
        },
        error: () => this.resolveCandidatIdFromCacheOrToken()
      });
      return;
    }

    this.resolveCandidatIdFromCacheOrToken();
  }

  private resolveCandidatIdFromCacheOrToken(): void {
    const cached = Number(localStorage.getItem('candidatId'));
    if (!Number.isNaN(cached) && cached > 0) {
      this.candidatId = cached;
      this.loadData();
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const id = Number(
          payload.candidatId || payload.idCandidat || payload.candidateId
        );
        if (!Number.isNaN(id) && id > 0) {
          this.candidatId = id;
          localStorage.setItem('candidatId', String(id));
          this.loadData();
          return;
        }
      } catch (e) {
        console.error('Erreur décodage token:', e);
      }
    }

    // Fallback par email
    const email = localStorage.getItem('userName') || '';
    const role  = (localStorage.getItem('userRole') || '').toUpperCase().replace(/^ROLE_/, '');
    if (!email || role !== 'CANDIDAT') {
      this.loadFeedbacksPublics();
      return;
    }

    this.formationService.getCandidatByEmail(email).subscribe({
      next: (candidat) => {
        if (candidat?.id) {
          this.candidatId = Number(candidat.id);
          localStorage.setItem('candidatId', String(candidat.id));
          this.loadData();
        } else {
          this.loadFeedbacksPublics();
        }
      },
      error: () => { this.loadFeedbacksPublics(); }
    });
  }

  formatNiveauLabel(niv: string): string {
    if (!niv) return 'Niveau';
    const mapping: any = {
      'DEBUTANT': 'Débutant',
      'INTERMEDIAIRE': 'Intermédiaire',
      'AVANCE': 'Avancé',
      'EXPERT': 'Expert'
    };
    return mapping[niv.toUpperCase()] || niv;
  }

  unifiedFeedbacks: any[] = [];

  private loadData(): void {
    this.loading         = true;
    this.checkingTermine = true;

    if (this.parcoursId) {
      // Pour un parcours, on récupère les feedbacks des niveaux ET le macro-feedback
      import('rxjs').then(({ forkJoin }) => {
        forkJoin({
          levels: this.feedbackService.getByParcours(this.parcoursId!),
          macros: this.feedbackService.getMacrosByParcours(this.parcoursId!)
        }).subscribe({
          next: (res) => {
            const levelFeedbacks = res.levels.map((f: any) => ({
              ...f,
              type: 'LEVEL',
              displayLevel: this.formatNiveauLabel(f.formation?.niveau)
            }));
            const macroFeedbacks = res.macros.map((m: any) => ({
              ...m,
              type: 'MACRO',
              note: m.noteGlobale,
              commentaire: m.commentaireLibre,
              displayLevel: 'Parcours Complet'
            }));

            this.unifiedFeedbacks = [...levelFeedbacks, ...macroFeedbacks].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            this.feedbacks = this.unifiedFeedbacks; // Fallback pour la compatibilité template
            
            // Sur un parcours, on ne met en "Mon avis" (avec Edit/Delete) que le feedback MACRO
            // Les feedbacks de niveaux restent dans la liste normale
            this.myFeedback = this.candidatId
              ? this.unifiedFeedbacks.find((f: any) => 
                  Number(f.candidat?.id) === Number(this.candidatId) && f.type === 'MACRO'
                ) || null
              : null;
            
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      });
    } else {
      // Pour une formation simple
      this.feedbackService.getByFormation(this.formationId).subscribe({
        next: (data: any) => {
          this.feedbacks = data.map((f: any) => ({ ...f, type: 'LEVEL' }));
          this.unifiedFeedbacks = this.feedbacks;
          this.myFeedback = this.candidatId
            ? data.find((f: any) => Number(f.candidat?.id) === Number(this.candidatId)) || null
            : null;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    }

    // 2. Vérifier si terminé pour autoriser le feedback
    if (this.candidatId) {
      if (this.parcoursId) {
        this.parcoursService.getInscription(this.candidatId, this.parcoursId).subscribe({
          next: (insc) => {
            this.aTermine = insc.statut === 'TERMINE';
            this.checkingTermine = false;
          },
          error: (err) => { 
            if (err.status === 500) {
              console.warn('Fallback Feedback: Recherche via la liste suite à erreur 500...');
              this.parcoursService.getInscriptionsCandidatParcours(this.candidatId!).subscribe({
                next: (list) => {
                  const found = list.find(i => i.parcours.id === this.parcoursId);
                  this.aTermine = found?.statut === 'TERMINE';
                  this.checkingTermine = false;
                },
                error: () => { this.checkingTermine = false; }
              });
            } else {
              this.checkingTermine = false; 
            }
          }
        });
      } else {
        this.formationService.getMesInscriptions(this.candidatId).subscribe({
          next: (inscriptions: Inscription[]) => {
            const monInscription = inscriptions.find(
              i => Number(i.formation?.id) === Number(this.formationId)
            );
            if (monInscription) {
              const statut = (monInscription.statut || '').trim().toLowerCase();
              const progression = monInscription.progression || 0;
              this.aTermine = ['terminé', 'termine', 'terminée', 'completed'].includes(statut) || progression >= 100;
            } else {
              this.aTermine = false;
            }
            this.checkingTermine = false;
          },
          error: () => { this.checkingTermine = false; }
        });
      }
    } else {
      this.checkingTermine = false;
    }
  }

  private loadFeedbacksPublics(): void {
    this.loading = true;
    this.feedbackService.getByFormation(this.formationId).subscribe({
      next: (data: any) => { this.feedbacks = data; this.loading = false; },
      error: ()     => { this.loading = false; }
    });
  }

  setNote(note: number): void {
    this.form.patchValue({ note });
    this.form.get('note')?.markAsTouched();
    // ✅ FIX : marquer dirty + effacer errorMsg pour que l'erreur disparaisse
    this.form.get('note')?.markAsDirty();
    this.form.get('note')?.updateValueAndValidity();
    this.serverErrors['note'] = '';
    this.errorMsg = '';
  }

  hoverStar(star: number): void { this.hoveredStar = star; }
  leaveStar(): void             { this.hoveredStar = 0; }

  getStarClass(star: number): string {
    const active = this.hoveredStar > 0 ? this.hoveredStar : this.form.value.note;
    return star <= active ? 'star active' : 'star';
  }

  getDisplayStarClass(note: number, star: number): string {
    return star <= note ? 'star active' : 'star';
  }

  openCreate(): void {
    this.editing      = false;
    this.showForm     = true;
    this.errorMsg     = '';
    this.serverErrors = {};
    this.form.reset({ note: 0, commentaire: '' });
  }

  openEdit(): void {
    if (!this.myFeedback) return;
    this.editing      = true;
    this.showForm     = true;
    this.errorMsg     = '';
    this.serverErrors = {};
    this.form.patchValue({
      note:        this.myFeedback.note,
      commentaire: this.myFeedback.commentaire
    });
  }

  cancelForm(): void {
    this.showForm     = false;
    this.errorMsg     = '';
    this.serverErrors = {};
    this.form.reset();
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.errorMsg     = '';
    this.serverErrors = {};

    if (!this.form.value.note || this.form.value.note < 1) {
      this.errorMsg = 'Veuillez sélectionner une note.';
      return;
    }

    if (this.form.invalid) {
      this.errorMsg = 'Veuillez corriger les erreurs du formulaire.';
      return;
    }

    this.saving = true;

    if (this.editing && this.myFeedback) {
      this.feedbackService.update(this.myFeedback.id, this.form.value).subscribe({
        next: () => {
          this.saving     = false;
          this.showForm   = false;
          this.successMsg = 'Feedback modifié avec succès !';
          this.loadData();
          setTimeout(() => this.successMsg = '', 3000);
        },
        error: (err: any) => { this.saving = false; this.handleBackendError(err); }
      });
    } else {
      const payload: FeedbackCreatePayload = {
        note:        this.form.value.note,
        commentaire: this.form.value.commentaire.trim(),
        candidat:    { id: this.candidatId! }
      };
      
      if (this.parcoursId) {
        payload.parcours = { id: this.parcoursId };
      } else {
        payload.formation = { id: this.formationId };
      }

      this.feedbackService.create(payload).subscribe({
        next: () => {
          this.saving     = false;
          this.showForm   = false;
          this.successMsg = 'Merci pour votre feedback !';
          this.loadData();
          setTimeout(() => this.successMsg = '', 3000);
        },
        error: (err: any) => { this.saving = false; this.handleBackendError(err); }
      });
    }
  }

  private handleBackendError(err: any): void {
    if (err.status === 400 && err.error?.errors) {
      this.serverErrors = err.error.errors;
      this.errorMsg = 'Veuillez corriger les erreurs ci-dessous.';
    } else if (err.status === 403) {
      this.errorMsg = 'Vous devez avoir terminé la formation pour laisser un feedback.';
    } else {
      this.errorMsg = err?.error?.message
        || 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  delete(): void {
    if (!this.myFeedback || !confirm('Supprimer votre feedback ?')) return;
    this.deletingId = this.myFeedback.id;
    this.feedbackService.delete(this.myFeedback.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.myFeedback = null;
        this.successMsg = 'Feedback supprimé.';
        this.loadData();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: () => { this.deletingId = null; }
    });
  }

  get noteLabel(): string {
    const labels: Record<number, string> = {
      1: 'Très mauvais', 2: 'Mauvais',
      3: 'Correct',      4: 'Bien',
      5: 'Excellent'
    };
    return labels[this.form.value.note] || 'Sélectionnez une note';
  }

  get averageNote(): number {
    if (!this.feedbacks.length) return 0;
    return Math.round(
      this.feedbacks.reduce((s, f) => s + f.note, 0)
      / this.feedbacks.length * 10
    ) / 10;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  get isCandidat(): boolean {
    const role = (localStorage.getItem('userRole') || '')
      .toUpperCase().replace('ROLE_', '');
    return role === 'CANDIDAT';
  }

  get peutDonnerFeedback(): boolean {
    return this.isCandidat && this.aTermine && !this.myFeedback;
  }
}