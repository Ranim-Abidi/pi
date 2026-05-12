import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EvenementService } from '../../services/evenement-service';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-evenement-list',
    standalone: false,
    templateUrl: './evenement-list.component.html',
    styleUrls: ['./evenement-list.component.scss']
})
export class EvenementListComponent implements OnInit {

    evenements: any[] = [];
    evenementsFiltres: any[] = [];
    lieux: string[] = [];
    loading = true;
    error = false;
    organisateurId!: number;

    searchTitre = '';
    searchLieu = '';
    sortByDate = '';
    sortByAjout = '';

    constructor(
        private service: EvenementService,
        private router: Router
    ) {}

    ngOnInit() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.organisateurId = decoded?.id;
        }

        this.service.getByOrganisateur(this.organisateurId).subscribe({
            next: (data) => {
                this.evenements = data;
                this.evenementsFiltres = data;
                this.lieux = [...new Set(data.map((e: any) => e.lieu))];
                this.loading = false;
                console.log('Mes événements:', data);
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.error = true;
                this.loading = false;
            }
        });
    }

    modifier(id: number) {
        this.router.navigate(['/evenement-dashboard/modifier', id]);
    }

    voir(id: number) {
        this.router.navigate(['/evenement-dashboard/detail', id]);
    }

    supprimer(id: number) {
        if (confirm('Voulez-vous supprimer cet événement ?')) {
            this.service.annuler(id).subscribe({
                next: () => {
                    this.evenements = this.evenements.filter(e => e.id !== id);
                    this.evenementsFiltres = this.evenementsFiltres.filter(e => e.id !== id); // ← fix : met à jour aussi la liste filtrée
                },
                error: (err) => console.error('Erreur:', err)
            });
        }
    }

    rechercher() {
        this.evenementsFiltres = this.evenements.filter(e => {
            const matchTitre = !this.searchTitre ||
                e.titre.toLowerCase().includes(this.searchTitre.toLowerCase());
            const matchLieu = !this.searchLieu ||
                e.lieu === this.searchLieu;
            return matchTitre && matchLieu;
        });
    }

    trier() {
        let liste = [...this.evenementsFiltres];

        if (this.sortByDate === 'proche') {
            const now = new Date().getTime();
            liste.sort((a, b) => {
                const diffA = Math.abs(new Date(a.dateHeure).getTime() - now); // ← date → dateHeure
                const diffB = Math.abs(new Date(b.dateHeure).getTime() - now); // ← date → dateHeure
                return diffA - diffB;
            });
        } else if (this.sortByDate === 'loin') {
            const now = new Date().getTime();
            liste.sort((a, b) => {
                const diffA = Math.abs(new Date(a.dateHeure).getTime() - now); // ← date → dateHeure
                const diffB = Math.abs(new Date(b.dateHeure).getTime() - now); // ← date → dateHeure
                return diffB - diffA;
            });
        }

        if (this.sortByAjout === 'recent') {
            liste.sort((a, b) => b.id - a.id);
        } else if (this.sortByAjout === 'ancien') {
            liste.sort((a, b) => a.id - b.id);
        }

        this.evenementsFiltres = liste;
    }
}