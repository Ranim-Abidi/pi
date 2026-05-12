import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizNiveauService } from '../services/quiz-niveau.service';
import { ParcoursService } from '../services/parcours.service';
import { QuizNiveau, QuizResultat, QuizGenerationRequest, QuizSoumissionDTO } from '../models/quiz.model';
import { NiveauOrdre, NIVEAUX_LABELS } from '../models/parcours.model';

@Component({
  selector: 'app-quiz-niveau',
  standalone: false,
  templateUrl: './quiz-niveau.component.html',
  styleUrls: ['./quiz-niveau.component.scss']
})
export class QuizNiveauComponent implements OnInit {

  // State
  phase: 'loading' | 'quiz' | 'resultat' = 'loading';
  quiz: QuizNiveau | null = null;
  resultat: QuizResultat | null = null;
  isReviewMode: boolean = false;
  error: string = '';

  // Quiz navigation
  currentQuestionIndex = 0;
  reponses: { [key: number]: string } = {};
  submitting = false;

  // Route params
  parcoursId: number = 0;
  niveau: NiveauOrdre = 'DEBUTANT';
  inscriptionParcoursId: number = 0;
  parcours: any = null;

  LABELS = NIVEAUX_LABELS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizNiveauService,
    private parcoursService: ParcoursService
  ) {}

  ngOnInit(): void {
    this.parcoursId = Number(this.route.snapshot.paramMap.get('parcoursId'));
    this.niveau = (this.route.snapshot.paramMap.get('niveau') || 'DEBUTANT') as NiveauOrdre;

    // Check if we are in review mode
    const reviewId = this.route.snapshot.queryParamMap.get('reviewId');
    if (reviewId) {
      this.isReviewMode = true;
      this.loadResultat(Number(reviewId));
      return;
    }

    // Normal quiz mode: get inscription ID
    const candidatId = Number(localStorage.getItem('candidatId'));
    if (!candidatId || !this.parcoursId) {
      this.error = 'Données manquantes. Veuillez vous connecter.';
      return;
    }

    this.parcoursService.getInscription(candidatId, this.parcoursId).subscribe({
      next: (insc) => {
        this.inscriptionParcoursId = insc.id;
        this.parcours = insc.parcours;
        this.genererQuiz(insc);
      },
      error: () => {
        this.error = 'Inscription au parcours non trouvée.';
      }
    });
  }

  private loadResultat(quizId: number): void {
    this.phase = 'loading';
    
    // Charger le résultat
    this.quizService.getResultat(quizId).subscribe({
      next: (res) => {
        this.resultat = res;
        this.niveau = res.niveau;
        this.phase = 'resultat';
        this.inscriptionParcoursId = res.inscriptionId;

        // Charger l'inscription pour avoir les infos du parcours (titres, etc.)
        const candidatId = Number(localStorage.getItem('candidatId'));
        if (candidatId) {
          this.parcoursService.getInscription(candidatId, this.parcoursId).subscribe({
            next: (insc) => this.parcours = insc.parcours
          });
        }
      },
      error: (err) => {
        this.error = err.error?.error || 'Erreur lors du chargement du résultat.';
        this.phase = 'resultat';
      }
    });
  }

  private genererQuiz(insc: any): void {
    this.phase = 'loading';

    // Get formation title for the prompt
    let titreFormation = '';
    const parcours = insc.parcours;
    if (parcours) {
      const formationMap: Record<string, any> = {
        DEBUTANT: parcours.niveauDebutant,
        INTERMEDIAIRE: parcours.niveauIntermediaire,
        AVANCE: parcours.niveauAvance,
        EXPERT: parcours.niveauExpert
      };
      const formation = formationMap[this.niveau];
      titreFormation = formation?.titre || parcours.titre || 'Formation';
    }

    const req: QuizGenerationRequest = {
      inscriptionParcoursId: this.inscriptionParcoursId,
      niveau: this.niveau,
      titreFormation: titreFormation,
      nombreQuestions: 10
    };

    this.quizService.genererQuiz(req).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.currentQuestionIndex = 0;
        this.reponses = {};
        this.phase = 'quiz';
      },
      error: (err) => {
        const errorMsg = err.error?.error || '';
        if (errorMsg.startsWith('ALREADY_PASSED:')) {
          const quizId = Number(errorMsg.split(':')[1]);
          if (quizId > 0) {
            this.isReviewMode = true;
            this.loadResultat(quizId);
            return;
          }
        }
        this.error = errorMsg || 'Erreur lors de la génération du quiz.';
        this.phase = 'quiz';
      }
    });
  }

  // ── Navigation Quiz ────────────────────────────────────
  get currentQuestion() {
    return this.quiz?.questions?.[this.currentQuestionIndex] || null;
  }

  get totalQuestions(): number {
    return this.quiz?.questions?.length || 0;
  }

  get progressPercent(): number {
    const answered = Object.keys(this.reponses).length;
    return this.totalQuestions > 0 ? Math.round((answered / this.totalQuestions) * 100) : 0;
  }

  get allAnswered(): boolean {
    return Object.keys(this.reponses).length === this.totalQuestions;
  }

  selectReponse(questionId: number, choix: string): void {
    // Extract the letter (A, B, C, D) from the choice text
    const letter = choix.charAt(0);
    this.reponses[questionId] = letter;
  }

  isSelected(questionId: number, choix: string): boolean {
    const letter = choix.charAt(0);
    return this.reponses[questionId] === letter;
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex > 0) this.currentQuestionIndex--;
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.totalQuestions - 1) this.currentQuestionIndex++;
  }

  goToQuestion(index: number): void {
    this.currentQuestionIndex = index;
  }

  // ── Soumission ─────────────────────────────────────────
  soumettre(): void {
    if (!this.quiz || !this.allAnswered || this.submitting) return;
    this.submitting = true;

    const dto: QuizSoumissionDTO = {
      quizNiveauId: this.quiz.id,
      reponses: this.reponses
    };

    this.quizService.soumettre(dto).subscribe({
      next: (resultat) => {
        this.resultat = resultat;
        this.phase = 'resultat';
        this.submitting = false;

        // Stockage tempo de l'id d'inscription pour les composants de feedback
        localStorage.setItem('currentParcoursInscription', JSON.stringify({
          id: this.inscriptionParcoursId,
          parcoursId: this.parcoursId
        }));
      },
      error: (err) => {
        this.error = err.error?.error || 'Erreur lors de la soumission.';
        this.submitting = false;
      }
    });
  }


  // ── Résultat actions ──────────────────────────────────
  reessayer(): void {
    this.resultat = null;
    this.error = '';
    this.quiz = null;
    this.reponses = {};

    const candidatId = Number(localStorage.getItem('candidatId'));
    this.parcoursService.getInscription(candidatId, this.parcoursId).subscribe({
      next: (insc) => this.genererQuiz(insc)
    });
  }

  niveauSuivant(): void {
    if (!this.resultat) return;

    // Gestion du niveau suivant
    if (this.resultat.reussi && this.resultat.niveauSuivantDebloque && this.parcours) {
      const nextNiv = this.resultat.niveauSuivantDebloque;
      
      const formationMap: Partial<Record<NiveauOrdre, any>> = {
        INTERMEDIAIRE: this.parcours.niveauIntermediaire,
        AVANCE:        this.parcours.niveauAvance,
        EXPERT:        this.parcours.niveauExpert
      };
      
      const nextFormation = formationMap[nextNiv];
      if (nextFormation) {
        this.router.navigate(['/formations', nextFormation.id], {
          queryParams: {
            parcoursId: this.parcours.id,
            niveau: nextNiv
          }
        });
        return;
      }
    }
    
    this.router.navigate(['/formations/parcours', this.parcoursId]);
  }

  retourParcours(): void {
    this.router.navigate(['/formations/parcours', this.parcoursId]);
  }
}
