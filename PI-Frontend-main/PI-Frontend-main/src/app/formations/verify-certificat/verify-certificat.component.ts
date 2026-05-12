import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormationService } from '../services/formation.service';

@Component({
  selector: 'app-verify-certificat',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="verify-page">
      <div class="verify-card" *ngIf="!loading">
        <div class="status-icon" [ngClass]="isValid ? 'success' : 'error'">
          <i class="bi" [ngClass]="isValid ? 'bi-check-circle-fill' : 'bi-x-circle-fill'"></i>
        </div>
        
        <h2 [ngStyle]="{ color: isValid ? '#10b981' : '#ef4444' }">
          {{ isValid ? 'Certificat Valide' : 'Certificat Invalide' }}
        </h2>
        
        <p class="status-message" *ngIf="isValid">
          Ce document est un certificat authentique délivré par Matchy Khedma.
        </p>
        <p class="status-message" *ngIf="!isValid">
          Le code fourni ne correspond à aucun certificat valide ou a été révoqué.
        </p>

        <div class="certif-details" *ngIf="isValid && certificat">
          <div class="detail-row">
            <span class="label">Candidat</span>
            <span class="value">{{ candidatName }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Formation / Parcours</span>
            <span class="value">{{ certificat.titre }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Date d'obtention</span>
            <span class="value">{{ certificat.dateObtention | date:'dd MMMM yyyy':'':'fr' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Numéro</span>
            <span class="value">CERT-{{ formatId(certificat.id) }}</span>
          </div>
        </div>

        <div class="actions">
          <a routerLink="/" class="btn-home">Retour à l'accueil</a>
        </div>
      </div>
      
      <div class="loading" *ngIf="loading">
        <i class="bi bi-arrow-repeat spin"></i>
        <p>Vérification en cours...</p>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :host { display: block; }

    .verify-page {
      min-height: 100vh;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      padding: 20px;
    }

    .verify-card {
      background: white;
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
      text-align: center;
      animation: fadeIn 0.4s ease-out;
    }

    .status-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .status-icon.success { color: #10b981; }
    .status-icon.error { color: #ef4444; }

    h2 {
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 10px;
    }

    .status-message {
      color: #64748b;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .certif-details {
      background: #f1f5f9;
      border-radius: 16px;
      padding: 24px;
      text-align: left;
      margin-bottom: 30px;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 16px;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .value {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }

    .btn-home {
      display: inline-block;
      background: #0ea5e9;
      color: white;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-home:hover {
      background: #0284c7;
      transform: translateY(-2px);
    }

    .loading {
      text-align: center;
      color: #64748b;
    }

    .loading i {
      font-size: 40px;
      display: inline-block;
      margin-bottom: 10px;
      color: #0ea5e9;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class VerifyCertificatComponent implements OnInit {

  code: string | null = null;
  loading: boolean = true;
  isValid: boolean = false;
  certificat: any = null;
  candidatName: string = '';

  constructor(
    private route: ActivatedRoute,
    private formationService: FormationService
  ) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code');
    if (this.code) {
      this.verify(this.code);
    } else {
      this.loading = false;
      this.isValid = false;
    }
  }

  verify(code: string): void {
    this.formationService.verifyCertificat(code).subscribe({
      next: (cert) => {
        this.certificat = cert;
        this.isValid = true;
        this.loading = false;
        
        // Extract candidate name
        if (cert.inscription && cert.inscription.candidat) {
          const cand = cert.inscription.candidat;
          this.candidatName = cand.nom ? cand.nom : cand.email;
        }
      },
      error: () => {
        this.isValid = false;
        this.loading = false;
      }
    });
  }

  formatId(id: number): string {
    return id.toString().padStart(5, '0');
  }
}
