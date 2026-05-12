import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvenementService } from '../../services/evenement-service';
import { ParticipationService } from '../../services/participation-service';
import { FeedbackEventService } from '../../services/feedbackevent-service';

@Component({
    selector: 'app-evenement-detail',
    standalone: false,
    templateUrl: './evenement-detail.component.html',
    styleUrls: ['./evenement-detail.component.scss']
})
export class EvenementDetailComponent implements OnInit {
    evenement: any = {};
    participations: any[] = [];
    loading = true;
    error = false;
    feedbacks: any[] = [];
    noteMoyenne: number = 0;
    totalFeedbacks: number = 0;

    constructor(
        private service: EvenementService,
        private participationService: ParticipationService,
        private feedbackService: FeedbackEventService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));

        this.service.getById(id).subscribe({
            next: (data) => {
                this.evenement = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.error = true;
                this.loading = false;
            }
        });

        this.participationService.getConfirmeesByEvenement(id).subscribe({
            next: (data) => this.participations = data,
            error: (err) => console.error('Erreur participations:', err)
        });

        this.feedbackService.getByEvenement(id).subscribe({
            next: (data) => {
                this.feedbacks = data;
                this.totalFeedbacks = data.length;
            },
            error: (err) => console.error('Erreur feedbacks:', err)
        });

        this.feedbackService.getNoteMoyenne(id).subscribe({
            next: (data) => this.noteMoyenne = data.moyenne || 0,
            error: (err) => console.error('Erreur moyenne:', err)
        });
    }

    getEtoiles(note: number): number[] {
        return Array(5).fill(0).map((_, i) => i + 1);
    }

    formatDate(value: any): string {
        if (!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        // ← affiche date + heure pour les feedbacks et participations
        return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    retour() {
        this.router.navigate(['/evenement-dashboard/liste']);
    }
}