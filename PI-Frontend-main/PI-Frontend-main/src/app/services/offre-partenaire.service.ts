import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class OffrePartenaireService {

    private readonly apiUrl = `${environment.apiUrl}/offres-partenaires`;

    constructor(private http: HttpClient) {}

    getAll(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getByPartenaire(id: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/partenaire/${id}`);
    }

    create(o: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, o);
    }

    update(id: number, o: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, o);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    searchByKeyword(keyword: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/search?keyword=${keyword}`);
    }

    // ── Ancien (Naive Bayes) — gardé intact ──────────────────
    predictNextOffreType(partenaireId: number): Observable<string> {
        return this.http.get(
            `${this.apiUrl}/predict-naive/${partenaireId}`,
            { responseType: 'text' }
        );
    }

    
    predictML(partenaireId: number): Observable<any> {
        return this.http.get<any>(
            `${this.apiUrl}/predict/${partenaireId}`
        );
    }

    toggleEpingle(id: number): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}/epingle`, {});
    }

    getByPartenaireTriees(partenaireId: number): Observable<any[]> {
        return this.http.get<any[]>(
            `${this.apiUrl}/partenaire/${partenaireId}/triees`
        );
    }
}