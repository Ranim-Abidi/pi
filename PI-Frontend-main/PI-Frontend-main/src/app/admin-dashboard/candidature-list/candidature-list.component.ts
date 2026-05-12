import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../api.service';

@Component({
    selector: 'app-candidature-list',
    standalone: false,
    templateUrl: './candidature-list.component.html',
    styleUrls: ['./candidature-list.component.scss']
})
export class CandidatureListComponent implements OnInit {

    candidatures: any[] = [];
    filteredCandidatures: any[] = [];
    searchTerm = '';
    isLoading = true;
    errorMessage = '';

    constructor(private apiService: ApiService) {}

    ngOnInit(): void {
        this.loadCandidatures();
    }

    loadCandidatures(): void {
        this.isLoading = true;
        this.errorMessage = '';

        this.apiService.getAllCandidaturesForRecruteur().subscribe({
            next: (data: any[]) => {
                this.candidatures = Array.isArray(data) ? data : [];
                this.applyFilter();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement candidatures:', err);
                this.errorMessage = err?.status === 403
                    ? 'Accès refusé à la liste des candidatures.'
                    : 'Impossible de charger la liste des candidatures.';
                this.isLoading = false;
            }
        });
    }

    onSearch(term: string): void {
        this.searchTerm = term;
        this.applyFilter();
    }

    applyFilter(): void {
        const term = this.searchTerm.trim().toLowerCase();

        if (!term) {
            this.filteredCandidatures = [...this.candidatures];
            return;
        }

        this.filteredCandidatures = this.candidatures.filter((item: any) => {
            const candidate = this.getCandidateName(item).toLowerCase();
            const job = this.getJobTitle(item).toLowerCase();
            const status = this.getStatus(item).toLowerCase();
            const company = this.getCompanyName(item).toLowerCase();

            return candidate.includes(term) || job.includes(term) || status.includes(term) || company.includes(term);
        });
    }

    getCandidateName(item: any): string {
        return item?.candidat?.nom || item?.candidatNom || item?.candidateName || item?.nomCandidat || '-';
    }

    getJobTitle(item: any): string {
        return item?.offre?.titre || item?.titreOffre || item?.jobTitle || item?.poste || '-';
    }

    getCompanyName(item: any): string {
        return item?.entreprise || item?.societe || item?.company || item?.offre?.entreprise || '-';
    }

    getStatus(item: any): string {
        return item?.statut || item?.status || 'En attente';
    }

    getDate(item: any): string {
        return item?.dateCandidature || item?.dateCreation || item?.createdAt || item?.date || '';
    }
}
