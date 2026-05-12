import { Component, OnInit } from '@angular/core';
import { ParticipationService } from '../../../services/participation-service';
import { FeedbackEventService } from '../../../services/feedbackevent-service';
import { EvenementService } from '../../../services/evenement-service';
import { ApiService } from '../../../api.service';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';

@Component({
    selector: 'app-mes-participations',
    standalone: false,
    templateUrl: './mes-participations.component.html',
    styleUrls: ['./mes-participations.component.scss']
})
export class MesParticipationsComponent implements OnInit {

    participations: any[] = [];
    isLoading = true;
    candidatId!: number;

    // ← feedback
    feedbackOuvert: number | null = null; // ID participation dont le form est ouvert
    feedbackNote = 5;
    feedbackCommentaire = '';
    feedbackEnvoi = false;
    feedbackSucces: number | null = null; // ID participation avec feedback envoyé
    feedbackErreur = '';

    constructor(
        private participationService: ParticipationService,
        private feedbackService: FeedbackEventService,
        private evenementService: EvenementService,
        private apiService: ApiService,
        private router: Router
    ) {}

    ngOnInit() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.candidatId = decoded?.id;
        }
        this.loadParticipations();
    }

   loadParticipations() {
    this.participationService.getByCandidat(this.candidatId).subscribe({
        next: (data) => {
            // ← filtre uniquement les participations confirmées
            this.participations = data.filter(
                (p: any) => p.statut === 'CONFIRME'
            );
            this.isLoading = false;
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.isLoading = false;
        }
    });
}

    // Ouvre/ferme le formulaire feedback pour une participation
    toggleFeedback(participationId: number): void {
        if (this.feedbackOuvert === participationId) {
            this.feedbackOuvert = null;
        } else {
            this.feedbackOuvert = participationId;
            this.feedbackNote = 5;
            this.feedbackCommentaire = '';
            this.feedbackErreur = '';
        }
    }

    // Soumet le feedback
    soumettreFeedback(participationId: number): void {
        if (!this.feedbackCommentaire.trim()) {
            this.feedbackErreur = 'Le commentaire est requis';
            return;
        }

        this.feedbackEnvoi = true;
        this.feedbackErreur = '';

        this.feedbackService.create({
            commentaire: this.feedbackCommentaire,
            note: this.feedbackNote,
            participationId: participationId
        }).subscribe({
            next: () => {
                this.feedbackEnvoi = false;
                this.feedbackOuvert = null;
                this.feedbackSucces = participationId;
                // Cache le message de succès après 3s
                setTimeout(() => this.feedbackSucces = null, 3000);
            },
            error: (err) => {
                this.feedbackEnvoi = false;
                this.feedbackErreur = err?.error?.message || 'Erreur lors de l\'envoi';
            }
        });
    }

    setNote(note: number): void {
        this.feedbackNote = note;
    }

    getStatutClass(statut: string): string {
        switch (statut) {
            case 'CONFIRME': return 'statut-confirme';
            case 'EN_ATTENTE': return 'statut-attente';
            case 'REFUSE': return 'statut-refuse';
            case 'ANNULE': return 'statut-annule';
            default: return '';
        }
    }
    // Vérifie si la date de l'événement est passée
    evenementPasse(participation: any): boolean {
    if (!participation.dateEvenement) return true; // si pas de date, on laisse passer
    const dateEvenement = new Date(participation.dateEvenement);
    return dateEvenement < new Date();
}

ouvrirChat(evenementId: number) {
    this.router.navigate(['/candidates-dashboard/chat', evenementId]);
}

    formatDate(value: any): string {
        if (!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('fr-FR');
    }

// Récupère l'id du candidat connecté depuis le token JWT décodé
// APRÈS (adapté à ton projet)
exporterCalendrier(): void {
  // L'id du candidat est stocké directement dans le localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const candidatId = user.id;
  this.evenementService.exporterMesEvenementsConfirmes(candidatId);
}

ouvrirGoogleCalendar(): void {
  const email = localStorage.getItem('userEmail');

  if (!email) {
    alert('Utilisateur non connecté.');
    return;
  }

  // Étape 1 : récupère le candidat par email pour obtenir son id
  this.apiService.getCandidateByEmail(email).subscribe({
    next: (candidat) => {
      const candidatId = candidat.id;
      console.log('candidatId trouvé :', candidatId);

      // Étape 2 : appelle le service avec l'id trouvé
      this.evenementService.getMesParticipationsConfirmees(candidatId).subscribe({
        next: (participations) => {
          if (participations.length === 0) {
            alert('Aucun événement confirmé à exporter.');
            return;
          }

          // Étape 3 : ouvre un onglet Google Calendar par événement confirmé
          participations.forEach((p: any) => {
            const ev = p.evenement;
            const debut = this.formatGoogleDate(ev.dateHeure);
            const fin = this.formatGoogleDate(
              new Date(new Date(ev.dateHeure).getTime() + 2 * 60 * 60 * 1000)
            );

            const params = new URLSearchParams({
              action: 'TEMPLATE',
              text: ev.titre,
              dates: `${debut}/${fin}`,
              location: ev.lieu || '',
              details: ev.type || ''
            });

            window.open(
              `https://calendar.google.com/calendar/render?${params.toString()}`,
              '_blank'
            );
          });
        },
        error: (err) => console.error('Erreur participations :', err)
      });
    },
    error: (err) => console.error('Erreur récupération candidat :', err)
  });
}

private formatGoogleDate(date: any): string {
  const d = new Date(date);
  return d.toISOString().replace(/-|:|\.\d{3}Z/g, '').slice(0, 15);
}


get confirmeesAvecCertificat(): any[] {
    return this.participations.filter(p =>
      p.statut === 'CONFIRME' && p.certificateGenerated
    );
  }

  get confirmesSansCertificat(): any[] {
    return this.participations.filter(p =>
      p.statut === 'CONFIRME' && !p.certificateGenerated
    );
  }

  get autresParticipations(): any[] {
    return this.participations.filter(p => p.statut !== 'CONFIRME');
  }

  telecharger(url: string): void {
    this.participationService.ouvrirCertificat(url);
  }
}
