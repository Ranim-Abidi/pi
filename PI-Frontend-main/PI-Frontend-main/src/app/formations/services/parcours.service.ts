import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ParcoursFormation, InscriptionParcours } from '../models/parcours.model';
import { Formation } from '../models/formation.model';

@Injectable({ providedIn: 'root' })
export class ParcoursService {

  private readonly api = `${environment.apiUrl}/parcours`;
  private readonly inscriptionApi = `${environment.apiUrl}/inscription-parcours`;

  constructor(private http: HttpClient) {}

  // ── Parcours ────────────────────────────────────────────
  getAll(): Observable<ParcoursFormation[]> {
    return this.http.get<ParcoursFormation[]>(this.api);
  }

  getById(id: number): Observable<ParcoursFormation> {
    return this.http.get<ParcoursFormation>(`${this.api}/${id}`);
  }

  getNiveaux(id: number): Observable<Record<string, Formation>> {
    return this.http.get<Record<string, Formation>>(`${this.api}/${id}/niveaux`);
  }

  create(payload: any): Observable<ParcoursFormation> {
    return this.http.post<ParcoursFormation>(this.api, payload);
  }

  createAvecFormations(payload: any): Observable<ParcoursFormation> {
    return this.http.post<ParcoursFormation>(`${this.api}/avec-formations`, payload);
  }

  update(id: number, payload: any): Observable<ParcoursFormation> {
    return this.http.put<ParcoursFormation>(`${this.api}/${id}/avec-formations`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  archiver(id: number): Observable<ParcoursFormation> {
    return this.http.patch<ParcoursFormation>(`${this.api}/${id}/archiver`, {});
  }

  desarchiver(id: number): Observable<ParcoursFormation> {
    return this.http.patch<ParcoursFormation>(`${this.api}/${id}/desarchiver`, {});
  }

  // ── Inscriptions Parcours ──────────────────────────────
  inscrire(candidatId: number, parcoursId: number): Observable<InscriptionParcours> {
    return this.http.post<InscriptionParcours>(this.inscriptionApi, {
      candidatId: candidatId,
      parcoursId: parcoursId
    });
  }

  getInscriptionsCandidatParcours(candidatId: number): Observable<InscriptionParcours[]> {
    return this.http.get<InscriptionParcours[]>(
      `${this.inscriptionApi}/candidat/${candidatId}`
    );
  }

  getInscriptionDetail(id: number): Observable<InscriptionParcours> {
    return this.http.get<InscriptionParcours>(`${this.inscriptionApi}/${id}`);
  }

  getFormationActuelle(inscriptionId: number): Observable<Formation> {
    return this.http.get<Formation>(
      `${this.inscriptionApi}/${inscriptionId}/formation-actuelle`
    );
  }

  getInscription(candidatId: number, parcoursId: number): Observable<InscriptionParcours> {
    return this.http.get<InscriptionParcours>(
      `${this.inscriptionApi}/candidat/${candidatId}/parcours/${parcoursId}`
    );
  }
}
