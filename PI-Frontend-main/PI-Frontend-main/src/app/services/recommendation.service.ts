import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {

  private apiUrl = '/api/recommendations';

  constructor(private http: HttpClient) { }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token && token !== 'undefined' && token !== 'null') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * Get single recommendation between candidate and job offer
   */
  getSingleRecommendation(candidateId: number, offerId: number): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.get(
      `${this.apiUrl}/candidate/${candidateId}/offre/${offerId}`,
      { headers }
    );
  }

  /**
   * Get top recommended candidates for a specific job offer
   */
  getTopCandidatesForOffer(offerId: number, limit: number = 10): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    return this.http.get<any[]>(
      `${this.apiUrl}/offre/${offerId}/top-candidates?limit=${limit}`,
      { headers }
    );
  }

  /**
   * Get recommended job offers for a specific candidate
   */
  getRecommendedOffersForCandidate(candidateId: number, limit: number = 10): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    return this.http.get<any[]>(
      `${this.apiUrl}/candidate/${candidateId}/recommended-offres?limit=${limit}`,
      { headers }
    );
  }

  /**
   * Get candidates filtered by recommendation level for a job offer
   */
  getCandidatesByRecommendationLevel(offerId: number, level: string, limit: number = 10): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    const encodedLevel = encodeURIComponent(level);
    return this.http.get<any[]>(
      `${this.apiUrl}/offre/${offerId}/level/${encodedLevel}?limit=${limit}`,
      { headers }
    );
  }

  /**
   * Generate recommendations for all candidates of a specific job offer (batch)
   */
  generateRecommendationsForOffer(offerId: number): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.post(
      `${this.apiUrl}/batch/offre/${offerId}`,
      {},
      { headers }
    );
  }

  /**
   * Generate recommendations for all job offers for a specific candidate (batch)
   */
  generateRecommendationsForCandidate(candidateId: number): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.post(
      `${this.apiUrl}/batch/candidate/${candidateId}`,
      {},
      { headers }
    );
  }

  /**
   * Check service health
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}
