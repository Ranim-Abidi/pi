import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Formation } from '../models/formation.model';
import { FormationService } from '../services/formation.service';
import { ParcoursService } from '../services/parcours.service';
import { NIVEAUX_LABELS, NiveauOrdre } from '../models/parcours.model';

@Component({
  selector: 'app-formation-detail',
  standalone: false,
  templateUrl: './formation-detail.component.html',
  styleUrls: ['./formation-detail.component.scss']
})
export class FormationDetailComponent implements OnInit {
  formation!: Formation;
  loading     = false;
  inscrit     = false;
  inscribing  = false;
  candidatId: number | null = null;
  inscriptionId: number | null = null;
  isAdmin     = false;
  returnUrl   = '/formations';

  // Context Parcours
  parcoursId: number | null = null;
  niveauContext: NiveauOrdre | null = null;

  showAccessModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formationService: FormationService,
    private parcoursService: ParcoursService
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('userRole') || '').toUpperCase().replace('ROLE_', '');
    this.isAdmin = role === 'ADMIN';

    this.route.queryParams.subscribe(params => {
      if (params['from'] === 'dashboard') {
        this.returnUrl = '/candidates-dashboard/mes-formations';
      }
      if (params['parcoursId']) {
        this.parcoursId = Number(params['parcoursId']);
        this.returnUrl = `/formations/parcours/${this.parcoursId}`;
      }
      if (params['niveau']) {
        this.niveauContext = params['niveau'] as NiveauOrdre;
      }
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;

    this.formationService.getFormationById(id).subscribe({
      next: (data: Formation) => {
        this.formation = data;
        this.loading   = false;
      },
      error: () => { this.loading = false; }
    });

    if (!this.isAdmin) {
      this.resolveCandidatId(() => this.verifierInscription(id));
    }
  }

  private verifierInscription(formationId: number): void {
    if (!this.candidatId) return;

    this.formationService.getMesInscriptions(this.candidatId).subscribe({
      next: (inscriptions) => {
        // Only look at inscriptions matching parcoursId context
        const found = inscriptions.find(i =>
          i.formation?.id === formationId &&
          (this.parcoursId ? i.parcoursId === this.parcoursId : !i.parcoursId)
        ) || inscriptions.find(i => i.formation?.id === formationId);
        if (found) {
          this.inscrit = true;
          this.inscriptionId = found.id;
          // Store with user-scoped key
          const key = `candidat_${this.candidatId}_ins_${formationId}` + (this.parcoursId ? `_p${this.parcoursId}` : '');
          localStorage.setItem(key, String(found.id));
        } else if (this.parcoursId) {
          this.autoInscrireDepuisParcours();
        }
      },
      error: () => {
        if (this.parcoursId) this.autoInscrireDepuisParcours();
      }
    });
  }

  private autoInscrireDepuisParcours(): void {
    if (!this.candidatId || !this.parcoursId) return;

    this.parcoursService.getInscription(this.candidatId, this.parcoursId).subscribe({
      next: (insc) => {
        // Le candidat est bien inscrit au parcours global
        console.log('✨ [Parcours] Inscription automatique à la sous-formation contextuelle...');
        
        // On attend que la formation soit chargée pour avoir son ID
        const checkFormation = setInterval(() => {
          if (this.formation?.id) {
            clearInterval(checkFormation);
            this.sInscrire();
          }
        }, 100);
      },
      error: () => {
        console.warn('Accès via parcoursId mais aucune inscription parcours trouvée.');
      }
    });
  }

sInscrire(): void {
  if (!this.candidatId || !this.formation?.id) return;

  this.formationService.inscrire(
    this.candidatId, this.formation.id
  ).subscribe({
    next: (inscription) => {
      // Use user-scoped key to avoid data bleed between accounts
      const key = `candidat_${this.candidatId}_ins_${this.formation.id}` + (this.parcoursId ? `_p${this.parcoursId}` : '');
      localStorage.setItem(key, String(inscription.id));

      this.inscrit       = true;
      this.inscriptionId = inscription.id;

      console.log('✅ Inscrit, inscriptionId:', inscription.id);
    },
    error: (err) => console.error('Erreur inscription:', err)
  });
}

openAccessModal(): void  { this.showAccessModal = true; }
closeAccessModal(): void { this.showAccessModal = false; }

choisirVideo(): void {
  this.showAccessModal = false;
  this.router.navigate(['/formations', this.formation.id, 'video'], {
    queryParamsHandling: 'preserve'
  });
}

choisirFormationEcrite(): void {
  this.showAccessModal = false;
  this.router.navigate(['/formations', this.formation.id, 'ecrite'], {
    queryParamsHandling: 'preserve'
  });
}
  getWrittenUrl(): string {
    const map: Record<string, string> = {
      'Frontend':      'https://www.w3schools.com/html/',
      'Backend':       'https://www.w3schools.com/python/',
      'Data':          'https://www.w3schools.com/python/',
      'IA':            'https://www.w3schools.com/python/',
      'DevOps':        'https://www.w3schools.com/whatis/',
      'Design':        'https://www.w3schools.com/css/',
      'Développement': 'https://www.w3schools.com/java/',
    };
    return map[this.formation?.categorie] ?? 'https://www.w3schools.com/';
  }

  getYoutubeUrl(): string {
    return this.formation?.youtubeId
      ? `https://www.youtube.com/watch?v=${this.formation.youtubeId}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(this.formation?.titre ?? '')}`;
  }

  getCatClass(categorie: string): string {
    const map: Record<string, string> = {
      'Développement': 'cat-dev',    'Frontend': 'cat-frontend',
      'Backend':       'cat-backend', 'IA':      'cat-ia',
      'Data':          'cat-data',    'Design':  'cat-design',
      'DevOps':        'cat-devops'
    };
    return map[categorie] || 'cat-default';
  }

  getIconEmoji(categorie: string): string {
    const map: Record<string, string> = {
      'Data': '📊', 'Frontend': '⚡', 'Backend': '🔧',
      'IA': '🤖', 'Design': '🎨', 'DevOps': '🚀',
      'Développement': '💻', 'Mobile': '📱', 'Cloud': '☁️'
    };
    return map[categorie] || '📚';
  }

  getNiveauBadge(niveau: string): string {
    const map: Record<string, string> = {
      'Débutant': 'badge-green', 'Intermédiaire': 'badge-blue',
      'Avancé':   'badge-amber', 'Expert':        'badge-purple'
    };
    return map[niveau] || 'badge-blue';
  }

  private resolveCandidatId(onResolved?: () => void): void {
    const role  = (localStorage.getItem('userRole') || '').toUpperCase().replace(/^ROLE_/, '');
    const email = localStorage.getItem('userName') || '';

    if (email && role === 'CANDIDAT') {
      this.formationService.getCandidatByEmail(email).subscribe({
        next: (candidat) => {
          if (candidat?.id) {
            this.candidatId = Number(candidat.id);
            localStorage.setItem('candidatId', String(candidat.id));
            onResolved?.();
            return;
          }
          this.resolveCandidatIdFromCacheOrToken(onResolved);
        },
        error: () => this.resolveCandidatIdFromCacheOrToken(onResolved)
      });
      return;
    }

    this.resolveCandidatIdFromCacheOrToken(onResolved);
  }

  private resolveCandidatIdFromCacheOrToken(onResolved?: () => void): void {
    const cached = Number(localStorage.getItem('candidatId'));
    if (!Number.isNaN(cached) && cached > 0) {
      this.candidatId = cached;
      onResolved?.();
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const id = Number(payload.candidatId || payload.idCandidat || payload.candidateId);
        if (!Number.isNaN(id) && id > 0) {
          this.candidatId = id;
          localStorage.setItem('candidatId', String(id));
          onResolved?.();
          return;
        }
      } catch {}
    }
  }
  
}