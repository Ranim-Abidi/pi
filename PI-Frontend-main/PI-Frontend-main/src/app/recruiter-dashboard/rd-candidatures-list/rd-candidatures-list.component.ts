import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '../../api.service';

interface OffreCandidaturesGroup {
  offre: any;
  candidatures: any[];
}

@Component({
  selector: 'app-rd-candidatures-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rd-candidatures-list.component.html',
  styleUrls: ['./rd-candidatures-list.component.scss']
})
export class RdCandidaturesListComponent implements OnInit {
  offerGroups: OffreCandidaturesGroup[] = [];
  filteredOfferGroups: OffreCandidaturesGroup[] = [];
  loading = false;
  selectedStatut = 'TOUS';
  searchTerm = '';
  totalCandidatures = 0;
  errorMessage = '';
  selectedCandidature: any = null;
  selectedOffre: any = null;
  showDetailModal = false;
  
  statuts = ['TOUS', 'EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'];

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCandidatures();
  }

  // Charger les offres du recruteur et leurs candidatures associées
  loadCandidatures(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.getMesOffresEmploi().pipe(
      catchError((error) => {
        console.error('Erreur chargement offres recruteur:', error);
        return this.apiService.getOffresEmploi();
      })
    ).subscribe({
      next: (data) => {
        const offres = Array.isArray(data) ? data : [];

        if (offres.length === 0) {
          this.offerGroups = [];
          this.filteredOfferGroups = [];
          this.totalCandidatures = 0;
          this.loading = false;
          return;
        }

        const requests = offres.map((offre: any) =>
          this.apiService.getCandidaturesByOffre(Number(offre?.id)).pipe(
            map((candidatures) => ({
              offre,
              candidatures: this.normalizeArrayPayload(candidatures)
            })),
            catchError((error) => {
              console.error(`Erreur chargement candidatures pour l'offre ${offre?.id}:`, error);
              return of({ offre, candidatures: [] });
            })
          )
        );

        forkJoin(requests).subscribe({
          next: (groups) => {
            this.offerGroups = groups || [];
            this.totalCandidatures = this.offerGroups.reduce((sum, group) => sum + group.candidatures.length, 0);
            this.applyFilters();
            this.loading = false;
          },
          error: (err) => {
            console.error('Erreur lors du chargement des candidatures par offre:', err);
            this.errorMessage = 'Impossible de charger les candidatures.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Erreur lors du chargement des offres:', err);
        this.errorMessage = 'Impossible de charger vos offres.';
        this.loading = false;
      }
    });
  }

  // Appliquer les filtres
  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredOfferGroups = this.offerGroups.map((group) => {
      const candidatures = group.candidatures.filter((candidature: any) => {
        const matchesStatut = this.selectedStatut === 'TOUS' || candidature?.statut === this.selectedStatut;
        if (!matchesStatut) {
          return false;
        }

        if (!term) {
          return true;
        }

        const candidate = this.getCandidateName(candidature).toLowerCase();
        const email = String(candidature?.email || candidature?.candidat?.email || '').toLowerCase();
        const title = this.getOfferTitle(group.offre).toLowerCase();
        const company = this.getCompanyName(group.offre).toLowerCase();
        const status = String(candidature?.statut || '').toLowerCase();

        return candidate.includes(term) || email.includes(term) || title.includes(term) || company.includes(term) || status.includes(term);
      });

      return {
        ...group,
        candidatures
      };
    });
  }

  getOfferTitle(offre: any): string {
    return offre?.titre || offre?.title || offre?.poste || 'Offre sans titre';
  }

  getCompanyName(offre: any): string {
    return offre?.entreprise || offre?.company || offre?.recruteur?.entreprise || 'Entreprise';
  }

  getOfferLocation(offre: any): string {
    return offre?.location || offre?.localisation || offre?.ville || 'Non renseignée';
  }

  getOfferSalary(offre: any): string {
    return offre?.salaire || offre?.salary || 'N/A';
  }

  getCandidateName(candidature: any): string {
    return candidature?.nomComplet || candidature?.candidat?.nom || candidature?.candidateName || candidature?.nomCandidat || '-';
  }

  getStatusBadge(statut: string): string {
    switch (statut) {
      case 'ACCEPTEE':
        return 'badge-success';
      case 'REFUSEE':
        return 'badge-danger';
      case 'EN_ATTENTE':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  getStatusLabel(statut: string): string {
    switch (statut) {
      case 'ACCEPTEE':
        return 'Acceptée';
      case 'REFUSEE':
        return 'Rejetée';
      case 'EN_ATTENTE':
        return 'En attente';
      default:
        return statut || 'Inconnu';
    }
  }

  get visibleOfferCount(): number {
    return this.filteredOfferGroups.length;
  }

  get visibleCandidatureCount(): number {
    return this.filteredOfferGroups.reduce((sum, group) => sum + group.candidatures.length, 0);
  }

  openInterviewCreation(candidature: any, offre: any): void {
    this.router.navigate(['/recruiter-dashboard/interviews'], {
      queryParams: {
        createFromCandidature: 1,
        candidatureId: candidature?.id || '',
        candidatId: candidature?.candidatId || candidature?.candidat?.id || '',
        nomComplet: this.getCandidateName(candidature),
        email: candidature?.email || candidature?.candidat?.email || '',
        poste: this.getOfferTitle(offre),
        offreId: offre?.id || ''
      }
    });
  }

  showDetails(candidature: any, offre: any): void {
    this.selectedCandidature = candidature;
    this.selectedOffre = offre;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedCandidature = null;
    this.selectedOffre = null;
  }

  accepterCandidature(candidature: any): void {
    if (!candidature?.id) {
      return;
    }

    if (!confirm(`Accepter la candidature de ${this.getCandidateName(candidature)} ?`)) {
      return;
    }

    this.updateCandidatureStatus(candidature.id, 'ACCEPTEE');
  }

  refuserCandidature(candidature: any): void {
    if (!candidature?.id) {
      return;
    }

    if (!confirm(`Refuser la candidature de ${this.getCandidateName(candidature)} ?`)) {
      return;
    }

    this.updateCandidatureStatus(candidature.id, 'REFUSEE');
  }

  private updateCandidatureStatus(id: number, statut: string): void {
    this.apiService.modifierStatutCandidature(id, statut).subscribe({
      next: () => {
        this.notifySuccess(`Candidature ${statut === 'ACCEPTEE' ? 'acceptée' : 'refusée'} avec succès`);
        if (this.selectedCandidature?.id === id) {
          this.closeDetailModal();
        }
        this.loadCandidatures();
      },
      error: (error) => {
        console.error('Erreur mise à jour candidature:', error);
        this.notifyError('Impossible de mettre à jour le statut de la candidature');
      }
    });
  }

  private normalizeArrayPayload(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const nestedArray = Object.values(payload).find((value: any) => Array.isArray(value));
      return Array.isArray(nestedArray) ? nestedArray : [];
    }

    return [];
  }

  private notifySuccess(message: string): void {
    console.log(message);
  }

  private notifyError(message: string): void {
    console.error(message);
  }
}
