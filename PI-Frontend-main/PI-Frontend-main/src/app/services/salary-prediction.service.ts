import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SalaryPredictionService {
  constructor(private http: HttpClient) {}

  predictSalary(data: any): Observable<any> {
    // Utilise le proxy Angular pour éviter les problèmes CORS
    return this.http.post<any>('/api/predict-salary', data);
  }
}
