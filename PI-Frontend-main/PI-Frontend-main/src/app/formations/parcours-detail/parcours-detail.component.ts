import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParcoursService } from '../services/parcours.service';
import { QuizNiveauService } from '../services/quiz-niveau.service';
import { ParcoursFormation, InscriptionParcours, NIVEAUX_LABELS, NIVEAUX_ORDERED, NiveauOrdre } from '../models/parcours.model';
import { QuizHistorique } from '../models/quiz.model';
import { Formation } from '../models/formation.model';
import { FormationService } from '../services/formation.service';

@Component({
  selector: 'app-parcours-detail',
  standalone: false,
  templateUrl: './parcours-detail.component.html',
  styleUrls: ['./parcours-detail.component.scss']
})
export class ParcoursDetailComponent implements OnInit {

  parcours: ParcoursFormation | null = null;
  inscription: InscriptionParcours | null = null;
  formationActuelle: Formation | null = null;
  candidatId: number | null = null;
  loading = true;

  NIVEAUX = NIVEAUX_ORDERED;
  LABELS = NIVEAUX_LABELS;
  isAdmin = false;
  errorMsg: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parcoursService: ParcoursService,
    private quizService: QuizNiveauService,
    private formationService: FormationService
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('userRole') || '').toUpperCase().replace('ROLE_', '');
    this.isAdmin = role === 'ADMIN';

    const parcoursId = Number(this.route.snapshot.paramMap.get('id'));
    if (!parcoursId) { this.router.navigate(['/formations/parcours']); return; }

    this.resolveCandidatId(() => {
      this.parcoursService.getById(parcoursId).subscribe({
        next: (p) => {
          this.parcours = p;
          this.loadInscription(parcoursId);
        },
        error: () => { this.loading = false; }
      });
    });
  }

  private resolveCandidatId(onResolved?: () => void): void {
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
        const id = Number(payload.id);
        if (!Number.isNaN(id) && id > 0) {
          this.candidatId = id;
          localStorage.setItem('candidatId', String(id));
          onResolved?.();
          return;
        }
      } catch (e) {}
    }

    const email = localStorage.getItem('userName') || '';
    const role  = (localStorage.getItem('userRole') || '').toUpperCase().replace(/^ROLE_/, '');
    if (!email || role !== 'CANDIDAT') {
      onResolved?.(); 
      return;
    }

    this.formationService.getCandidatByEmail(email).subscribe({
      next: (candidat) => {
        if (candidat?.id) {
          this.candidatId = Number(candidat.id);
          localStorage.setItem('candidatId', String(candidat.id));
          onResolved?.();
        } else {
          onResolved?.();
        }
      },
      error: () => { onResolved?.(); }
    });
  }

  private loadInscription(parcoursId: number): void {
    if (!this.candidatId) { this.loading = false; return; }

    this.parcoursService.getInscription(this.candidatId, parcoursId).subscribe({
      next: (insc) => {
        console.log('📦 Inscription chargée:', insc);
        this.inscription = insc;
        this.loadFormationActuelle(insc.id);
        this.loadQuizHistorique(insc.id);
      },
      error: (err) => {
        console.warn('Erreur lors du chargement de l\'inscription directe, tentative de fallback via la liste...', err);
        // Fallback: Si le GET direct échoue (ex: 500 lazy loading), on tente de trouver l'inscription dans la liste du candidat
        this.parcoursService.getInscriptionsCandidatParcours(this.candidatId!).subscribe({
          next: (inscriptions) => {
            const found = inscriptions.find(i => i.parcours.id === parcoursId);
            if (found) {
              this.inscription = found;
              this.loadFormationActuelle(found.id);
              this.loadQuizHistorique(found.id);
            } else {
              this.loading = false;
            }
          },
          error: () => { this.loading = false; }
        });
      }
    });
  }

  private loadFormationActuelle(inscriptionId: number): void {
    this.parcoursService.getFormationActuelle(inscriptionId).subscribe({
      next: (f) => { this.formationActuelle = f; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  private loadQuizHistorique(inscriptionId: number): void {
  }

  inscrire(): void {
    if (!this.candidatId) {
      // Si non connecté, on redirige vers login (qui est HomeDemoOneComponent selon routes)
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (!this.parcours) return;
    this.parcoursService.inscrire(this.candidatId, this.parcours.id).subscribe({
      next: (insc) => {
        this.inscription = insc;
        this.loadFormationActuelle(insc.id);
        this.errorMsg = null;
      },
      error: (err) => {
        console.error('Erreur inscription:', err);
        
        // Extraction du message d'erreur du backend
        const serverMsg = err.error?.message || err.error?.error || '';
        
        // Cas particulier : Le candidat est déjà inscrit mais le serveur renvoie 500
        if (serverMsg.includes('déjà inscrit')) {
          console.log('Candidat déjà inscrit détecté (bypass 500). Chargement de l\'état existant...');
          this.loadInscription(this.parcours!.id);
          this.errorMsg = null;
          return;
        }

        if (err.status === 500) {
          this.errorMsg = "Impossible de s'inscrire. Vérifiez que toutes les formations de ce parcours sont disponibles.";
        } else {
          this.errorMsg = "Une erreur est survenue lors de l'inscription.";
        }
      }
    });
  }

  getNiveauIndex(niveau: NiveauOrdre): number {
    return NIVEAUX_ORDERED.indexOf(niveau);
  }

  isNiveauCompleted(niveau: NiveauOrdre): boolean {
    if (!this.inscription) return false;
    // Si le cours est "TERMINE", tous les niveaux sont complétés
    if (this.inscription.statut === 'TERMINE') return true;
    return this.getNiveauIndex(this.inscription.niveauActuel) > this.getNiveauIndex(niveau);
  }

  isNiveauCurrent(niveau: NiveauOrdre): boolean {
    if (!this.inscription) return false;
    if (this.inscription.statut === 'TERMINE') return false;
    return this.inscription.niveauActuel === niveau;
  }

  isNiveauLocked(niveau: NiveauOrdre): boolean {
    if (!this.inscription) return true;
    if (this.inscription.statut === 'TERMINE') return false;
    return this.getNiveauIndex(this.inscription.niveauActuel) < this.getNiveauIndex(niveau);
  }

  isParcoursTermine(): boolean {
    return this.inscription?.statut === 'TERMINE';
  }

  isFeedbackPending(): boolean {
    return this.inscription?.evaluationParcoursRequise === true;
  }

  allerAuFeedback(): void {
    if (this.parcours) {
      this.router.navigate(['/formations/parcours', this.parcours.id, 'feedback']);
    }
  }

  getFormationForNiveau(niveau: NiveauOrdre): Formation | null {
    if (!this.parcours) return null;
    switch (niveau) {
      case 'DEBUTANT':       return this.parcours.niveauDebutant || null;
      case 'INTERMEDIAIRE':  return this.parcours.niveauIntermediaire || null;
      case 'AVANCE':         return this.parcours.niveauAvance || null;
      case 'EXPERT':         return this.parcours.niveauExpert || null;
      default: return null;
    }
  }

  accederFormation(niv?: NiveauOrdre): void {
    const targetNiv = niv || this.inscription?.niveauActuel;
    if (!targetNiv) return;

    // On ne peut accéder qu'aux niveaux non verrouillés
    if (this.isNiveauLocked(targetNiv)) return;

    const f = this.getFormationForNiveau(targetNiv);
    if (f) {
      this.router.navigate(['/formations', f.id], {
        queryParams: {
          parcoursId: this.parcours?.id,
          niveau: targetNiv,
          completed: this.isNiveauCompleted(targetNiv)
        }
      });
    }
  }

  passerQuiz(): void {
    if (!this.parcours || !this.inscription) return;
    const currentNiv = this.inscription.niveauActuel;
    
    if (currentNiv === 'EXPERT') {
      const f = this.getFormationForNiveau('EXPERT');
      if (f) {
        this.router.navigate(['/formations', f.id], {
          queryParams: {
            parcoursId: this.parcours.id,
            niveau: 'EXPERT'
          }
        });
        return;
      }
    }
    
    this.router.navigate(['/formations/parcours', this.parcours.id, 'quiz', currentNiv]);
  }

  getIconEmoji(cat: string): string {
    const map: any = {
      'Développement': '💻', 'Frontend': '⚛️', 'Backend': '⚙️',
      'Design': '🎨', 'Marketing': '📈', 'Data Science': '📊', 'Data': '📊',
      'IA': '🤖', 'Mobile': '📱',
      'Finance': '💰', 'Langues': '🌎', 'Soft Skills': '🤝', 'DevOps': '🐳'
    };
    return map[cat] || '📚';
  }

  getCatClass(cat: string): string {
    return 'cat-dev';
  }

  getParcoursPlatform(): string {
    if (!this.parcours) return 'MatchyKhedma Platform';
    const f = this.parcours.niveauDebutant || 
              this.parcours.niveauIntermediaire || 
              this.parcours.niveauAvance || 
              this.parcours.niveauExpert;
    return f?.plateforme || 'MatchyKhedma Platform';
  }

  getNiveauBadge(niv: string): string {
    switch (niv?.toUpperCase()) {
      case 'DÉBUTANT': return 'badge-green';
      case 'INTERMÉDIAIRE': return 'badge-blue';
      case 'AVANCÉ': return 'badge-amber';
      case 'EXPERT': return 'badge-purple';
      default: return 'badge-grey';
    }
  }

  getParcoursBadge(): string | null {
    if (!this.parcours) return null;
    return this.parcours.niveauDebutant?.badge 
        || this.parcours.niveauIntermediaire?.badge 
        || this.parcours.niveauAvance?.badge 
        || this.parcours.niveauExpert?.badge 
        || null;
  }

  getBadgeColor(badge: string | null): string {
    const map: Record<string, string> = {
      'Tendance':       'badge-purple',
      'Populaire':      'badge-blue',
      'Top noté':       'badge-green',
      'Bien noté':      'badge-teal',
      'En progression': 'badge-amber'
    };
    return badge ? (map[badge] || 'badge-gray') : '';
  }

  getParcoursIcon(badge: string | null): string {
    const map: Record<string, string> = {
      'Tendance':       '🔥',
      'Populaire':      '⭐',
      'Top noté':       '🏆',
      'Bien noté':      '👍',
      'En progression': '📈'
    };
    return badge ? (map[badge] || '') : '';
  }
}
