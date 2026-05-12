import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EvenementService {
  private apiUrl = '/api/evenements';

  constructor(private http: HttpClient) {}

  // CREATE
  publier(evenement: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, evenement);
  }

  // GET ALL
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // GET BY ID
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // GET par organisateur
getByOrganisateur(organisateurId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/organisateur/${organisateurId}`);
}

  // UPDATE
  modifier(id: number, evenement: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, evenement);
  }

  // DELETE
  annuler(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

 
annulerAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/${id}`);
}

//  Récupère les statistiques par mois
getStats(mois: number, annee: number, organisateurId: number): Observable<any> {
    return this.http.get<any>(
        `${this.apiUrl}/stats?mois=${mois}&annee=${annee}&organisateurId=${organisateurId}`
    );
}

// Appelle l'endpoint Spring avec le JWT et télécharge le fichier .ics reçu
exporterMesEvenementsConfirmes(candidatId: number): void {
  const url = `${this.apiUrl}/export-ics/confirmed/${candidatId}`;
  const token = localStorage.getItem('token');

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => res.blob())                          // Convertit la réponse en fichier binaire
  .then(blob => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);          // Crée une URL temporaire vers le blob
    link.download = 'mes-evenements-confirmes.ics'; // Nom du fichier téléchargé
    link.click();
    URL.revokeObjectURL(link.href);                 // Libère la mémoire après téléchargement
  })
  .catch(err => console.error('Erreur export ICS:', err));
}

getMesParticipationsConfirmees(candidatId: number): Observable<any[]> {
  const token = localStorage.getItem('token');
  return this.http.get<any[]>(
    `/api/participations/confirmed/${candidatId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
}
}