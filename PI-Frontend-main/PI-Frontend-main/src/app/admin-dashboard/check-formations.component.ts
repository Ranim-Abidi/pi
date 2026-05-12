import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface NiveauCheck {
  count: number;
  available: boolean;
}

@Component({
  selector: 'app-check-formations',
  standalone: false,
  template: `
    <div class="check-formations">
      <h2>Vérification des formations par niveau</h2>
      <button (click)="checkNiveaux()" [disabled]="loading">
        <i class="ri-search-line" *ngIf="!loading"></i>
        <i class="ri-loader-4-line spin" *ngIf="loading"></i>
        Vérifier
      </button>

      <div class="results" *ngIf="results">
        <div class="niveau-result" *ngFor="let niveau of niveaux">
          <div class="niveau-header">
            <span class="niveau-name">{{ niveau }}</span>
            <span class="niveau-status" [class.available]="getNiveauAvailable(niveau)" [class.unavailable]="!getNiveauAvailable(niveau)">
              <i class="ri-check-line" *ngIf="getNiveauAvailable(niveau)"></i>
              <i class="ri-close-line" *ngIf="!getNiveauAvailable(niveau)"></i>
              {{ getNiveauAvailable(niveau) ? 'Disponible' : 'Indisponible' }}
            </span>
          </div>
          <div class="niveau-count">
            {{ getNiveauCount(niveau) }} formation(s)
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .check-formations { padding: 20px; }
    .results { margin-top: 20px; }
    .niveau-result {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      border-radius: 5px;
    }
    .niveau-header { display: flex; align-items: center; gap: 10px; }
    .niveau-name { font-weight: bold; }
    .niveau-status.available { color: green; }
    .niveau-status.unavailable { color: red; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class CheckFormationsComponent implements OnInit {

  niveaux = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
  results: Record<string, NiveauCheck> | null = null;
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  checkNiveaux(): void {
    this.loading = true;
    this.http.get<Record<string, NiveauCheck>>(`${environment.apiUrl}/formations/check-niveaux`)
      .subscribe({
        next: (data) => {
          this.results = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur vérification:', err);
          this.loading = false;
        }
      });
  }

  getNiveauAvailable(niveau: string): boolean {
    return this.results?.[niveau]?.available ?? false;
  }

  getNiveauCount(niveau: string): number {
    return this.results?.[niveau]?.count ?? 0;
  }
}