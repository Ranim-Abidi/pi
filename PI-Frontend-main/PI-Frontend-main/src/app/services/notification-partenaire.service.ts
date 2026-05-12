import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationPartenaireService {

  private readonly apiUrl = `${environment.apiUrl}/notifications-partenaire`;

  constructor(private http: HttpClient) {}

  getNotifications(userId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/user/${userId}`);
  }

  countNonLues(userId: number): Observable<number> {
    return this.http.get<number>(
      `${this.apiUrl}/user/${userId}/count`);
  }

  marquerLue(userId: number,
             notifId: string): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/user/${userId}/lue/${notifId}`, {});
  }

  marquerToutesLues(userId: number): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/user/${userId}/toutes-lues`, {});
  }

  getUserIdFromToken(): number {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(
          atob(token.split('.')[1]));
        return payload.id
          || payload.userId
          || payload.sub
          || 0;
      } catch { return 0; }
    }
    return 0;
  }
}