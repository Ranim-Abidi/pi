import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FreelanceService, Mission } from './services/freelance.service';

@Component({
  selector: 'app-freelance-project-details',
  standalone: false,
  templateUrl: './freelance-project-details.component.html'
})
export class FreelanceProjectDetailsComponent implements OnInit {
  mission?: Mission;
  loading = true;
  postule = false;
  erreur = '';
  proposalForm = {
    coverLetter: '',
    bidAmount: null as number | null,
    estimatedDays: null as number | null
  };

  constructor(
    private route: ActivatedRoute,
    private freelanceService: FreelanceService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.freelanceService.getMissionById(id).subscribe({
      next: (m) => { this.mission = m; this.loading = false; },
      error: () => { this.erreur = 'Mission introuvable.'; this.loading = false; }
    });
  }

  postuler(): void {
    if (!this.mission) return;
    this.freelanceService.postuler(this.mission.id, {
      coverLetter: this.proposalForm.coverLetter?.trim() || undefined,
      bidAmount: this.proposalForm.bidAmount ?? undefined,
      estimatedDays: this.proposalForm.estimatedDays ?? undefined
    }).subscribe({
      next: () => this.postule = true,
      error: () => this.erreur = 'Erreur lors de la candidature.'
    });
  }
}