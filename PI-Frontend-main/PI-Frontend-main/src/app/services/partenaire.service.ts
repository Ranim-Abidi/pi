import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PartenaireService {

    private apiUrl = '/api/partenaires';

    constructor(private http: HttpClient) {}

    getAll(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    create(p: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, p);
    }

    update(id: number, p: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, p);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
    getTopPartenaires(limit: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/top/${limit}`);
    }
    
    getActivityRate(id: number): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/${id}/activity-rate`);
    }
    comparerPartenaires(id1: number, id2: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/comparer?id1=${id1}&id2=${id2}`);
    }
    incrementerVues(id: number): Observable<void> {return this.http.put<void>(`${this.apiUrl}/${id}/vues`, {});
    }

    getNombreVues(id: number): Observable<number> {return this.http.get<number>(`${this.apiUrl}/${id}/vues`);
    }
}