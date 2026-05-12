import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class WebsocketService {

  private activitiesSubject  = new BehaviorSubject<any[]>([]);
  private dashboardSubject   = new BehaviorSubject<any>(null);
  private pollingSubscription?: Subscription;
  isConnected = false;

  private readonly api = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  connect() {
    this.isConnected = true;

    
    if (this.pollingSubscription && !this.pollingSubscription.closed) return;

    
    this.chargerActivites();

    
    this.pollingSubscription = interval(5000).pipe(
      switchMap(() => this.http.get<any[]>(`${this.api}/activites-recentes`))
    ).subscribe({
      next: (data: any[]) => this.activitiesSubject.next(data),
      error: () => {}
    });

    
    interval(30000).pipe(
      switchMap(() => this.http.get<any>(`${this.api}/dashboard-update`))
    ).subscribe({
      next: (data: any) => this.dashboardSubject.next(data),
      error: () => {}
    });
  }

  chargerActivites() {
    this.http.get<any[]>(`${this.api}/activites-recentes`).subscribe({
      next: (data: any[]) => this.activitiesSubject.next(data),
      error: () => {}
    });
  }

  disconnect() {
    
  }

  getActivities(): Observable<any[]> {
    return this.activitiesSubject.asObservable();
  }

  getDashboardUpdates(): Observable<any> {
    return this.dashboardSubject.asObservable();
  }
}