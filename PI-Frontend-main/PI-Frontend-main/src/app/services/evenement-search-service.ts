import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface SearchResult {
  resultats: any[];
  suggestions: any[];
  historiqueRecherches: string[];
  totalResultats: number;
}

@Injectable({ providedIn: 'root' })
export class EvenementSearchService {

  private readonly base = `${environment.apiUrl}/search`;

  constructor(private http: HttpClient) {}

  //  retourne un objet structuré, pas un tableau
  rechercher(query: string, candidatId: number): Observable<SearchResult> {
    const params = new HttpParams()
      .set('q', query)
      .set('candidatId', candidatId);
    return this.http.get<SearchResult>(`${this.base}/evenements`, { params });
  }

  getSuggestions(candidatId: number): Observable<any[]> {
    const params = new HttpParams().set('candidatId', candidatId);
    return this.http.get<any[]>(`${this.base}/suggestions`, { params });
  }

  getHistorique(candidatId: number): Observable<string[]> {
    const params = new HttpParams().set('candidatId', candidatId);
    return this.http.get<string[]>(`${this.base}/historique`, { params });
  }
}