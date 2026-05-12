import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ParcoursService } from '../services/parcours.service';
import { FeedbackService } from '../services/feedback.service';

@Component({
  selector: 'app-macro-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="feedback-page">
      <div class="feedback-card">

        <!-- HEADER GRADIENT -->
        <header class="card-header">
          <div class="header-inner">
            <div class="header-top">
              <div class="badge-row">
                <span class="status-badge">{{ isTransition ? 'Transition Niveau Expert' : 'Parcours complet' }}</span>
              </div>
              <a [routerLink]="['/formations/parcours', parcoursId]" class="btn-back-header">
                <i class="bi bi-arrow-left"></i> Retour
              </a>
            </div>
            <h1>Votre expérience sur ce parcours</h1>
            <p class="subtitle">
              Votre avis nous est précieux pour améliorer nos contenus. 
              Merci de partager votre ressenti global !
            </p>
          </div>
        </header>

        <!-- PROGRESS BAR -->
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="calculateProgress()"></div>
          </div>
          <span class="progress-label">{{ completedSteps() }} / 4 complétés</span>
        </div>

        <!-- FORM BODY -->
        <main class="form-body">

          <section class="question-block">
            <label class="section-label center-label">Note globale du parcours</label>
            <div class="stars-centered">
              <span *ngFor="let s of [1,2,3,4,5]" 
                    (click)="formData.noteGlobale = s"
                    [class.active]="formData.noteGlobale >= s">★</span>
            </div>
          </section>

          <div class="divider"></div>

          <section class="question-block">
            <label class="section-label">La progression entre les niveaux était...</label>
            <div class="chips-grid">
              <button *ngFor="let opt of progressionOptions"
                      [class.active]="formData.progression === opt"
                      (click)="formData.progression = opt">
                {{ opt }}
              </button>
            </div>
          </section>

          <div class="divider"></div>

          <section class="question-block">
            <label class="section-label">Les quiz de validation étaient...</label>
            <div class="chips-grid">
              <button *ngFor="let opt of quizOptions"
                      [class.active]="formData.experienceQuiz === opt"
                      (click)="formData.experienceQuiz = opt">
                {{ opt }}
              </button>
            </div>
          </section>

          <div class="divider"></div>

          <section class="question-block">
            <label class="section-label">Recommanderiez-vous ce parcours ?</label>
            <div class="chips-grid">
              <button *ngFor="let opt of recommandationOptions"
                      [class.active]="formData.recommandation === opt"
                      (click)="formData.recommandation = opt">
                {{ opt }}
              </button>
            </div>
          </section>

          <div class="divider"></div>

          <section class="question-block">
            <div class="label-row">
              <label class="section-label" style="margin-bottom:0">Commentaire libre</label>
              <span class="optional-badge">Optionnel</span>
            </div>
            <textarea [(ngModel)]="formData.commentaireLibre" 
                      maxlength="500"
                      placeholder="Ce que vous avez le plus apprécié, ce qui pourrait être amélioré..."></textarea>
            <div class="char-count">{{ formData.commentaireLibre.length }} / 500</div>
          </section>

        </main>

        <!-- FOOTER -->
        <footer class="card-footer">
          <p class="footer-hint">
            <i class="bi bi-heart-fill" style="color: #ef4444"></i>
            Merci de nous aider à nous améliorer !
          </p>
          <button class="btn-certif" 
                  [disabled]="!isFormValid() || submitting"
                  (click)="submit()">
            <i class="bi bi-chat-heart" *ngIf="!submitting"></i>
            <i class="bi bi-arrow-repeat spin" *ngIf="submitting"></i>
            {{ submitting ? 'Envoi en cours...' : 'Partager mon avis' }}
          </button>
        </footer>

      </div>

      <!-- MODAL SUCCESS -->
      <div class="success-modal-overlay" *ngIf="showSuccessModal">
        <div class="success-modal">
          <div class="modal-icon">
            🏆
          </div>
          <h3>Félicitations !</h3>
          <p>Votre certificat de parcours est désormais disponible dans votre espace personnel.</p>
          <button class="btn-consulter" (click)="goToCertificates()">
            Consulter mon certificat
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

    /* MODAL CSS */
    .success-modal-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .success-modal {
      background: white;
      padding: 40px;
      border-radius: 24px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-icon {
      width: 80px; height: 80px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
      font-size: 40px;
    }
    .success-modal h3 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 12px;
    }
    .success-modal p {
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .btn-consulter {
      background: #0ea5e9;
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
    }
    .btn-consulter:hover {
      background: #0284c7;
      transform: translateY(-2px);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    :host { display: block; }

    .feedback-page {
      min-height: 100vh;
      background: #f8fafc;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 16px 80px;
      font-family: 'Inter', sans-serif;
    }

    .feedback-card {
      background: #fff;
      width: 100%;
      max-width: 620px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
    }

    /* ── HEADER ── */
    .card-header {
      background: linear-gradient(135deg, #0965a4 0%, #06b6d4 100%);
      padding: 32px 32px 28px;
      position: relative;
      overflow: hidden;
    }
    .card-header::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 60%),
                  radial-gradient(circle at bottom left, rgba(255,255,255,0.06), transparent 50%);
    }
    .header-inner { position: relative; z-index: 1; }
    .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }

    .btn-back-header {
      background: rgba(255,255,255,0.15);
      color: #fff;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(255,255,255,0.25);
      transition: all 0.2s;
    }
    .btn-back-header:hover {
      background: #fff;
      color: #0965a4;
      transform: translateX(-4px);
    }

    .badge-row { margin: 0; }
    .status-badge {
      background: rgba(255,255,255,0.22);
      color: #fff;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 800;
      border: 1px solid rgba(255,255,255,0.35);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    h1 { margin: 0 0 6px; color: #fff; font-size: 1.75rem; font-weight: 900; letter-spacing: -0.8px; }
    .subtitle { color: rgba(255,255,255,0.82); font-size: 0.92rem; margin: 0; line-height: 1.5; }

    /* ── PROGRESS ── */
    .progress-section {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 28px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
    }
    .progress-bar {
      flex: 1;
      height: 8px;
      background: #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0965a4, #06b6d4, #0965a4);
      background-size: 200% 100%;
      animation: gradientMove 3s linear infinite;
      transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: 6px;
    }
    @keyframes gradientMove { from { background-position: 100% 0; } to { background-position: -100% 0; } }
    .progress-label { font-size: 0.78rem; font-weight: 800; color: #94a3b8; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── FORM BODY ── */
    .form-body { padding: 8px 0; }

    .question-block { padding: 24px 28px; }

    .divider { height: 1px; background: #f1f5f9; margin: 0; }

    .section-label {
      display: block;
      margin-bottom: 14px;
      font-weight: 800;
      font-size: 0.9rem;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .center-label { text-align: center; }

    /* Stars */
    .stars-centered {
      display: flex;
      justify-content: center;
      gap: 8px;
      font-size: 2.6rem;
      color: #e2e8f0;
      cursor: pointer;
      margin: 4px 0 8px;
    }
    .stars-centered span { transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .stars-centered span:hover { transform: scale(1.35); }
    .stars-centered span.active {
      color: #f59e0b;
      transform: scale(1.2);
      filter: drop-shadow(0 3px 8px rgba(245,158,11,0.45));
    }

    /* Chips */
    .chips-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .chips-grid button {
      padding: 10px 18px;
      border: 2px solid #f1f5f9;
      background: #f8fafc;
      border-radius: 12px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.25s;
      font-family: 'Inter', sans-serif;
    }
    .chips-grid button:hover {
      border-color: #0965a4;
      color: #0965a4;
      background: #f0f9ff;
      transform: translateY(-2px);
    }
    .chips-grid button.active {
      background: linear-gradient(135deg, #0965a4, #06b6d4);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 6px 16px rgba(9,101,164,0.3);
      transform: translateY(-2px);
    }

    /* Label row */
    .label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .optional-badge {
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 700;
      background: #f1f5f9;
      padding: 3px 10px;
      border-radius: 8px;
    }

    /* Textarea */
    textarea {
      width: 100%;
      min-height: 110px;
      padding: 14px 16px;
      border: 2px solid #f1f5f9;
      border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 0.93rem;
      line-height: 1.6;
      resize: none;
      transition: all 0.2s;
      color: #334155;
      background: #f8fafc;
      box-sizing: border-box;
    }
    textarea:focus {
      border-color: #0965a4;
      outline: none;
      background: #fff;
      box-shadow: 0 0 0 4px rgba(9,101,164,0.08);
    }
    textarea::placeholder { color: #94a3b8; }
    .char-count { text-align: right; font-size: 0.72rem; color: #94a3b8; margin-top: 6px; font-weight: 700; }

    /* ── FOOTER ── */
    .card-footer {
      padding: 20px 28px 28px;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .footer-hint {
      margin: 0;
      color: #94a3b8;
      font-size: 0.83rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .footer-hint i { color: #10b981; }

    .btn-certif {
      width: 100%;
      max-width: 400px;
      padding: 16px;
      border: none;
      border-radius: 16px;
      background: linear-gradient(135deg, #0965a4, #06b6d4);
      color: #fff;
      font-weight: 800;
      font-size: 1.05rem;
      cursor: pointer;
      transition: all 0.4s;
      box-shadow: 0 10px 28px rgba(9,101,164,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: 'Inter', sans-serif;
    }
    .btn-certif:hover:not(:disabled) {
      transform: translateY(-4px);
      box-shadow: 0 18px 40px rgba(9,101,164,0.5);
    }
    .btn-certif:disabled {
      opacity: 0.5;
      transform: none;
      box-shadow: none;
      filter: grayscale(0.4);
      cursor: not-allowed;
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class MacroFeedbackComponent implements OnInit {
  parcoursId!: number;
  submitting = false;

  formData: any = {
    noteGlobale: 0,
    progression: '',
    experienceQuiz: '',
    recommandation: '',
    commentaireLibre: ''
  };

  isTransition = false;
  nextNiveau: string | null = null;
  mode: string | null = null;
  formationId: number | null = null;

  progressionOptions = ['Très fluide', 'Correcte', 'Parfois abrupte', 'Trop rapide'];
  quizOptions = ['Très pertinents', 'Adaptés', 'Trop faciles', 'Trop difficiles'];
  recommandationOptions = ['Absolument', 'Probablement', 'Pas sûr(e)', 'Non'];
  
  showSuccessModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private parcoursService: ParcoursService,
    private feedbackService: FeedbackService
  ) {}

  ngOnInit(): void {
    this.parcoursId = Number(this.route.snapshot.paramMap.get('id'));
    
    // Charger l'inscription si elle n'est pas déjà en mémoire
    const candidatId = localStorage.getItem('candidatId') || JSON.parse(localStorage.getItem('user') || '{}').id;
    if (candidatId && this.parcoursId) {
      this.parcoursService.getInscription(Number(candidatId), this.parcoursId).subscribe({
        next: (insc) => {
          localStorage.setItem('currentParcoursInscription', JSON.stringify(insc));
          
          // Charger le feedback existant s'il y en a un
          if (insc && insc.id) {
            this.feedbackService.getMacroByInscription(insc.id).subscribe({
              next: (feedback) => {
                if (feedback) {
                  this.formData = {
                    noteGlobale: feedback.noteGlobale || 0,
                    progression: feedback.progression || '',
                    experienceQuiz: feedback.experienceQuiz || '',
                    recommandation: feedback.recommandation || '',
                    commentaireLibre: feedback.commentaireLibre || ''
                  };
                }
              },
              error: (err) => console.log("Pas de feedback existant ou erreur:", err)
            });
          }
        },
        error: (err) => console.error("Erreur chargement inscription feedback:", err)
      });
    }

    this.route.queryParams.subscribe(params => {
      this.mode = params['mode'] || null;
      this.formationId = params['formationId'] ? Number(params['formationId']) : null;
      
      this.isTransition = params['from'] === 'quiz' && params['niveau'] === 'AVANCE';
      this.nextNiveau = params['nextNiveau'] || null;
    });
  }

  completedSteps(): number {
    let count = 0;
    if (this.formData.noteGlobale > 0) count++;
    if (this.formData.progression !== '') count++;
    if (this.formData.experienceQuiz !== '') count++;
    if (this.formData.recommandation !== '') count++;
    return count;
  }

  calculateProgress(): number {
    return (this.completedSteps() / 4) * 100;
  }

  isFormValid(): boolean {
    return this.completedSteps() === 4;
  }

  submit(): void {
    if (!this.isFormValid()) return;

    const userStr = localStorage.getItem('user');
    const candidatId = localStorage.getItem('candidatId');
    const user = userStr ? JSON.parse(userStr) : {};
    
    const inscriptionStr = localStorage.getItem('currentParcoursInscription');
    const inscription = inscriptionStr ? JSON.parse(inscriptionStr) : {};

    const finalCandidatId = user.id || candidatId;

    if (!finalCandidatId || !inscription.id) {
       console.error("Session data missing:", { finalCandidatId, inscriptionId: inscription.id });
       alert("Erreur de session. Veuillez vous reconnecter.");
       return;
    }

    this.submitting = true;
    const payload = {
      ...this.formData,
      candidatId: Number(finalCandidatId),
      parcoursId: this.parcoursId,
      inscriptionId: Number(inscription.id)
    };

    this.http.post(`${environment.apiUrl}/feedbacks/macro`, payload)
      .subscribe({
        next: () => {
          // Mettre à jour l'état local avant de naviguer
          const inscriptionStr = localStorage.getItem('currentParcoursInscription');
          if (inscriptionStr) {
            const ins = JSON.parse(inscriptionStr);
            ins.evaluationParcoursRequise = false;
            localStorage.setItem('currentParcoursInscription', JSON.stringify(ins));
          }
          
          // Afficher le modal de succès
          this.submitting = false;
          this.showSuccessModal = true;
        },
        error: (err) => {
          console.error(err);
          alert("Une erreur s'est produite lors de l'envoi.");
          this.submitting = false;
        }
      });
  }

  goToCertificates() {
    this.showSuccessModal = false;
    this.router.navigate(['/candidates-dashboard/mes-formations']);
  }
}
