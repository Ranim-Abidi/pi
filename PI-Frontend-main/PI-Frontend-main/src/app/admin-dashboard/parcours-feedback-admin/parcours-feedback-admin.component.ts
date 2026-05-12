import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FeedbackService } from '../../formations/services/feedback.service';
import { ParcoursService } from '../../formations/services/parcours.service';
import { ParcoursFormation } from '../../formations/models/parcours.model';

@Component({
  selector: 'app-parcours-feedback-admin',
  standalone: false,
  templateUrl: './parcours-feedback-admin.component.html',
  styleUrls: ['./parcours-feedback-admin.component.scss']
})
export class ParcoursFeedbackAdminComponent implements OnInit {

  parcours: ParcoursFormation | null = null;
  macroFeedbacks: any[] = [];
  loading = false;
  parcoursId!: number;
  stars = [1, 2, 3, 4, 5];

  constructor(
    private route: ActivatedRoute,
    private feedbackService: FeedbackService,
    private parcoursService: ParcoursService
  ) {}

  ngOnInit(): void {
    this.parcoursId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;

    this.parcoursService.getById(this.parcoursId).subscribe({
      next: (p) => { this.parcours = p; }
    });

    this.feedbackService.getMacrosByParcours(this.parcoursId).subscribe({
      next: (data) => {
        this.macroFeedbacks = data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        console.error("Erreur chargement macro feedbacks:", err);
        this.loading = false;
      }
    });
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getNoteClass(note: number): string {
    if (note >= 4) return 'tag-green';
    if (note === 3) return 'tag-amber';
    return 'tag-red';
  }
}
