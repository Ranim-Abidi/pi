import { Component, OnInit } from '@angular/core';
import { EvenementService } from '../../services/evenement-service';

@Component({
    selector: 'app-evenement-list-admin',
    standalone: false,
    templateUrl: './evenement-list-admin.component.html',
    styleUrls: ['./evenement-list-admin.component.scss']
})
export class EvenementListAdminComponent implements OnInit {

    evenements: any[] = [];
    filteredEvenements: any[] = [];
    isLoading = true;
    searchTerm = '';

    constructor(private evenementService: EvenementService) {}

    ngOnInit(): void {
        this.loadEvenements();
    }

    loadEvenements(): void {
        this.isLoading = true;
        this.evenementService.getAll().subscribe({
            next: (data: any[]) => {
                this.evenements = data || [];
                this.applyFilter();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.evenements = [];
                this.filteredEvenements = [];
                this.isLoading = false;
            }
        });
    }

    onSearch(term: string): void {
        this.searchTerm = term || '';
        this.applyFilter();
    }

    private applyFilter(): void {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            this.filteredEvenements = [...this.evenements];
            return;
        }
        this.filteredEvenements = this.evenements.filter((e) =>
            (e?.titre || '').toLowerCase().includes(term) ||
            (e?.description || '').toLowerCase().includes(term) ||
            (e?.type || '').toLowerCase().includes(term) ||
            (e?.lieu || '').toLowerCase().includes(term) ||
            (e?.nomOrganisateur || '').toLowerCase().includes(term)
        );
    }

    formatDate(value: any): string {
        if (!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('fr-FR');
    }

   
   supprimer(id: number) {
    if (confirm('Voulez-vous supprimer cet événement ?')) {
        this.evenementService.annulerAdmin(id).subscribe({ // ✅ utilise annulerAdmin
            next: () => this.loadEvenements(),
            error: (err) => console.error('Erreur suppression:', err)
        });
    }
}
}