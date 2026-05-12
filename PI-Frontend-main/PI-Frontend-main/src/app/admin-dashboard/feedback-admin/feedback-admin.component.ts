import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Feedback, FeedbackStats } from '../../formations/models/feedback.model';
import { FeedbackService } from '../../formations/services/feedback.service';
import { FormationService } from '../../formations/services/formation.service';
import { Formation } from '../../formations/models/formation.model';

@Component({
  selector: 'app-feedback-admin',
  standalone: false,
  templateUrl: './feedback-admin.component.html',
  styleUrls: ['./feedback-admin.component.scss']
})
export class FeedbackAdminComponent implements OnInit {

  formation: Formation | null = null;
  feedbacks: Feedback[] = [];
  stats: FeedbackStats = { moyenne: 0, total: 0 };
  loading    = false;
  formationId!: number;
  stars      = [1, 2, 3, 4, 5];
  deletingId: number | null = null;
  successMsg = '';
  errorMsg   = '';

  get distribution(): number[] {
    const dist = [0, 0, 0, 0, 0];
    this.feedbacks.forEach(f => { if (f.note >= 1 && f.note <= 5) dist[f.note - 1]++; });
    return dist;
  }

  get distributionPercent(): number[] {
    const total = this.feedbacks.length;
    if (!total) return [0, 0, 0, 0, 0];
    return this.distribution.map(d => Math.round((d / total) * 100));
  }

  constructor(
    private route: ActivatedRoute,
    private feedbackService: FeedbackService,
    private formationService: FormationService
  ) {}

  ngOnInit(): void {
    this.formationId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;

    this.formationService.getFormationById(this.formationId).subscribe({
      next: (f) => { this.formation = f; }
    });

    this.feedbackService.getByFormation(this.formationId).subscribe({
      next: (data: any) => {
        this.feedbacks = data.sort((a: any, b: any) =>
          new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
        );
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    this.feedbackService.getStats(this.formationId).subscribe({
      next: (s) => { this.stats = s; }
    });
  }

  getStarClass(note: number, star: number): string {
    return star <= note ? 'star filled' : 'star';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getNoteLabel(note: number): string {
    const labels: Record<number, string> = {
      1: 'Très mauvais', 2: 'Mauvais', 3: 'Correct', 4: 'Bien', 5: 'Excellent'
    };
    return labels[note] || '';
  }

  getNoteClass(note: number): string {
    if (note >= 4) return 'tag-green';
    if (note === 3) return 'tag-amber';
    return 'tag-red';
  }

  deleteFeedback(feedback: Feedback): void {
    const nom = feedback.candidat?.nom || feedback.candidat?.email || 'ce candidat';
    if (!confirm(`Supprimer le feedback de ${nom} ? Cette action est irréversible.`)) return;

    this.deletingId = feedback.id;
    this.errorMsg   = '';

    this.feedbackService.delete(feedback.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.successMsg = `Feedback de ${nom} supprimé avec succès.`;
        this.feedbacks  = this.feedbacks.filter(f => f.id !== feedback.id);
        this.loadStats();
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: () => {
        this.deletingId = null;
        this.errorMsg   = 'Erreur lors de la suppression. Veuillez réessayer.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  private loadStats(): void {
    this.feedbackService.getStats(this.formationId).subscribe({
      next: (s) => { this.stats = s; }
    });
  }
}