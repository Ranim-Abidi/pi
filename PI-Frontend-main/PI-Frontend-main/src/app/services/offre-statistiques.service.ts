import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface OffreStatistiques {
  offreId: number;
  titrOffre: string;
  entreprise: string;
  recruteurNom: string;
  recruteurEmail: string;
  nombreCandidatures: number;
  nombreCandidaturesAcceptees: number;
  derniereCandidatureDate: string;
  salaire: string;
  typeContrat: string;
}

@Injectable({
  providedIn: 'root'
})
export class OffreStatistiquesService {
  private apiUrl = '/api/offres-stats';

  constructor(private http: HttpClient) {}

  /**
   * Récupère toutes les offres avec leurs statistiques
   */
  getOffresAvecStatistiques(): Observable<OffreStatistiques[]> {
    return this.http.get<OffreStatistiques[]>(`${this.apiUrl}/all`)
      .pipe(
        tap(data => console.log('✅ Offres loaded:', data)),
        catchError(error => {
          console.error('❌ Error loading offres:', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère les offres d'un recruteur avec stats
   */
  getOffresRecruteur(recruteurId: number): Observable<OffreStatistiques[]> {
    return this.http.get<OffreStatistiques[]>(`${this.apiUrl}/recruiter/${recruteurId}`)
      .pipe(
        tap(data => console.log('✅ Recruiter offres loaded:', data)),
        catchError(error => {
          console.error('❌ Error loading recruiter offres:', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère les offres dans une plage de salaire
   */
  getOffresBySalaryRange(
    min: number,
    max: number,
    minCandidatures: number = 0
  ): Observable<OffreStatistiques[]> {
    let params = new HttpParams()
      .set('min', min.toString())
      .set('max', max.toString())
      .set('minCandidatures', minCandidatures.toString());

    return this.http.get<OffreStatistiques[]>(`${this.apiUrl}/salary`, { params })
      .pipe(
        tap(data => console.log('✅ Salary range offres loaded:', data)),
        catchError(error => {
          console.error('❌ Error loading salary range offres:', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère le top des offres par nombre de candidatures
   */
  getTopOffres(limit: number = 10): Observable<OffreStatistiques[]> {
    let params = new HttpParams().set('limit', limit.toString());

    return this.http.get<OffreStatistiques[]>(`${this.apiUrl}/top`, { params })
      .pipe(
        tap(data => console.log('🏆 Top offres loaded:', data)),
        catchError(error => {
          console.error('❌ Error loading top offres:', error);
          return of([]);
        })
      );
  }
}
