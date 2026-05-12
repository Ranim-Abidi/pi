import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';   // ← ajouter
import { ChatService } from '../../../services/chat-service';
import Pusher from 'pusher-js';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-chat-evenement',
    standalone: false,
    templateUrl: './evenement-chat.component.html',
    styleUrls: ['./evenement-chat.component.scss']
})
export class ChatEvenementComponent implements OnInit, OnDestroy {

    @Input() evenementId!: number;

    messages: any[] = [];
    nouveauMessage = '';
    candidatId!: number;
    nomCandidat = '';
    chatOuvert = false;
    isLoading = true;
    erreur = '';                                     // ← ajouter pour afficher les erreurs

    private channel: any;
    private pusher: any;

    constructor(
        private chatService: ChatService,
        private route: ActivatedRoute              // ← ajouter
    ) {}

    ngOnInit() {
        // Récupère l'ID depuis l'URL si pas reçu via @Input()
        const idFromRoute = this.route.snapshot.paramMap.get('evenementId');
        if (idFromRoute) {
            this.evenementId = Number(idFromRoute);  // ← priorité à la route
        }

        console.log('evenementId:', this.evenementId); // ← vérifie dans la console

        if (!this.evenementId) {
            this.erreur = 'Événement non trouvé';
            this.isLoading = false;
            return;
        }

        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.candidatId = decoded?.id;
            this.nomCandidat = decoded?.nom || 'Candidat';
        }

        this.chatService.getChatStatut(this.evenementId).subscribe({
            next: (ouvert) => {
                this.chatOuvert = ouvert;
                this.isLoading = false;
                if (ouvert) {
                    this.chargerMessages();
                    this.connecterPusher();
                }
            },
            error: (err) => {
                console.error('Erreur statut chat:', err);
                this.erreur = 'Impossible de joindre le backend. Vérifiez la connectivité réseau et la configuration de l\'API.';
                this.isLoading = false;
            }
        });
    }

    chargerMessages() {
        this.chatService.getMessages(this.evenementId, this.candidatId).subscribe({
            next: (data) => this.messages = data,
            error: (err) => console.error('Erreur messages:', err)
        });
    }

    connecterPusher() {
        try {
            this.pusher = new Pusher('07a41117ca80364c7695', {
                cluster: 'eu'
            });

            this.pusher.connection.bind('connected', () => {
                console.log('Pusher connecté ✅');
            });

            this.pusher.connection.bind('error', (err: any) => {
                console.error('Pusher error:', err);
            });

            this.channel = this.pusher.subscribe(`chat-evenement-${this.evenementId}`);

            this.channel.bind('nouveau-message', (data: any) => {
                this.messages.push(data);
            });

        } catch (err) {
            console.error('Erreur Pusher:', err);
        }
    }

    envoyer() {
        if (!this.nouveauMessage.trim()) return;

        const payload = {
            evenementId: this.evenementId,
            candidatId: this.candidatId,
            contenu: this.nouveauMessage.trim()
        };

        this.chatService.envoyer(payload).subscribe({
            next: () => this.nouveauMessage = '',
            error: (err) => console.error('Erreur envoi:', err)
        });
    }

    formatHeure(value: any): string {
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    ngOnDestroy() {
        if (this.channel) this.channel.unbind_all();
        if (this.pusher) this.pusher.disconnect();
    }
}