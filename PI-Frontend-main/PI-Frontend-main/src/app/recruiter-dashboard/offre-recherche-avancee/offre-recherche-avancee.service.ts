import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Interface pour les résultats de recherche d'offres
 */
export interface OffreSearchResult {
  offreId: number;
  titrOffre: string;
  description: string;
  entreprise: string;
  recruteurNom: string;
  recruteurEmail: string;
  location: string;
  typeContrat: string;
  salaire: string;
  datePublication: string;
  nombreCandidatures: number;
  nombreCandidaturesAcceptees: number;
  relevanceScore: number;
  matchedFields: string;
  highlightedText: string;
}

/**
 * Interface pour les paramètres de recherche avancée
 */
export interface AdvancedSearchParams {
  keyword?: string;
  location?: string;
  minSalaire?: number;
  maxSalaire?: number;
  typeContrat?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OffreRechercheAvanceeService {

  private readonly apiUrl = `${environment.apiUrl}/offres-search`;

  constructor(private http: HttpClient) { }

  /**
   * Recherche simple par mots-clés
   * Utilise les jointures: OffreEmploi -> Recruteur, Candidatures
   * 
   * @param keyword Le mot-clé à rechercher
   * @return Observable contenant la liste des résultats
   */
  searchByKeyword(keyword: string): Observable<OffreSearchResult[]> {
    console.log('Recherche par mot-clé:', keyword);

    if (!keyword || keyword.trim().length === 0) {
      return of([]);
    }

    let params = new HttpParams();
    params = params.set('q', keyword.trim());

    return this.http.get<OffreSearchResult[]>(
      `${this.apiUrl}/keyword`,
      { params }
    ).pipe(
      tap(results => console.log(`${results.length} résultats trouvés pour: ${keyword}`)),
      catchError(error => {
        console.error('Erreur lors de la recherche par mot-clé', error);
        return of([]);
      })
    );
  }

  /**
   * Recherche avancée avec critères multiples
   * Jointures complexes avec filtres:
   * - INNER JOIN Recruteur
   * - LEFT JOIN Candidatures
   * - Filtres: salaire, location, type de contrat
   * 
   * @param params Paramètres de recherche (keyword, location, salaire, typeContrat)
   * @return Observable contenant les offres correspondant à TOUS les critères
   */
  advancedSearch(params: AdvancedSearchParams): Observable<OffreSearchResult[]> {
    console.log('Recherche avancée avec params:', params);

    let httpParams = new HttpParams();

    if (params.keyword) {
      httpParams = httpParams.set('q', params.keyword.trim());
    }
    if (params.location) {
      httpParams = httpParams.set('location', params.location.trim());
    }
    if (params.minSalaire !== undefined && params.minSalaire > 0) {
      httpParams = httpParams.set('minSalaire', params.minSalaire.toString());
    }
    if (params.maxSalaire !== undefined && params.maxSalaire > 0) {
      httpParams = httpParams.set('maxSalaire', params.maxSalaire.toString());
    }
    if (params.typeContrat) {
      httpParams = httpParams.set('typeContrat', params.typeContrat.trim());
    }

    return this.http.get<OffreSearchResult[]>(
      `${this.apiUrl}/advanced`,
      { params: httpParams }
    ).pipe(
      tap(results => console.log(`Recherche avancée: ${results.length} résultats`)),
      catchError(error => {
        console.error('Erreur lors de la recherche avancée', error);
        return of([]);
      })
    );
  }

  /**
   * Recherche par nom d'entreprise avec mots-clés optionnels
   * Jointures: INNER JOIN Recruteur, LEFT JOIN Candidatures
   * 
   * @param nomEntreprise Nom de l'entreprise (requis)
   * @param keyword Mots-clés optionnels
   * @return Observable contenant toutes les offres de l'entreprise
   */
  searchByCompany(nomEntreprise: string, keyword?: string): Observable<OffreSearchResult[]> {
    console.log('Recherche par entreprise:', nomEntreprise, 'Keyword:', keyword);

    let params = new HttpParams();
    params = params.set('company', nomEntreprise.trim());

    if (keyword && keyword.trim().length > 0) {
      params = params.set('q', keyword.trim());
    }

    return this.http.get<OffreSearchResult[]>(
      `${this.apiUrl}/company`,
      { params }
    ).pipe(
      tap(results => console.log(`Entreprise ${nomEntreprise}: ${results.length} offres`)),
      catchError(error => {
        console.error('Erreur lors de la recherche par entreprise', error);
        return of([]);
      })
    );
  }

  /**
   * Récupère les offres les plus populaires (par nombre de candidatures)
   * 
   * @param keyword Mot-clé optionnel
   * @param limit Nombre d'offres (défaut: 10)
   * @return Observable contenant les top offres
   */
  getPopularOffers(keyword?: string, limit: number = 10): Observable<OffreSearchResult[]> {
    console.log('Récupération des offres populaires - Limit:', limit);

    let params = new HttpParams();
    params = params.set('limit', limit.toString());

    if (keyword && keyword.trim().length > 0) {
      params = params.set('q', keyword.trim());
    }

    return this.http.get<OffreSearchResult[]>(
      `${this.apiUrl}/popular`,
      { params }
    ).pipe(
      tap(results => console.log(`${results.length} offres populaires retournées`)),
      catchError(error => {
        console.error('Erreur lors de la récupération des offres populaires', error);
        return of([]);
      })
    );
  }

  /**
   * Vérifie la disponibilité de l'API
   * 
   * @return Observable contenant le statut
   */
  checkHealth(): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/health`).pipe(
      catchError(error => {
        console.error('API non disponible', error);
        return of('API non disponible');
      })
    );
  }

  /**
   * Formate une date pour l'affichage
   * 
   * @param dateStr Chaîne de date ISO
   * @return Date formatée
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Calcule le taux d'acceptation des candidatures
   * 
   * @param acceptees Nombre de candidatures acceptées
   * @param total Nombre total de candidatures
   * @return Pourcentage (0-100)
   */
  calculateAcceptanceRate(acceptees: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((acceptees / total) * 100);
  }

  /**
   * Retourne la classe CSS basée sur le nombre de candidatures
   * 
   * @param count Nombre de candidatures
   * @return Classe CSS
   */
  getCandidaturesClass(count: number): string {
    if (count === 0) return 'none';
    if (count < 5) return 'low';
    if (count < 15) return 'medium';
    return 'high';
  }
}
