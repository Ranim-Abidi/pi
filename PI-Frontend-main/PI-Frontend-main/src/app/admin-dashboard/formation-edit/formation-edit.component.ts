import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { FormationService } from '../../formations/services/formation.service';
import { FormationSuggestion } from '../../formations/models/formation.model';

@Component({
  selector: 'app-formation-edit',
  standalone: false,
  templateUrl: './formation-edit.component.html',
  styleUrls: ['./formation-edit.component.scss']
})
export class FormationEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private formationService = inject(FormationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  saving = false;
  loading = false;
  formationId!: number;
  suggestionSelected = false;
  suggestions: FormationSuggestion[] = [];
  private titreSubject = new Subject<string>();

  constructor() {
    this.titreSubject.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      switchMap(titre => {
        this.loading = true;
        this.suggestions = [];
        const niveau = this.form.get('niveau')?.value || '';
        return this.http.get<FormationSuggestion[]>(
          `${environment.apiUrl}/suggestions/formations?titre=${encodeURIComponent(titre)}&niveau=${encodeURIComponent(niveau)}`
        );
      })
    ).subscribe({
      next: (data) => { this.suggestions = data; this.loading = false; },
      error: ()    => { this.suggestions = [];   this.loading = false; }
    });
  }

form = this.fb.nonNullable.group({
  titre:         ['', [Validators.required, Validators.minLength(3)]],
  categorie:     ['', Validators.required],
  plateforme:    ['YouTube', Validators.required],
  statut:        ['Disponible', Validators.required],
  duree:         ['', Validators.required],
  niveau:        ['Débutant', Validators.required],
  lienExterne:   [''],
  playlistId:    [''],  
  youtubeId:     [''],   
  hasEditor:     [false],
  stackBlitzUrl: [''],
  writtenUrl:    ['']
});

  readonly stackBlitzTemplates = [
    { label: '-- Aucun --',    value: '' },
    { label: 'React',          value: 'https://stackblitz.com/fork/react?embed=1&hideNavigation=1&theme=dark&file=src/App.jsx' },
    { label: 'Angular',        value: 'https://stackblitz.com/fork/angular?embed=1&hideNavigation=1&theme=dark&file=src/app/app.component.ts' },
    { label: 'JavaScript',     value: 'https://stackblitz.com/fork/javascript?embed=1&hideNavigation=1&theme=dark&file=index.js' },
    { label: 'HTML / CSS',     value: 'https://stackblitz.com/fork/web?embed=1&hideNavigation=1&theme=dark&file=index.html' },
    { label: 'Node.js',        value: 'https://stackblitz.com/fork/node?embed=1&hideNavigation=1&theme=dark&file=index.js' },
    { label: 'Python',         value: 'https://stackblitz.com/fork/python?embed=1&hideNavigation=1&theme=dark&file=main.py' },
    { label: 'Vue.js',         value: 'https://stackblitz.com/fork/vue?embed=1&hideNavigation=1&theme=dark&file=src/App.vue' },
  ];


getSelectedTemplateLabel(): string {
  const url = this.form.get('stackBlitzUrl')?.value;
  const found = this.stackBlitzTemplates.find(t => t.value === url);
  return found ? found.label : 'Code';
}

getSelectedWrittenLabel(): string {
  const url = this.form.get('writtenUrl')?.value;
  return url ? 'Doc Web Intelligente' : 'Écrite';
}

  getDureeEstimee(s: FormationSuggestion): string {
    if (s.dureeTotale) return s.dureeTotale;
    if (s.nbVideos > 0) {
      const heures = Math.round(s.nbVideos * 10 / 60 * 10) / 10;
      return `${heures}h`;
    }
    return '';
  }

  getDureeBadge(s: FormationSuggestion): string {
    const duree = this.getDureeEstimee(s);
    return duree || 'Durée inconnue';
  }

  private readonly categoriesAvecEditeur = ['Frontend', 'Backend', 'Data', 'IA', 'Développement'];

  ngOnInit(): void {
    this.formationId = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.formationService.getFormationById(this.formationId).subscribe({
      next: (f) => {
        this.form.patchValue(f);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;

    const rawValue = this.form.getRawValue();
    const payload: any = {
      titre:         rawValue.titre,
      categorie:     rawValue.categorie,
      plateforme:    rawValue.plateforme,
      statut:        rawValue.statut,
      duree:         rawValue.duree,
      niveau:        rawValue.niveau,
      lienExterne:   rawValue.lienExterne,
      playlistId:    rawValue.playlistId,
      youtubeId:     rawValue.youtubeId,
      hasEditor:     rawValue.hasEditor,
      stackBlitzUrl: rawValue.stackBlitzUrl,
      writtenUrl:    rawValue.writtenUrl
    };

    console.log('📤 Mise à jour formation ID:', this.formationId, 'Payload:', payload);

    this.formationService.updateFormation(this.formationId, payload).subscribe({
      next: () => {
        this.saving = false;
        console.log('✅ Mise à jour réussie');
        this.router.navigate(['/admin-dashboard/formations']);
      },
      error: (err) => {
        console.error('❌ Erreur mise à jour:', err);
        this.saving = false;
      }
    });
  }

  onTitreChange(value: string): void {
    this.suggestionSelected = false;
    if (value.length < 3) {
      this.suggestions = [];
      this.loading = false;
      return;
    }
    this.titreSubject.next(value);
  }

  selectSuggestion(s: FormationSuggestion): void {
    this.form.patchValue({
      titre:        s.titre,
      playlistId:   s.playlistId,
      youtubeId:    '',
      writtenUrl:   s.writtenUrl,
      categorie:    s.categorie,
      niveau:       s.niveau,
      statut:       'Disponible',
      plateforme:   'YouTube',
      hasEditor:    this.categoriesAvecEditeur.includes(s.categorie),
      duree:        this.getDureeEstimee(s)
    });
    this.suggestions = [];
    this.suggestionSelected = true;
  }

  clearSuggestion(): void {
    this.suggestionSelected = false;
    this.form.patchValue({ playlistId: '', youtubeId: '', writtenUrl: '', categorie: '', niveau: '' });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/formations']);
  }
}