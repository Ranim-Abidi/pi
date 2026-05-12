import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Feedback, FeedbackCreatePayload, FeedbackUpdatePayload, FeedbackStats } from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {

  private readonly api = `${environment.apiUrl}/feedbacks`;

  constructor(private http: HttpClient) {}

  create(payload: FeedbackCreatePayload): Observable<Feedback> {
    return this.http.post<Feedback>(this.api, payload);
  }

  update(id: number, payload: FeedbackUpdatePayload): Observable<Feedback> {
    return this.http.put<Feedback>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  getById(id: number): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.api}/${id}`);
  }

  getByFormation(formationId: number): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.api}/formation/${formationId}`);
  }

  getByCandidat(candidatId: number): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.api}/candidat/${candidatId}`);
  }

  getByCandidatAndFormation(candidatId: number, formationId: number): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.api}/candidat/${candidatId}/formation/${formationId}`);
  }

  getStats(formationId: number): Observable<FeedbackStats> {
    return this.http.get<FeedbackStats>(`${this.api}/formation/${formationId}/moyenne`);
  }

  getByParcours(parcoursId: number): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.api}/parcours/${parcoursId}`);
  }

  getStatsForParcours(parcoursId: number): Observable<FeedbackStats> {
    return this.http.get<FeedbackStats>(`${this.api}/parcours/${parcoursId}/moyenne`);
  }

  getAll(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(this.api);
  }

  getMacrosByParcours(parcoursId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/parcours/${parcoursId}/macro`);
  }

  getMacroByInscription(inscriptionId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/inscription/${inscriptionId}/macro`);
  }
}