import { Component, OnInit } from '@angular/core';
import { ParticipationService } from '../../services/participation-service';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-evenement-demandes',
    standalone: false,
    templateUrl: './evenement-demandes.component.html',
    styleUrls: ['./evenement-demandes.component.scss']
})
export class EvenementDemandesComponent implements OnInit {

    demandes: any[] = [];
    isLoading = true;
    organisateurId!: number;

    constructor(private participationService: ParticipationService) {}

    ngOnInit() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.organisateurId = decoded?.id;
        }
        this.loadDemandes();
    }

    loadDemandes() {
        this.participationService.getDemandesByOrganisateur(this.organisateurId)
            .subscribe({
                next: (data) => {
                    this.demandes = data;
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erreur:', err);
                    this.isLoading = false;
                }
            });
    }

    //  Accepter une demande
    accepter(id: number) {
        this.participationService.accepter(id).subscribe({
            next: () => {
                
                this.loadDemandes(); // rafraîchit la liste
            },
            error: (err) => console.error('Erreur:', err)
        });
    }

    //  Refuser une demande
    refuser(id: number) {
        this.participationService.refuser(id).subscribe({
            next: () => {
                
                this.loadDemandes();
            },
            error: (err) => console.error('Erreur:', err)
        });
    }

    formatDate(value: any): string {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('fr-FR');
}
}