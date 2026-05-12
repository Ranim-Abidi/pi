import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Inscription } from '../../formations/models/inscription.model';
import { Certificat } from '../../formations/models/certificat.model';
import { FormationService } from '../../formations/services/formation.service';

@Component({
  selector: 'app-mes-formations',
  standalone: false,
  templateUrl: './mes-formations.component.html',
  styleUrls: ['./mes-formations.component.scss']
})
export class MesFormationsComponent implements OnInit {
  inscriptions: Inscription[] = [];
  certificats:  Certificat[]  = [];
  candidatId:   number | null = null;
  loading = false;

  get enCours()   { return this.inscriptions.filter(i => i.statut === 'EnCours').length; }
  get terminees() { return this.inscriptions.filter(i => i.statut === 'Terminé').length; }

  constructor(
    private formationService: FormationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resolveCandidatIdAndLoad();
  }

  voirDetailsFormation(ins: Inscription): void {
    this.router.navigate(['/formations', ins.formation.id], {
      queryParams: {
        from: 'dashboard',
        parcoursId: ins.parcoursId,
        niveau: ins.niveauContext
      }
    });
  }

  telecharger(cert: Certificat): void {
    this.formationService.telechargerCertificat(cert.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `certificat-${cert.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erreur téléchargement:', err)
    });
  }

  partagerLinkedIn(cert: any): void {
    if (!cert.verificationCode) {
      alert("Ce certificat n'a pas encore de code de vérification. Veuillez le télécharger une fois pour le générer, puis réessayez.");
      return;
    }
    
    // LinkedIn refuse les URLs "localhost", on doit utiliser un vrai nom de domaine (même fictif pour le test)
    const certUrl = `https://www.matchykhedma.tn/verify-certificat/${cert.verificationCode}`;
    const issueYear = new Date(cert.dateObtention).getFullYear();
    const issueMonth = new Date(cert.dateObtention).getMonth() + 1;
    
    // Remplacer les espaces par des '+' pour l'URL
    const certName = encodeURIComponent(cert.titre);
    
    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certName}&organizationName=MatchyKhedma&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${encodeURIComponent(certUrl)}&certId=${cert.verificationCode}`;
    
    window.open(linkedInUrl, '_blank');
  }

  getProgression(ins: Inscription): number {
    return Math.round(ins.progression || 0);
  }

  getProgressionLabel(ins: Inscription): string {
    const p = this.getProgression(ins);
    if (p === 0)   return 'Non commencée';
    if (p >= 100)  return 'Terminée ✅';
    if (p >= 75)   return 'Presque terminée';
    if (p >= 50)   return 'À mi-chemin';
    return 'En cours';
  }

  private resolveCandidatIdAndLoad(): void {
    const cached = Number(localStorage.getItem('candidatId'));
    if (!Number.isNaN(cached) && cached > 0) {
      this.candidatId = cached;
      this.loadData();
      return;
    }

    const role = (localStorage.getItem('userRole') || '')
      .toUpperCase().replace(/^ROLE_/, '');
    if (role !== 'CANDIDAT') return;

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload     = JSON.parse(atob(token.split('.')[1]));
        const idFromToken = Number(payload.id);
        if (!Number.isNaN(idFromToken) && idFromToken > 0) {
          this.candidatId = idFromToken;
          localStorage.setItem('candidatId', String(idFromToken));
          this.loadData();
          return;
        }
      } catch (e) {
        console.error('Erreur décodage token:', e);
      }
    }

    const email = localStorage.getItem('userName') || '';
    if (!email) return;

    this.formationService.getCandidatByEmail(email).subscribe({
      next: (candidat) => {
        if (candidat?.id) {
          this.candidatId = Number(candidat.id);
          localStorage.setItem('candidatId', String(candidat.id));
          this.loadData();
        }
      },
      error: () => {
        this.inscriptions = [];
        this.certificats  = [];
      }
    });
  }

  private loadData(): void {
    if (!this.candidatId) return;
    this.loading = true;

    this.formationService.getMesInscriptions(this.candidatId).subscribe({
      next: (data: Inscription[]) => {
        // Nettoyer les doublons (filtrage par formation ID unique)
        const uniqueInscriptions = [];
        const seenFormationIds = new Set();
        
        for (const ins of data) {
          if (ins.formation && !seenFormationIds.has(ins.formation.id)) {
            seenFormationIds.add(ins.formation.id);
            uniqueInscriptions.push(ins);
          }
        }
        
        this.inscriptions = uniqueInscriptions;
        
        uniqueInscriptions.forEach(ins => {
          if (ins.formation?.id && ins.id) {
            localStorage.setItem(
              'inscription_' + ins.formation.id,
              String(ins.id)
            );
          }
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur getMesInscriptions:', err);
        this.loading = false;
      }
    });

    this.formationService.getMesCertificats(this.candidatId).subscribe({
      next: (data: Certificat[]) => { this.certificats = data; },
      error: (err) => console.error('Erreur getMesCertificats:', err)
    });
  }
}