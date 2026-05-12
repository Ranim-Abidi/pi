import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Formation } from '../models/formation.model';
import { Inscription, InscriptionCreatePayload } from '../models/inscription.model';
import { Certificat } from '../models/certificat.model';

export interface FormationCreatePayload {
  titre: string;
  categorie: string;
  plateforme: string;
  statut: string;
  duree: string;
  niveau: string;
  lienExterne?: string;
  youtubeId?: string;
  playlistId?: string;
  hasEditor?: boolean;
  stackBlitzUrl?: string;
  writtenUrl?: string;
}

export type FormationUpdatePayload = Partial<FormationCreatePayload>;

@Injectable({ providedIn: 'root' })
export class FormationService {

  private readonly base = `${environment.apiUrl}/formations`;
  private readonly api  = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllFormations(): Observable<Formation[]> {
    return this.http.get<Formation[]>(this.base);
  }

  getPlaylistVideos(playlistId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/suggestions/playlist-videos/${playlistId}`);
  }

  getFormationById(id: number): Observable<Formation> {
    return this.http.get<Formation>(`${this.base}/${id}`);
  }

  getByNiveau(niveau: string): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.base}/niveau/${niveau}`);
  }

  getByCategorie(categorie: string): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.base}/categorie/${categorie}`);
  }

  getAllFormationsAdmin(): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.base}/admin/all`);
  }

  getFormationsArchivees(): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.base}/admin/archivees`);
  }

  createFormation(payload: FormationCreatePayload): Observable<Formation> {
    return this.http.post<Formation>(this.base, payload);
  }

  updateFormation(id: number, payload: FormationUpdatePayload): Observable<Formation> {
    return this.http.put<Formation>(`${this.base}/${id}`, payload);
  }

  deleteFormation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  archiverFormation(id: number): Observable<Formation> {
    return this.http.put<Formation>(`${this.base}/${id}/archiver`, {});
  }

  desarchiverFormation(id: number): Observable<Formation> {
    return this.http.put<Formation>(`${this.base}/${id}/desarchiver`, {});
  }

  inscrire(candidatId: number, formationId: number): Observable<Inscription> {
    const payload: InscriptionCreatePayload = {
      candidat:  { id: candidatId },
      formation: { id: formationId }
    };
    return this.http.post<Inscription>(`${this.api}/inscriptions`, payload);
  }

  updateProgression(inscriptionId: number, progression: number): Observable<Inscription> {
    const body: any = { progression };
    if (progression >= 100) {
      body.statut = 'Terminé';
    }
    return this.http.put<Inscription>(
      `${this.api}/inscriptions/${inscriptionId}`, body
    );
  }

  getMesInscriptions(candidatId: number): Observable<Inscription[]> {
    return this.http.get<Inscription[]>(
      `${this.api}/inscriptions/candidat/${candidatId}`
    );
  }

  getInscriptionByDetails(candidatId: number, formationId: number, parcoursId?: number): Observable<Inscription> {
    let url = `${this.api}/inscriptions/candidat/${candidatId}/formation/${formationId}`;
    if (parcoursId) {
      url += `?parcoursId=${parcoursId}`;
    }
    return this.http.get<Inscription>(url);
  }

  getInscriptionsByFormation(formationId: number): Observable<Inscription[]> {
    return this.http.get<Inscription[]>(
      `${this.api}/inscriptions/formation/${formationId}`
    );
  }

  getMesCertificats(candidatId: number): Observable<Certificat[]> {
    return this.http.get<Certificat[]>(
      `${this.api}/certificats/candidat/${candidatId}`
    );
  }

  telechargerCertificat(certificatId: number): Observable<Blob> {
    return this.http.get(
      `${this.api}/certificats/${certificatId}/telecharger`,
      { responseType: 'blob' }
    );
  }

  verifyCertificat(code: string): Observable<any> {
    return this.http.get<any>(`${this.api}/certificats/verify/${code}`);
  }

  getCandidatByEmail(email: string): Observable<{ id: number }> {
    return this.http.get<{ id: number }>(
      `${this.api}/candidats/email/${encodeURIComponent(email)}`
    );
  }

  getStats(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/stats`);
  }

  getStatsByCategorie(categorie: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/stats/categorie/${categorie}`);
  }

  getTopFormations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/top`);
  }

  refreshScoresAndBadges(): Observable<any> {
    return this.http.post<any>(`${this.base}/refresh`, {});
  }

  getFormationsParBadge(badge: string): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.base}/badge/${badge}`);
  }

  getFormationsPopulaires(scoreMin: number = 50): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.base}/populaires?scoreMin=${scoreMin}`);
  }

  // --- RECOMMANDATIONS ML ---
  getFormationsRecommandees(candidatId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/recommandees/${candidatId}`);
  }
}