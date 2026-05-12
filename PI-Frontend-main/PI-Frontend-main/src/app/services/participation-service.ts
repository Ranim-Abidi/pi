import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ParticipationService {
    private apiUrl = '/api/participations';

    constructor(private http: HttpClient) {}

    //  Candidat participe
    confirmer(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data);
    }

    accepter(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/accepter`, {});
    }

    refuser(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/refuser`, {});
    }

    annuler(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/annuler`, {});
    }

    getDemandesByEvenement(evenementId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/evenement/${evenementId}/demandes`);
    }
    getConfirmeesByEvenement(evenementId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/evenement/${evenementId}/confirmees`);
    }

    getDemandesByOrganisateur(organisateurId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/organisateur/${organisateurId}/demandes`);
    }

    getByCandidat(candidatId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/candidat/${candidatId}`);
    }

    //  Par événement (organisateur)
    getByEvenement(evenementId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/evenement/${evenementId}`);
    }

    //  Stats candidat
    getStatsByCandidat(candidatId: number): Observable<any> {
    return this.http.get<any>(
        `/api/participations/stats/candidat/${candidatId}`
    );


    
    
  }

  getQRCode(id: number): Observable<string> {
        return this.http.get(`/api/participations/${id}/qrcode`, { responseType: 'text' });
        }
    
    ouvrirCertificat(certificateUrl: string): void {
    window.open(certificateUrl, '_blank');
  }
   

}