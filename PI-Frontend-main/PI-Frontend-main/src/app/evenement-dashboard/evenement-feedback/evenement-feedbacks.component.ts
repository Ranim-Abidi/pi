import { Component, OnInit } from '@angular/core';
import { FeedbackEventService } from '../../services/feedbackevent-service';
import { EvenementService } from '../../services/evenement-service';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-evenement-feedbacks',
    standalone: false,
    templateUrl: './evenement-feedbacks.component.html',
    styleUrls: ['./evenement-feedbacks.component.scss']
})
export class EvenementFeedbacksComponent implements OnInit {

    feedbacks: any[] = [];
    evenements: any[] = [];
    isLoading = true;
    organisateurId!: number;

    // Filtre par événement
    evenementSelectionne: number | null = null;

    // Stats globales
    noteMoyenneGlobale = 0;
    totalFeedbacks = 0;

    constructor(
        private feedbackService: FeedbackEventService,
        private evenementService: EvenementService
    ) {}

    ngOnInit() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.organisateurId = decoded?.id;
        }

        this.chargerEvenements();
    }

    chargerEvenements() {
        this.evenementService.getByOrganisateur(this.organisateurId).subscribe({
            next: (data) => {
                this.evenements = data;
                // Charge tous les feedbacks de tous les événements
                this.chargerTousFeedbacks();
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.isLoading = false;
            }
        });
    }

    chargerTousFeedbacks() {
        if (this.evenements.length === 0) {
            this.isLoading = false;
            return;
        }

        const promises = this.evenements.map(e =>
            this.feedbackService.getByEvenement(e.id).toPromise()
        );

        Promise.all(promises).then(results => {
            // Fusionne tous les feedbacks
            this.feedbacks = results.flat().filter(f => f !== undefined);
            this.calculerStats();
            this.isLoading = false;
        }).catch(err => {
            console.error('Erreur:', err);
            this.isLoading = false;
        });
    }

    calculerStats() {
        this.totalFeedbacks = this.feedbacks.length;
        if (this.totalFeedbacks > 0) {
            const somme = this.feedbacks.reduce(
                (acc: number, f: any) => acc + f.note, 0
            );
            this.noteMoyenneGlobale = Math.round(
                (somme / this.totalFeedbacks) * 10
            ) / 10;
        }
    }

    // Filtre les feedbacks par événement sélectionné
    get feedbacksFiltres(): any[] {
        if (!this.evenementSelectionne) return this.feedbacks;
        return this.feedbacks.filter(
            f => f.participationId && this.evenements.find(
                e => e.id === this.evenementSelectionne
            )
        );
    }

    filtrerParEvenement(evenementId: number | null) {
        this.evenementSelectionne = evenementId;
    }

    getEtoiles(note: number): number[] {
        return Array(5).fill(0).map((_, i) => i + 1);
    }

    getNoteClass(note: number): string {
        if (note >= 4) return 'note-bonne';
        if (note >= 3) return 'note-moyenne';
        return 'note-mauvaise';
    }

    formatDate(value: any): string {
        if (!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('fr-FR');
    }
}