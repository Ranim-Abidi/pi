import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { OffreRechercheAvanceeService, OffreSearchResult, AdvancedSearchParams } from './offre-recherche-avancee.service';

@Component({
  selector: 'app-offre-recherche-avancee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offre-recherche-avancee.component.html',
  styleUrls: ['./offre-recherche-avancee.component.scss']
})
export class OffreRechercheAvanceeComponent implements OnInit, OnDestroy {

  // Données et état
  searchResults: OffreSearchResult[] = [];
  filteredResults: OffreSearchResult[] = [];
  isLoading = false;
  errorMessage = '';

  // Paramètres de recherche
  searchType: 'simple' | 'advanced' | 'company' | 'popular' = 'simple';
  searchTypes: Array<'simple' | 'advanced' | 'company' | 'popular'> = ['simple', 'advanced', 'company', 'popular'];
  keyword = '';
  location = '';
  minSalaire: number | null = null;
  maxSalaire: number | null = null;
  typeContrat = '';
  nomEntreprise = '';
  topLimit = 10;

  // Tri et filtrage
  sortBy: 'relevance' | 'date' | 'salary' | 'candidatures' = 'relevance';
  filterByCompany = '';
  filterByLocation = '';

  // Options
  contractTypes = ['CDI', 'CDD', 'Stage', 'Freelance'];
  locations: string[] = [];
  companies: string[] = [];

  // Gestion de l'auto-complétion
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private offreSearchService: OffreRechercheAvanceeService) { }

  ngOnInit(): void {
    console.log('Composant OffreRechercheAvancee initialisé');

    // Vérifier la santé de l'API
    this.offreSearchService.checkHealth().pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      status => console.log('API Status:', status)
    );

    // Auto-complétion avec debounce
    this.searchSubject.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(keyword => {
      if (keyword.length > 2) {
        this.performSearch();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Effectue une recherche en fonction du type sélectionné
   */
  performSearch(): void {
    this.errorMessage = '';
    this.isLoading = true;

    switch (this.searchType) {
      case 'simple':
        this.searchSimple();
        break;
      case 'advanced':
        this.searchAdvanced();
        break;
      case 'company':
        this.searchCompany();
        break;
      case 'popular':
        this.getPopularOffers();
        break;
    }
  }

  /**
   * Recherche simple par mots-clés
   */
  private searchSimple(): void {
    if (!this.keyword.trim()) {
      this.errorMessage = 'Veuillez saisir un mot-clé';
      this.isLoading = false;
      return;
    }

    this.offreSearchService.searchByKeyword(this.keyword).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la recherche';
        console.error('Erreur de recherche:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Recherche avancée avec critères multiples
   */
  private searchAdvanced(): void {
    const params: AdvancedSearchParams = {
      keyword: this.keyword || undefined,
      location: this.location || undefined,
      minSalaire: this.minSalaire || undefined,
      maxSalaire: this.maxSalaire || undefined,
      typeContrat: this.typeContrat || undefined
    };

    // Vérifier qu'au moins un paramètre est rempli
    if (!params.keyword && !params.location && !params.minSalaire && !params.maxSalaire && !params.typeContrat) {
      this.errorMessage = 'Veuillez remplir au moins un critère de recherche';
      this.isLoading = false;
      return;
    }

    this.offreSearchService.advancedSearch(params).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la recherche avancée';
        console.error('Erreur:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Recherche par nom d'entreprise
   */
  private searchCompany(): void {
    if (!this.nomEntreprise.trim()) {
      this.errorMessage = 'Veuillez saisir le nom d\'une entreprise';
      this.isLoading = false;
      return;
    }

    this.offreSearchService.searchByCompany(this.nomEntreprise, this.keyword).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la recherche par entreprise';
        console.error('Erreur:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Récupère les offres les plus populaires
   */
  private getPopularOffers(): void {
    this.offreSearchService.getPopularOffers(this.keyword, this.topLimit).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la récupération des offres populaires';
        console.error('Erreur:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Applique les filtres et tri aux résultats
   */
  applyFilters(): void {
    this.filteredResults = [...this.searchResults];

    // Filtre par entreprise
    if (this.filterByCompany.trim()) {
      this.filteredResults = this.filteredResults.filter(r =>
        r.entreprise.toLowerCase().includes(this.filterByCompany.toLowerCase())
      );
    }

    // Filtre par localisation
    if (this.filterByLocation.trim()) {
      this.filteredResults = this.filteredResults.filter(r =>
        r.location.toLowerCase().includes(this.filterByLocation.toLowerCase())
      );
    }

    // Tri
    this.applySort();

    // Extraire les lieux et entreprises pour l'auto-complétion
    this.locations = [...new Set(this.filteredResults.map(r => r.location))];
    this.companies = [...new Set(this.filteredResults.map(r => r.entreprise))];
  }

  /**
   * Applique le tri aux résultats filtrés
   */
  applySort(): void {
    switch (this.sortBy) {
      case 'relevance':
        this.filteredResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        break;
      case 'date':
        this.filteredResults.sort((a, b) => 
          new Date(b.datePublication).getTime() - new Date(a.datePublication).getTime()
        );
        break;
      case 'salary':
        this.filteredResults.sort((a, b) => {
          const salaryA = parseInt(a.salaire) || 0;
          const salaryB = parseInt(b.salaire) || 0;
          return salaryB - salaryA;
        });
        break;
      case 'candidatures':
        this.filteredResults.sort((a, b) => b.nombreCandidatures - a.nombreCandidatures);
        break;
    }
  }

  /**
   * Déclenche une recherche avec debounce
   */
  onKeywordChange(): void {
    this.searchSubject.next(this.keyword);
  }

  /**
   * Valide les paramètres de salaire
   */
  validateSalaryRange(): void {
    if (this.minSalaire && this.maxSalaire && this.minSalaire > this.maxSalaire) {
      const temp = this.minSalaire;
      this.minSalaire = this.maxSalaire;
      this.maxSalaire = temp;
    }
  }

  /**
   * Réinitialise tous les filtres
   */
  resetSearch(): void {
    this.keyword = '';
    this.location = '';
    this.minSalaire = null;
    this.maxSalaire = null;
    this.typeContrat = '';
    this.nomEntreprise = '';
    this.topLimit = 10;
    this.filterByCompany = '';
    this.filterByLocation = '';
    this.searchResults = [];
    this.filteredResults = [];
    this.errorMessage = '';
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(dateStr: string): string {
    return this.offreSearchService.formatDate(dateStr);
  }

  /**
   * Calcule et retourne le taux d'acceptation
   */
  getAcceptanceRate(accepted: number, total: number): number {
    return this.offreSearchService.calculateAcceptanceRate(accepted, total);
  }

  /**
   * Retourne la classe CSS pour les candidatures
   */
  getCandidaturesClass(count: number): string {
    return this.offreSearchService.getCandidaturesClass(count);
  }
}

