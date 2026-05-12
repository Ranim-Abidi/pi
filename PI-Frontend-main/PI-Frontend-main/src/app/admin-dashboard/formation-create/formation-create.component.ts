import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder, Validators, AbstractControl
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import {
  Subject, debounceTime, distinctUntilChanged, switchMap
} from 'rxjs';
import {
  FormationService, FormationCreatePayload
} from '../../formations/services/formation.service';
import { FormationSuggestion }
  from '../../formations/models/formation.model';

@Component({
  selector:    'app-formation-create',
  standalone:  false,
  templateUrl: './formation-create.component.html',
  styleUrls:   ['./formation-create.component.scss']
})
export class FormationCreateComponent implements OnInit {

  private fb               = inject(FormBuilder);
  private formationService = inject(FormationService);
  private router           = inject(Router);
  private http             = inject(HttpClient);

  saving             = false;
  loading            = false;
  suggestionSelected = false;
  suggestions: FormationSuggestion[] = [];

  serverErrors: Record<string, string> = {};
  serverErrorMessage = '';

  private titreSubject = new Subject<string>();

  // ── Validateur custom ─────────────────────────────────────────
  // ✅ Contenu requis SEULEMENT si statut = "Disponible"
  static atLeastOneContentValidator(
      group: AbstractControl
  ): Record<string, boolean> | null {
    const statut   = group.get('statut')?.value;
    const playlist = group.get('playlistId')?.value?.trim();
    const youtube  = group.get('youtubeId')?.value?.trim();
    const lien     = group.get('lienExterne')?.value?.trim();

    // Statut "Bientôt" → aucun contenu requis
    if (statut === 'Bientôt') return null;

    // Statut "Disponible" → au moins un contenu
    if (!playlist && !youtube && !lien) {
      return { noContent: true };
    }
    return null;
  }

  form = this.fb.nonNullable.group({
    titre: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(150)
    ]],
    categorie: ['', [Validators.required]],
    plateforme: ['YouTube', [Validators.required]],
    statut:    ['Disponible', [
      Validators.required,
      Validators.pattern('(Disponible|Archivée|Bientôt)')
    ]],
    duree: ['', [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(50)
    ]],
    niveau: ['Débutant', [
      Validators.required,
      Validators.pattern('(Débutant|Intermédiaire|Avancé|Expert)')
    ]],
    lienExterne: ['', [
      Validators.maxLength(500),
      Validators.pattern(
        /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-./?%&=]*)?$|^$/
      )
    ]],
    playlistId:    ['', [Validators.maxLength(100)]],
    youtubeId:     ['', [Validators.maxLength(100)]],
    hasEditor:     [false],
    stackBlitzUrl: ['', [Validators.maxLength(500)]],
    writtenUrl:    ['', [Validators.maxLength(500)]]
  }, {
    validators: FormationCreateComponent.atLeastOneContentValidator
  });

  readonly stackBlitzTemplates = [
    { label: '-- Aucun --',   value: '' },
    { label: 'React',
      value: 'https://stackblitz.com/fork/react?embed=1&hideNavigation=1&theme=dark&file=src/App.jsx' },
    { label: 'Angular',
      value: 'https://stackblitz.com/fork/angular?embed=1&hideNavigation=1&theme=dark&file=src/app/app.component.ts' },
    { label: 'JavaScript',
      value: 'https://stackblitz.com/fork/javascript?embed=1&hideNavigation=1&theme=dark&file=index.js' },
    { label: 'HTML / CSS',
      value: 'https://stackblitz.com/fork/web?embed=1&hideNavigation=1&theme=dark&file=index.html' },
    { label: 'Node.js',
      value: 'https://stackblitz.com/fork/node?embed=1&hideNavigation=1&theme=dark&file=index.js' },
    { label: 'Python',
      value: 'https://stackblitz.com/fork/python?embed=1&hideNavigation=1&theme=dark&file=main.py' },
    { label: 'Vue.js',
      value: 'https://stackblitz.com/fork/vue?embed=1&hideNavigation=1&theme=dark&file=src/App.vue' },
  ];

  constructor() {
    this.titreSubject.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      switchMap(titre => {
        this.loading     = true;
        this.suggestions = [];
        const niveau     = this.form.get('niveau')?.value || '';
        return this.http.get<FormationSuggestion[]>(
          `${environment.apiUrl}/suggestions/formations`
          + `?titre=${encodeURIComponent(titre)}&niveau=${encodeURIComponent(niveau)}`
        );
      })
    ).subscribe({
      next:  (data) => { this.suggestions = data; this.loading = false; },
      error: ()     => { this.suggestions = [];   this.loading = false; }
    });
  }

  ngOnInit(): void {
    // ✅ Re-déclencher la recherche si le niveau change et qu'un titre est déjà saisi
    this.form.get('niveau')?.valueChanges.subscribe(() => {
      const titre = this.form.get('titre')?.value;
      if (titre && titre.length >= 3) {
        this.titreSubject.next(titre);
      }
    });

    // ✅ Re-déclencher la validation quand le statut change
    this.form.get('statut')?.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity();
      // Effacer l'erreur serveur globale si elle concernait le contenu
      if (this.serverErrorMessage.includes('contenu')) {
        this.serverErrorMessage = '';
      }
    });
  }

  // ── Helpers erreurs ────────────────────────────────────────────
  get f() { return this.form.controls; }

  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  getError(field: string): string {
    if (this.serverErrors[field]) return this.serverErrors[field];
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    const e = ctrl.errors;
    if (e['required'])  return 'Ce champ est obligatoire.';
    if (e['minlength']) return `Minimum ${e['minlength'].requiredLength} caractères.`;
    if (e['maxlength']) return `Maximum ${e['maxlength'].requiredLength} caractères.`;
    if (e['pattern'])   return 'Valeur invalide.';
    return 'Valeur invalide.';
  }

  // ── Suggestions ────────────────────────────────────────────────
  onTitreChange(value: string): void {
    this.suggestionSelected = false;
    this.serverErrors       = {};
    if (value.length < 3) {
      this.suggestions = [];
      this.loading     = false;
      return;
    }
    this.titreSubject.next(value);
  }

  selectSuggestion(s: FormationSuggestion): void {
    this.form.patchValue({
      titre:      s.titre,
      playlistId: s.playlistId,
      youtubeId:  '',
      categorie:  s.categorie,
      niveau:     s.niveau,
      statut:     'Disponible',
      plateforme: 'YouTube',
      hasEditor:  ['Frontend','Backend','Data','IA','Développement']
                    .includes(s.categorie),
      duree:      this.getDureeEstimee(s)
    });
    this.suggestions        = [];
    this.suggestionSelected = true;
  }

  getDureeEstimee(s: FormationSuggestion): string {
    if (s.dureeTotale) return s.dureeTotale;
    if (s.nbVideos > 0) {
      const h = Math.round(s.nbVideos * 10 / 60 * 10) / 10;
      return `${h}h`;
    }
    return '';
  }

  getDureeBadge(s: FormationSuggestion): string {
    return this.getDureeEstimee(s) || 'Durée inconnue';
  }

  clearSuggestion(): void {
    this.suggestionSelected = false;
    this.form.patchValue({
      playlistId: '', youtubeId: '', categorie: '', niveau: ''
    });
  }

  // ── Soumission ──────────────────────────────────────────────────
  private normalizePayload(raw: any): FormationCreatePayload {
    const payload = { ...raw } as any;

    const toUndefined = (value: string | undefined): string | undefined =>
      value?.trim() ? value.trim() : undefined;

    payload.lienExterne = toUndefined(payload.lienExterne);
    payload.playlistId  = toUndefined(payload.playlistId);
    payload.youtubeId   = toUndefined(payload.youtubeId);
    payload.stackBlitzUrl = toUndefined(payload.stackBlitzUrl);
    payload.writtenUrl  = toUndefined(payload.writtenUrl);

    // Pour les formations "Bientôt", ne pas envoyer de contenu vide au backend.
    if (payload.statut === 'Bientôt') {
      payload.lienExterne = undefined;
      payload.playlistId  = undefined;
      payload.youtubeId   = undefined;
    }

    return payload;
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.serverErrors       = {};
    this.serverErrorMessage = '';

    // ✅ Si statut "Bientôt" → ignorer l'erreur noContent
    const statut = this.form.get('statut')?.value;
    const formErrors = this.form.errors;

    if (this.form.invalid) {
      // Vérifier si la seule erreur est noContent avec statut Bientôt
      const onlyNoContent = formErrors != null
        && Object.keys(formErrors).length === 1
        && formErrors['noContent'];

      if (onlyNoContent && statut === 'Bientôt') {
        // Pas d'erreur bloquante — on peut continuer
      } else {
        this.serverErrorMessage = "Le formulaire contient des erreurs ou des champs obligatoires manquants. Veuillez vérifier les champs en rouge.";
        return;
      }
    }

    const payload = this.normalizePayload(this.form.getRawValue());

    this.saving = true;
    this.formationService.createFormation(payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/admin-dashboard/formations']);
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 400 && err.error?.errors) {
          this.serverErrors       = err.error.errors;
          this.serverErrorMessage = 'Veuillez corriger les erreurs ci-dessous.';
        } else {
          this.serverErrorMessage = err.error?.message
            || 'Une erreur est survenue. Veuillez réessayer.';
        }
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/formations']);
  }

  getSelectedTemplateLabel(): string {
    const url   = this.form.get('stackBlitzUrl')?.value;
    const found = this.stackBlitzTemplates.find(t => t.value === url);
    return found ? found.label : 'Code';
  }
}