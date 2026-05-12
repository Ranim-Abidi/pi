import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FreelanceService } from './services/freelance.service';

@Component({
  selector: 'app-post-mission',
  standalone: false,
  templateUrl: './post-mission.component.html'
})
export class PostMissionComponent {
  form: FormGroup;
  soumis = false;
  erreur = '';
  aiLoadingDescription = false;
  aiLoadingBudget = false;
  aiBudgetSuggestion = '';

  constructor(
    private fb: FormBuilder,
    private freelanceService: FreelanceService,
    private router: Router
  ) {
    this.form = this.fb.group({
      titre:       ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(20)]],
      budget:      [null, [Validators.required, Validators.min(1)]],
      competences: ['', Validators.required]
    });
  }

  soumettre(): void {
    if (this.form.invalid) return;
    const payload = {
      ...this.form.value,
      competences: this.form.value.competences
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    };
    this.freelanceService.publierMission(payload).subscribe({
      next: () => {
        this.soumis = true;
        setTimeout(() => this.router.navigate(['/freelance/client']), 1800);
      },
      error: () => { this.erreur = 'Erreur lors de la publication.'; }
    });
  }

  genererDescriptionIA(): void {
    const titre = String(this.form.value.titre || '').trim();
    const competences = String(this.form.value.competences || '').trim();
    const description = String(this.form.value.description || '').trim();
    if (!titre && !description && !competences) {
      this.erreur = 'Ajoutez au moins un titre/description/compétences pour utiliser l’IA.';
      return;
    }

    this.erreur = '';
    this.aiLoadingDescription = true;
    const experienceYears = this.inferExperienceYears(titre);
    const timelineDays = this.inferTimelineDays(experienceYears);
    const jobDescription = description || `Mission: ${titre}`;

    this.freelanceService.generateAiProposal({
      job_description: jobDescription,
      skills: competences || 'Web development',
      experience_years: experienceYears,
      timeline_days: timelineDays
    }).subscribe({
      next: (res) => {
        const generated = String(res?.proposal || '').trim();
        if (generated) {
          this.form.patchValue({ description: generated });
        } else {
          this.erreur = 'L’IA n’a pas retourné de description exploitable.';
        }
        this.aiLoadingDescription = false;
      },
      error: () => {
        this.erreur = 'Impossible de générer la description IA (service indisponible).';
        this.aiLoadingDescription = false;
      }
    });
  }

  suggererBudgetIA(): void {
    const competences = String(this.form.value.competences || '').trim();
    const titre = String(this.form.value.titre || '').trim();
    const firstSkill = (competences.split(',').map((s: string) => s.trim()).find((s: string) => !!s) || titre || 'React');
    const experienceYears = this.inferExperienceYears(titre);

    this.erreur = '';
    this.aiLoadingBudget = true;
    this.aiBudgetSuggestion = '';
    this.freelanceService.predictAiPrice({
      skill: firstSkill,
      experience_years: experienceYears,
      rating: 4.5,
      location: 'Remote'
    }).subscribe({
      next: (res) => {
        const mid = Number(res?.mid || 0);
        if (mid > 0) {
          // Keep existing budget in TND; this is just an AI suggestion slot.
          this.form.patchValue({ budget: Math.round(mid) });
        }
        this.aiBudgetSuggestion = `Suggestion IA: ${res.min} - ${res.max} (mid ${res.mid})`;
        this.aiLoadingBudget = false;
      },
      error: () => {
        this.erreur = 'Impossible de suggérer un budget IA (service indisponible).';
        this.aiLoadingBudget = false;
      }
    });
  }

  private inferExperienceYears(titre: string): number {
    const t = (titre || '').toLowerCase();
    if (t.includes('senior')) return 7;
    if (t.includes('junior')) return 2;
    if (t.includes('lead') || t.includes('expert')) return 10;
    return 4;
  }

  private inferTimelineDays(experienceYears: number): number {
    if (experienceYears >= 8) return 10;
    if (experienceYears <= 2) return 21;
    return 14;
  }
}