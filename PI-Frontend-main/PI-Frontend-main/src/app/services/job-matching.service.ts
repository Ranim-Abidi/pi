// src/app/common/services/job-matching.service.ts (NOUVEAU)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
export interface MLOffer {
  job_id: string;
  job_title: string;
  job_domain: string;
  job_location: string;
  job_skills: string;
  score_match: number;
  raison: string;
}

export interface MLResponse {
  domaine_detecte: string;
  confiance_domaine: number;
  offres: MLOffer[];
  competences_reconnues: string[];
  conseil: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobMatchingService {
  
  // URL de votre API ML (FastAPI)
 // private mlApiUrl = 'http://localhost:8000/matching/offres';
  private readonly apiUrl = `${environment.apiUrl}/job-matching`; 
  constructor(private http: HttpClient) {}

  /**
   * Appelle directement le service ML pour obtenir des offres personnalisées
   * @param skills Compétences du candidat (ex: "python java react")
   * @param topN Nombre d'offres à retourner
   */
  getMatchingOffers(skills: string, topN: number = 20): Observable<MLResponse> {
    const request = {
      candidate_skills: skills,
      candidate_experience: 3,
      top_n: topN
    };
    
    console.log('🎯 Appel au ML avec:', request);
    
    return this.http.post<MLResponse>(this.apiUrl, request);
  }
}