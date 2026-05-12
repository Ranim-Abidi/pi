// evenement-chats.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EvenementService } from '../../services/evenement-service';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-evenement-chats',
    standalone: false,
    templateUrl: './evenement-chat.component.html',
    styleUrls: ['./evenement-chat.component.scss']
})
export class EvenementChatComponent implements OnInit {

    evenements: any[] = [];
    isLoading = true;
    organisateurId!: number;

    constructor(
        private evenementService: EvenementService,
        private router: Router
    ) {}

    ngOnInit() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.organisateurId = decoded?.id;
        }

        // Charge uniquement les événements de l'organisateur
        this.evenementService.getByOrganisateur(this.organisateurId).subscribe({
            next: (data) => {
                this.evenements = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.isLoading = false;
            }
        });
    }

    ouvrirChat(evenementId: number) {
        this.router.navigate(['/evenement-dashboard/chat', evenementId]);
    }

    getChatStatutLabel(chatOuvert: boolean): string {
        return chatOuvert ? 'Ouvert' : 'Fermé';
    }

    getChatStatutClass(chatOuvert: boolean): string {
        return chatOuvert ? 'statut-ouvert' : 'statut-ferme';
    }
}