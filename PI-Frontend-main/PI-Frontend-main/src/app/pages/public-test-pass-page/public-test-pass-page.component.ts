import { CommonModule } from '@angular/common';
import { Component, HostListener, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../api.service';
import { SharedModule } from '../../shared/shared.module';

interface QuestionChoice {
  texte?: string;
  contenu?: string;
  correcte?: boolean;
  correct?: boolean;
}

interface TestQuestion {
  id: number;
  contenu?: string;
  question?: string;
  type?: string;
  points?: number;
  bonneReponse?: string;
  choix?: QuestionChoice[];
}

interface EntretienDetails {
  id?: number;
  titre?: string;
  description?: string;
  seuilReussite?: number | null;
  dureeMinutes?: number | null;
  decision?: string;
  score?: number;
  recruteur?: {
    id?: number;
    nom?: string;
    email?: string;
  };
}

interface CandidateAutoReport {
  generatedAt: Date;
  scoreGlobal: number;
  seuil: number;
  pointsForts: string[];
  pointsFaibles: string[];
  recommandations: Array<{ titre: string; raison: string; motCle: string }>;
}

@Component({
  selector: 'app-public-test-pass-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './public-test-pass-page.component.html',
  styleUrls: ['./public-test-pass-page.component.scss']
})
export class PublicTestPassPageComponent {
  private readonly attemptStoragePrefix = 'entretienAttempted_';
  private readonly defaultPassThresholdPercent = 60;
  entretienId = 0;
  entretienDetails: EntretienDetails | null = null;
  questions: TestQuestion[] = [];
  answers: Record<number, any> = {};
  loading = true;
  submitting = false;
  loadError = '';
  resultMessage = '';
  finalScorePercent: number | null = null;
  passedEntretien: boolean | null = null;
  requiredThresholdPercent = this.defaultPassThresholdPercent;
  showConsent = true;
  examStarted = false;
  dureeMinutes = 30;
  remainingSeconds = 30 * 60;
  violationDetected = false;
  violationReason = '';
  acknowledgingRules = false;
  isObscured = false;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  candidateReport: CandidateAutoReport | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id) || id <= 0) {
      this.loadError = 'ID entretien invalide.';
      this.loading = false;
      return;
    }

    this.entretienId = id;

    this.loadEntretienDetailsAndGuard();
  }

  private loadEntretienDetailsAndGuard(): void {
    this.apiService.getEntretien(this.entretienId).subscribe({
      next: (data: EntretienDetails) => {
        this.entretienDetails = data || null;
        this.requiredThresholdPercent = this.extractThresholdPercent(data);
        this.updateDurationFromEntretien(data);
        if (this.isBlockingCompletionState(data)) {
          this.markAttemptedLocally();
          this.loadError = 'Vous avez deja passe cet entretien. Une seconde tentative nest pas autorisee.';
          this.loading = false;
          return;
        }

        if (this.hasAttemptedLocally()) {
          localStorage.removeItem(`${this.attemptStoragePrefix}${this.entretienId}`);
        }

        this.loadQuestions();
      },
      error: () => {
        this.entretienDetails = null;
        this.loadError = 'Impossible de verifier la date de cet entretien. Veuillez reessayer plus tard.';
        this.loading = false;
      }
    });
  }

  private isInterviewInFuture(details: any): boolean {
    const raw = details?.dateEntretien || details?.date || details?.scheduledAt;
    if (!raw) {
      return false;
    }

    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now();
  }

  private isBackendMarkedCompleted(details: any): boolean {
    return details?.completed === true || details?.termine === true || details?.status === 'COMPLETED';
  }

  private isBlockingCompletionState(details: any): boolean {
    if (this.isInterviewInFuture(details)) {
      return false;
    }

    return this.isBackendMarkedCompleted(details);
  }

  private hasAttemptedLocally(): boolean {
    return localStorage.getItem(`${this.attemptStoragePrefix}${this.entretienId}`) === '1';
  }

  private markAttemptedLocally(): void {
    localStorage.setItem(`${this.attemptStoragePrefix}${this.entretienId}`, '1');
  }

  private loadQuestions(): void {
    this.loading = true;
    this.loadError = '';

    this.apiService.getQuestionsByEntretien(this.entretienId).subscribe({
      next: (data: TestQuestion[]) => {
        this.questions = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger les questions de cet entretien.';
        this.loading = false;
      }
    });
  }

  get recruiterEmail(): string {
    return (this.entretienDetails?.recruteur?.email || '').trim();
  }

  get recruiterName(): string {
    return (this.entretienDetails?.recruteur?.nom || 'le recruteur').trim();
  }

  get examTitle(): string {
    return (this.entretienDetails?.titre || 'Entretien test').trim();
  }

  async startExam(): Promise<void> {
    if (this.examStarted || this.submitting || this.violationDetected) {
      return;
    }

    this.acknowledgingRules = true;
    this.showConsent = false;
    this.resultMessage = '';

    try {
      await this.enterFullscreen();
      this.startCountdown();
      this.examStarted = true;
    } catch {
      this.showConsent = true;
      this.resultMessage = 'Le plein ecran est obligatoire pour commencer cet entretien.';
    } finally {
      this.acknowledgingRules = false;
    }
  }

  private async enterFullscreen(): Promise<void> {
    const element = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };

    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return;
    }

    if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
      return;
    }

    if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
      return;
    }

    throw new Error('Fullscreen not supported');
  }

  private isShortcutBlocked(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    const blockedWithoutModifier = ['f12', 'escape'];

    if (blockedWithoutModifier.includes(key)) {
      return true;
    }

    if (!ctrlOrMeta) {
      return false;
    }

    const blockedWithCtrl = ['c', 'v', 'x', 'u', 's', 'p', 'r'];
    if (event.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 's')) {
      return true;
    }

    return blockedWithCtrl.includes(key);
  }

  private registerViolation(reason: string): void {
    if (!this.examStarted || this.violationDetected || this.submitting) {
      return;
    }

    this.violationDetected = true;
    this.violationReason = reason;
    this.resultMessage = `Comportement suspect detecte: ${reason}. L'entretien est refuse automatiquement.`;
    this.forceExitFullscreen();
    this.submitWithPenalty(reason);
  }

  private submitWithPenalty(reason: string): void {
    this.submitting = true;
    this.stopCountdown();

    this.apiService.submitEntretienResponses(this.entretienId, 0).subscribe({
      next: () => {
        this.markAttemptedLocally();
        this.finalScorePercent = 0;
        this.passedEntretien = false;
        this.candidateReport = this.buildCandidateReport(0);
        this.resultMessage = `Comportement suspect detecte: ${reason}. Votre entretien a ete refuse automatiquement.`;
        this.notifyRecruiter(reason);
        this.submitting = false;
      },
      error: () => {
        this.finalScorePercent = 0;
        this.passedEntretien = false;
        this.candidateReport = this.buildCandidateReport(0);
        this.resultMessage = `Comportement suspect detecte: ${reason}. L'enregistrement backend a echoue, mais l'entretien est marque comme refuse.`;
        this.notifyRecruiter(reason);
        this.submitting = false;
      }
    });
  }

  private notifyRecruiter(reason: string): void {
    const receiverEmail = this.recruiterEmail;
    if (!receiverEmail) {
      return;
    }

    const subject = `Alerte triche - entretien #${this.entretienId}`;
    const content = [
      `Une triche potentielle a ete detectee pendant ${this.examTitle}.`,
      `Motif: ${reason}.`,
      'L\'entretien a ete refuse automatiquement avec un score de 0%.'
    ].join(' ');

    this.apiService.sendMessage({
      receiverEmail,
      receiverName: this.recruiterName,
      subject,
      contenu: content
    }).subscribe({
      error: () => {
        // Notification best-effort: the refusal has already been recorded.
      }
    });
  }

  private forceExitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  getQuestionText(question: TestQuestion): string {
    return (question.contenu || question.question || '').trim() || 'Question';
  }

  getChoiceText(choice: QuestionChoice): string {
    return (choice?.texte || choice?.contenu || '').trim();
  }

  isQcm(question: TestQuestion): boolean {
    return (question.type || '').toUpperCase() === 'QCM';
  }

  toggleQcmSelection(questionId: number, choiceIndex: number): void {
    const selected: number[] = Array.isArray(this.answers[questionId]) ? [...this.answers[questionId]] : [];
    const pos = selected.indexOf(choiceIndex);
    if (pos >= 0) {
      selected.splice(pos, 1);
    } else {
      selected.push(choiceIndex);
    }
    this.answers[questionId] = selected;
  }

  isSelectedQcm(questionId: number, choiceIndex: number): boolean {
    const selected: number[] = Array.isArray(this.answers[questionId]) ? this.answers[questionId] : [];
    return selected.includes(choiceIndex);
  }

  submitTest(): void {
    this.submitTestInternal(false);
  }

  private submitTestInternal(timeoutReached: boolean): void {
    if (this.questions.length === 0 || this.submitting || this.violationDetected) {
      return;
    }

    this.submitting = true;
    this.stopCountdown();
    const score = this.computeScorePercent();
    this.candidateReport = this.buildCandidateReport(score);
    const reportText = this.buildReportText(this.candidateReport);

    this.apiService.submitEntretienResponses(this.entretienId, score, reportText).subscribe({
      next: (response: any) => {
        this.markAttemptedLocally();
        this.finalScorePercent = score;
        this.requiredThresholdPercent = this.extractThresholdPercent(response);
        this.passedEntretien = this.extractDecisionFromResponse(response, score, this.requiredThresholdPercent);
        this.resultMessage = this.passedEntretien
          ? `${timeoutReached ? 'Temps ecoule. ' : ''}Felicitations, vous avez reussi l'entretien avec ${score.toFixed(2)}%.`
          : `${timeoutReached ? 'Temps ecoule. ' : ''}Vous n'avez pas atteint le seuil de reussite (${this.requiredThresholdPercent}%). Score obtenu: ${score.toFixed(2)}%.`;
        this.examStarted = false;
        this.forceExitFullscreen();
        this.submitting = false;
      },
      error: () => {
        this.finalScorePercent = score;
        this.passedEntretien = score >= this.requiredThresholdPercent;
        this.resultMessage = `${timeoutReached ? 'Temps ecoule. ' : ''}Le score local est calcule mais lenregistrement backend a echoue.`;
        this.examStarted = false;
        this.forceExitFullscreen();
        this.submitting = false;
      }
    });
  }

  get remainingTimeLabel(): string {
    const safeSeconds = Math.max(0, this.remainingSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.remainingSeconds = this.dureeMinutes * 60;

    this.timerInterval = setInterval(() => {
      if (!this.examStarted || this.submitting || this.violationDetected) {
        return;
      }

      if (this.remainingSeconds <= 1) {
        this.remainingSeconds = 0;
        this.submitTestInternal(true);
        return;
      }

      this.remainingSeconds -= 1;
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private extractDecisionFromResponse(response: any, fallbackScore: number, threshold: number): boolean {
    const decisionRaw = String(response?.decision || response?.statut || '').trim().toUpperCase();
    if (decisionRaw) {
      if (['ACCEPTE', 'ACCEPTER', 'REUSSI', 'SUCCESS', 'PASSED', 'VALIDE'].includes(decisionRaw)) {
        return true;
      }
      if (['REFUSE', 'ECHEC', 'FAILED', 'REJECTED', 'NON_REUSSI'].includes(decisionRaw)) {
        return false;
      }
    }

    const scoreFromResponse = Number(response?.score);
    if (Number.isFinite(scoreFromResponse)) {
      return scoreFromResponse >= threshold;
    }

    return fallbackScore >= threshold;
  }

  private extractThresholdPercent(source: any): number {
    const candidate = Number(source?.seuilReussite);
    if (Number.isFinite(candidate) && candidate >= 0 && candidate <= 100) {
      return candidate;
    }
    return this.requiredThresholdPercent || this.defaultPassThresholdPercent;
  }

  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: Event): void {
    if (!this.examStarted || this.violationDetected) {
      return;
    }

    event.preventDefault();
    this.registerViolation('clic droit bloque');
  }

  @HostListener('document:copy', ['$event'])
  onCopy(event: Event): void {
    if (!this.examStarted || this.violationDetected) {
      return;
    }

    event.preventDefault();
    this.registerViolation('copie bloque');
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: Event): void {
    if (!this.examStarted || this.violationDetected) {
      return;
    }

    event.preventDefault();
    this.registerViolation('collage bloque');
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.examStarted || this.violationDetected) {
      return;
    }

    const ctrl = event.ctrlKey || event.metaKey;
    if (event.key === 'PrintScreen' || (ctrl && event.shiftKey && event.key.toLowerCase() === 's') || event.key === 'Meta') {
      this.obscureScreen();
    }

    if (this.isShortcutBlocked(event)) {
      event.preventDefault();
      event.stopPropagation();
      this.registerViolation(`raccourci interdit: ${event.key}`);
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyup(event: KeyboardEvent): void {
    if (!this.examStarted || this.violationDetected) {
      return;
    }

    if (event.key === 'PrintScreen') {
      navigator.clipboard.writeText('');
      this.obscureScreen();
      this.registerViolation('capture d\'écran interdite');
    }
  }

  private obscureScreen(): void {
    this.ngZone.run(() => {
      this.isObscured = true;
      setTimeout(() => {
        this.isObscured = false;
      }, 3000);
    });
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    if (this.examStarted && !this.violationDetected) {
      this.registerViolation('changement de fenetre detecte');
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (this.examStarted && !this.violationDetected && document.hidden) {
      this.registerViolation('changement d onglet detecte');
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    if (this.examStarted && !this.violationDetected && !document.fullscreenElement) {
      this.registerViolation('sortie du plein ecran detectee');
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.examStarted && !this.violationDetected && !this.submitting) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private computeScorePercent(): number {
    let total = 0;
    let earned = 0;

    for (const q of this.questions) {
      const pts = q.points && q.points > 0 ? q.points : 1;
      total += pts;
      if (this.isCorrectAnswer(q)) {
        earned += pts;
      }
    }

    if (total <= 0) {
      return 0;
    }
    return (earned / total) * 100;
  }

  private isCorrectAnswer(question: TestQuestion): boolean {
    const qId = question.id;
    const selected = this.answers[qId];
    const choices = Array.isArray(question.choix) ? question.choix : [];

    if (this.isQcm(question)) {
      const correctIndices = choices
        .map((c, i) => (c.correcte === true || c.correct === true ? i : -1))
        .filter(i => i >= 0)
        .sort((a, b) => a - b);

      const selectedIndices = (Array.isArray(selected) ? selected : [])
        .filter((i: number) => Number.isInteger(i))
        .sort((a: number, b: number) => a - b);

      if (correctIndices.length === 0) {
        return false;
      }

      return JSON.stringify(correctIndices) === JSON.stringify(selectedIndices);
    }

    if (typeof selected === 'number' && selected >= 0 && selected < choices.length) {
      const c = choices[selected];
      if (c && (c.correcte === true || c.correct === true)) {
        return true;
      }

      const choiceText = this.getChoiceText(c).toUpperCase();
      const expected = String(question.bonneReponse || '').trim().toUpperCase();
      return expected.length > 0 && choiceText === expected;
    }

    return false;
  }

  private buildCandidateReport(score: number): CandidateAutoReport {
    const correctSummaries: string[] = [];
    const incorrectSummaries: string[] = [];

    for (const q of this.questions) {
      const label = this.summarizeQuestionForReport(q);
      if (this.isCorrectAnswer(q)) {
        correctSummaries.push(label);
      } else {
        incorrectSummaries.push(label);
      }
    }

    const pointsForts = correctSummaries.slice(0, 5);
    const pointsFaibles = incorrectSummaries.slice(0, 5);
    const recommandations = this.generateRecommendations(pointsFaibles);

    return {
      generatedAt: new Date(),
      scoreGlobal: Number(score.toFixed(2)),
      seuil: this.requiredThresholdPercent,
      pointsForts,
      pointsFaibles,
      recommandations
    };
  }

  private generateRecommendations(pointsFaibles: string[]): Array<{ titre: string; raison: string; motCle: string }> {
    const joined = pointsFaibles.join(' ').toLowerCase();
    const rules: Array<{ key: string; titre: string; raison: string }> = [
      { key: 'angular', titre: 'Formation Angular', raison: 'Renforcer les composants, services, routing et RxJS.' },
      { key: 'typescript', titre: 'Formation TypeScript', raison: 'Mieux maitriser les types, interfaces et generics.' },
      { key: 'javascript', titre: 'Formation JavaScript avance', raison: 'Consolider la logique, async/await et closures.' },
      { key: 'java', titre: 'Formation Java/Spring', raison: 'Consolider Java backend et principes Spring Boot.' },
      { key: 'spring', titre: 'Formation Spring Boot API', raison: 'Ameliorer la conception API REST et securite.' },
      { key: 'api', titre: 'Formation API REST', raison: 'Mieux structurer routes, statuts et contrats API.' },
      { key: 'sql', titre: 'Formation SQL', raison: 'Ameliorer modelisation et requetes SQL.' },
      { key: 'database', titre: 'Formation Base de donnees', raison: 'Consolider relations, index et optimisation.' },
      { key: 'css', titre: 'Formation CSS/SCSS', raison: 'Renforcer mise en page responsive et architecture styles.' },
      { key: 'communication', titre: 'Formation Communication pro', raison: 'Ameliorer expression et structure des reponses.' },
      { key: 'rh', titre: 'Atelier Entretien RH', raison: 'Mieux preparer les reponses comportementales.' }
    ];

    const recos: Array<{ titre: string; raison: string; motCle: string }> = [];
    for (const rule of rules) {
      if (joined.includes(rule.key)) {
        recos.push({ titre: rule.titre, raison: rule.raison, motCle: rule.key });
      }
    }

    if (!recos.length) {
      recos.push({
        titre: 'Parcours de remise a niveau',
        raison: 'Revoir les fondamentaux techniques correspondant aux questions non reussies.',
        motCle: 'general'
      });
    }

    return recos.slice(0, 4);
  }

  private summarizeQuestionForReport(question: TestQuestion): string {
    const raw = this.getQuestionText(question);
    if (raw.length <= 120) {
      return raw;
    }
    return `${raw.slice(0, 117)}...`;
  }

  private buildReportText(report: CandidateAutoReport | null): string {
    if (!report) {
      return '';
    }

    const forts = report.pointsForts.length
      ? report.pointsForts.map((p, i) => `${i + 1}. ${p}`).join('\n')
      : 'Aucun point fort identifie.';

    const faibles = report.pointsFaibles.length
      ? report.pointsFaibles.map((p, i) => `${i + 1}. ${p}`).join('\n')
      : 'Aucun point faible identifie.';

    const recommandations = report.recommandations.length
      ? report.recommandations.map((r, i) => `${i + 1}. ${r.titre} - ${r.raison}`).join('\n')
      : 'Aucune recommandation disponible.';

    return [
      `Rapport automatique candidat - Entretien #${this.entretienId}`,
      `Date: ${report.generatedAt.toLocaleString('fr-FR')}`,
      `Score global: ${report.scoreGlobal}%`,
      `Seuil: ${report.seuil}%`,
      '',
      'Points forts:',
      forts,
      '',
      'Points faibles:',
      faibles,
      '',
      'Recommandations:',
      recommandations
    ].join('\n');
  }

  openFormationRecommendations(): void {
    const keyword = this.candidateReport?.recommandations?.[0]?.motCle || 'general';
    this.router.navigate(['/formations'], { queryParams: { q: keyword } });
  }

  exportReportPdf(): void {
    if (!this.candidateReport) {
      return;
    }

    const report = this.candidateReport;
    const pointsForts = report.pointsForts.length
      ? report.pointsForts.map((item: string) => `<li>${this.escapeHtml(item)}</li>`).join('')
      : '<li>Aucun point fort identifie.</li>';
    const pointsFaibles = report.pointsFaibles.length
      ? report.pointsFaibles.map((item: string) => `<li>${this.escapeHtml(item)}</li>`).join('')
      : '<li>Aucun point faible identifie.</li>';

    const html = `
      <html>
        <head>
          <title>Rapport entretien #${this.entretienId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin-bottom: 4px; }
            .meta { color: #4b5563; margin-bottom: 20px; }
            .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
            .score { font-size: 20px; font-weight: 700; }
            ul { margin: 8px 0 0 20px; }
          </style>
        </head>
        <body>
          <h1>Rapport automatique du candidat</h1>
          <div class="meta">Entretien: ${this.escapeHtml(this.examTitle)} | Date: ${report.generatedAt.toLocaleString('fr-FR')}</div>
          <div class="card score">Score global: ${report.scoreGlobal}% (Seuil: ${report.seuil}%)</div>
          <div class="card">
            <h3>Points forts</h3>
            <ul>${pointsForts}</ul>
          </div>
          <div class="card">
            <h3>Points faibles</h3>
            <ul>${pointsFaibles}</ul>
          </div>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      popup.print();
      return;
    }

    this.printHtmlWithIframe(html);
  }

  private printHtmlWithIframe(html: string): void {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 800);
    }, 200);
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  goHome(): void {
    this.stopCountdown();
    this.forceExitFullscreen();
    this.router.navigate(['/']);
  }

  private updateDurationFromEntretien(details: EntretienDetails | null): void {
    const raw = Number((details as any)?.dureeMinutes);
    if (Number.isFinite(raw) && raw >= 1 && raw <= 300) {
      this.dureeMinutes = Math.trunc(raw);
    } else {
      this.dureeMinutes = 30;
    }
    this.remainingSeconds = this.dureeMinutes * 60;
  }
}

