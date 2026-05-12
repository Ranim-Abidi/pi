import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OffreStatistiquesService, OffreStatistiques } from '../../services/offre-statistiques.service';

@Component({
  selector: 'app-offre-statistiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offre-statistiques.component.html',
  styleUrls: ['./offre-statistiques.component.scss']
})
export class OffreStatistiquesComponent implements OnInit, OnDestroy {
  offres: OffreStatistiques[] = [];
  filteredOffres: OffreStatistiques[] = [];
  isLoading = false;
  errorMessage = '';

  // Filtres
  selectedFilter: 'all' | 'recruiter' | 'salary' | 'top' = 'all';
  recruteurId: number | null = null;
  salaryMin: number = 50;
  salaryMax: number = 150;
  minCandidatures: number = 0;
  topLimit: number = 10;

  private destroy$ = new Subject<void>();

  constructor(private offreStatistiquesService: OffreStatistiquesService) {}

  ngOnInit(): void {
    this.loadAllOffres();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge toutes les offres
   */
  loadAllOffres(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.selectedFilter = 'all';

    this.offreStatistiquesService.getOffresAvecStatistiques()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.offres = data;
          this.filteredOffres = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors du chargement des offres';
          this.isLoading = false;
        }
      });
  }

  /**
   * Charge les offres d'un recruteur
   */
  loadRecruteurOffres(): void {
    if (!this.recruteurId) {
      this.errorMessage = 'Veuillez sélectionner un recruteur';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.selectedFilter = 'recruiter';

    this.offreStatistiquesService.getOffresRecruteur(this.recruteurId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.filteredOffres = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors du chargement des offres du recruteur';
          this.isLoading = false;
        }
      });
  }

  /**
   * Filtre par plage de salaire
   */
  loadSalaryRangeOffres(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.selectedFilter = 'salary';

    this.offreStatistiquesService.getOffresBySalaryRange(
      this.salaryMin,
      this.salaryMax,
      this.minCandidatures
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.filteredOffres = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors du filtrage par salaire';
          this.isLoading = false;
        }
      });
  }

  /**
   * Charge le top des offres
   */
  loadTopOffres(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.selectedFilter = 'top';

    this.offreStatistiquesService.getTopOffres(this.topLimit)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.filteredOffres = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors du chargement du top offres';
          this.isLoading = false;
        }
      });
  }

  /**
   * Formate la date
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  }

  /**
   * Retourne la classe CSS pour les stats
   */
  getCandidaturesClass(count: number): string {
    if (count === 0) return 'candidatures-none';
    if (count < 5) return 'candidatures-low';
    if (count < 15) return 'candidatures-medium';
    return 'candidatures-high';
  }

  /**
   * Calcule le pourcentage d'acceptation
   */
  getAcceptanceRate(accepted: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((accepted / total) * 100)}%`;
  }
}
