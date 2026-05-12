import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiService } from '../../api.service';
import { SharedModule } from '../../shared/shared.module';

interface CandidateEntretien {
  id: number;
  titre?: string;
  description?: string;
  type?: string;
  categorie?: string;
  mode?: string;
  modeEntretien?: string;
  domaine?: string;
  dateEntretien?: string;
  photo?: string;
  lien?: string;
  lienEntretien?: string;
  interviewLink?: string;
  meetingLink?: string;
  videoUrl?: string;
  joinUrl?: string;
  completed?: boolean;
  offreId?: number;
  offreTitre?: string;
  poste?: string;
  candidatId?: number;
  isPlaceholder?: boolean;
  fromCandidature?: boolean;
}

interface EntretienReminder {
  entretienId: number;
  title: string;
  dateLabel: string;
  message: string;
  level: 'today' | 'soon' | 'planned';
  orderTime: number;
}

@Component({
  selector: 'app-candidate-entretiens-page',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './candidate-entretiens-page.component.html',
  styleUrls: ['./candidate-entretiens-page.component.scss']
})
export class CandidateEntretiensPageComponent {
  private readonly attemptStoragePrefix = 'entretienAttempted_';
  entretiens: CandidateEntretien[] = [];
  upcomingEntretiens: CandidateEntretien[] = [];
  reminders: EntretienReminder[] = [];
  loading = true;
  errorMessage = '';
  showCalendar = true;
  currentCalendarDate = new Date();
  calendarWeeks: Array<Array<{ date: Date; inCurrentMonth: boolean; isToday: boolean; hasEntretien: boolean; entretienCount: number }>> = [];

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCandidateEntretiens();
  }

  private loadCandidateEntretiens(): void {
    this.loading = true;
    this.errorMessage = '';

    const email = this.resolveCurrentUserEmail();
    if (!email) {
      this.loading = false;
      this.errorMessage = 'Session invalide. Veuillez vous reconnecter.';
      return;
    }

    this.apiService.getCandidateByEmail(email).subscribe({
      next: (candidate: any) => {
        const candidatId = Number(candidate?.id);
        if (!Number.isFinite(candidatId) || candidatId <= 0) {
          this.loading = false;
          this.errorMessage = 'Profil candidat introuvable.';
          return;
        }

        localStorage.setItem('candidatId', String(candidatId));
        this.fetchEntretiens(candidatId);
      },
      error: () => {
        // Fallback to local/token id resolution for compatibility.
        const fallbackId = this.resolveCandidatId();
        if (!fallbackId) {
          this.loading = false;
          this.errorMessage = 'Impossible de charger votre profil candidat.';
          return;
        }
        this.fetchEntretiens(fallbackId);
      }
    });
  }

  private fetchEntretiens(candidatId: number): void {
    this.apiService.getMesCandidatures().pipe(
      catchError(() => of([])),
      switchMap((candidatures: any) => {
        const rawCandidatures = this.normalizeCollection(candidatures);
        const acceptedOffers = this.extractAcceptedOffers(rawCandidatures);

        return forkJoin({
          direct: this.apiService.getEntretiensByCandidat(candidatId).pipe(catchError(() => of([]))),
          all: this.apiService.getEntretiens().pipe(catchError(() => of([]))),
          candidatures: of(rawCandidatures),
          acceptedOffers: of(acceptedOffers)
        });
      })
    ).subscribe({
      next: ({ direct, all, candidatures, acceptedOffers }: { direct: any; all: any; candidatures: any; acceptedOffers: Array<{ id: number; title: string }> }) => {
        const directList = this.normalizeCollection(direct);
        const globalList = this.normalizeCollection(all);
        const normalizedCandidatures = this.normalizeCollection(candidatures);
        const fallbackFromCandidatures = this.buildFallbackEntretiensFromCandidatures(normalizedCandidatures);

        this.entretiens = this.mergeCandidateEntretiens(candidatId, [...directList, ...globalList, ...fallbackFromCandidatures], acceptedOffers)
          .filter((item) => !this.isTestEntretien(item));
        this.upcomingEntretiens = this.entretiens
          .filter((item) => this.isUpcoming(item))
          .sort((left, right) => this.getEntretienTime(left) - this.getEntretienTime(right));
        this.reminders = this.buildReminders(this.upcomingEntretiens);
        this.buildCalendar();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger vos entretiens pour le moment.';
        this.loading = false;
      }
    });
  }

  private extractAcceptedOffers(candidatures: any[]): Array<{ id: number; title: string }> {
    const acceptedOffers: Array<{ id: number; title: string }> = [];

    candidatures.forEach((candidature: any) => {
      if (!this.isAcceptedCandidature(candidature)) {
        return;
      }

      const offreId = this.getOffreIdFromCandidature(candidature);
      const title = this.normalizeForSearch(
        candidature?.offreTitre ||
        candidature?.poste ||
        candidature?.offre?.titre ||
        candidature?.offre?.poste ||
        candidature?.titreOffre ||
        ''
      );

      if (offreId > 0 || title) {
        acceptedOffers.push({ id: offreId, title });
      }
    });

    return acceptedOffers;
  }

  private mergeCandidateEntretiens(candidatId: number, entretiens: CandidateEntretien[], acceptedOffers: Array<{ id: number; title: string }>): CandidateEntretien[] {
    const uniqueEntretiens = new Map<string, CandidateEntretien>();

    entretiens.forEach((item, index) => {
      if (!this.shouldDisplayEntretienForCandidate(item, candidatId, acceptedOffers)) {
        return;
      }

      const entretienId = Number(item?.id);
      const key = Number.isFinite(entretienId) && entretienId > 0
        ? `id:${entretienId}`
        : `tmp:${Number(item?.offreId || 0)}:${this.normalizeForSearch(item?.titre || item?.offreTitre || item?.poste || '')}:${index}`;

      uniqueEntretiens.set(key, item);
    });

    return Array.from(uniqueEntretiens.values()).sort((left, right) => this.getEntretienTime(left) - this.getEntretienTime(right));
  }

  private shouldDisplayEntretienForCandidate(item: CandidateEntretien, candidatId: number, acceptedOffers: Array<{ id: number; title: string }>): boolean {
    if ((item as any)?.fromCandidature) {
      return true;
    }

    const itemCandidateId = Number((item as any)?.candidatId ?? (item as any)?.candidat?.id ?? (item as any)?.candidateId ?? 0);
    if (Number.isFinite(itemCandidateId) && itemCandidateId === candidatId) {
      return true;
    }

    const itemOffreId = Number((item as any)?.offreId ?? (item as any)?.offre?.id ?? (item as any)?.offreEmploi?.id ?? (item as any)?.jobOfferId ?? 0);
    if (Number.isFinite(itemOffreId) && itemOffreId > 0 && acceptedOffers.some((offer) => offer.id === itemOffreId)) {
      return true;
    }

    const itemTitle = this.normalizeForSearch(
      item?.offreTitre ||
      item?.poste ||
      item?.titre ||
      item?.description ||
      ''
    );

    if (!itemTitle) {
      return false;
    }

    return acceptedOffers.some((offer) => offer.title && itemTitle.includes(offer.title));
  }

  private getOffreIdFromCandidature(candidature: any): number {
    const raw = candidature?.offreId ?? candidature?.idOffre ?? candidature?.offre?.id ?? candidature?.offreEmploi?.id;
    const offerId = Number(raw);
    return Number.isFinite(offerId) && offerId > 0 ? offerId : 0;
  }

  private isAcceptedCandidature(candidature: any): boolean {
    const statut = String(candidature?.statut || candidature?.status || candidature?.etat || candidature?.state || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    if (!statut) {
      return false;
    }

    return statut.includes('ACCEP') || statut.includes('ACCEPT') || statut.includes('RETENU') || statut.includes('ENTRETIEN');
  }

  private buildFallbackEntretiensFromCandidatures(candidatures: any[]): CandidateEntretien[] {
    const fallback: CandidateEntretien[] = [];

    candidatures.forEach((candidature: any, index: number) => {
      if (!this.isAcceptedCandidature(candidature)) {
        return;
      }

      const entretienId = Number(candidature?.entretienId ?? candidature?.entretien?.id ?? 0);
      const safeId = Number.isFinite(entretienId) && entretienId > 0 ? entretienId : -(index + 1);
      const date = candidature?.dateEntretien || candidature?.entretien?.dateEntretien || candidature?.scheduledAt || undefined;

      fallback.push({
        id: safeId,
        titre: candidature?.entretien?.titre || candidature?.titreEntretien || candidature?.offreTitre || candidature?.poste || 'Entretien en attente',
        description: candidature?.entretien?.description || candidature?.descriptionEntretien || `Entretien lié à votre candidature pour ${candidature?.offreTitre || candidature?.poste || 'une offre'}.`,
        type: candidature?.entretien?.type || candidature?.typeEntretien || 'TECHNIQUE',
        domaine: candidature?.entretien?.domaine || candidature?.domaine || 'GENERAL',
        dateEntretien: date,
        meetingLink: candidature?.entretien?.meetingLink || candidature?.meetingLink,
        lienEntretien: candidature?.entretien?.lienEntretien || candidature?.lienEntretien,
        videoUrl: candidature?.entretien?.videoUrl || candidature?.videoUrl,
        joinUrl: candidature?.entretien?.joinUrl || candidature?.joinUrl,
        offreId: this.getOffreIdFromCandidature(candidature) || undefined,
        offreTitre: candidature?.offreTitre || candidature?.poste,
        candidatId: Number(candidature?.candidatId || candidature?.candidat?.id || 0) || undefined,
        isPlaceholder: !(Number.isFinite(entretienId) && entretienId > 0),
        fromCandidature: true
      });
    });

    return fallback;
  }

  private normalizeCollection(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const candidates = [
      payload?.content,
      payload?.items,
      payload?.data,
      payload?.results,
      payload?.candidatures,
      payload?.entretiens,
      payload?.interviews,
      payload?.list
    ];

    for (const value of candidates) {
      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  private normalizeForSearch(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveCurrentUserEmail(): string {
    const stored = String(localStorage.getItem('userEmail') || '').trim();
    if (stored) {
      return stored;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return '';
    }

    try {
      const decoded: any = jwtDecode(token);
      return String(decoded?.email || decoded?.sub || '').trim();
    } catch {
      return '';
    }
  }

  private resolveCandidatId(): number | null {
    const local = Number(localStorage.getItem('candidatId'));
    if (!isNaN(local) && local > 0) {
      return local;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);
      const id = Number(decoded?.candidatId || decoded?.id || decoded?.userId || decoded?.sub);
      if (!isNaN(id) && id > 0) {
        localStorage.setItem('candidatId', String(id));
        return id;
      }
    } catch {
      return null;
    }

    return null;
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'Date a definir';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    return date.toLocaleString('fr-FR');
  }

  getReminderBadgeLabel(level: EntretienReminder['level']): string {
    switch (level) {
      case 'today':
        return 'Aujourdhui';
      case 'soon':
        return 'Bientot';
      default:
        return 'Planifie';
    }
  }

  getPhoto(item: CandidateEntretien): string {
    return (item.photo || '').trim() || 'images/banner/banner1.png';
  }

  get currentMonthLabel(): string {
    return this.currentCalendarDate.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  }

  previousMonth(): void {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  toggleCalendar(): void {
    this.showCalendar = !this.showCalendar;
  }

  nextMonth(): void {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  buildCalendar(): void {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ date: Date; inCurrentMonth: boolean; isToday: boolean; hasEntretien: boolean; entretienCount: number }> = [];

    for (let index = startOffset; index > 0; index--) {
      const date = new Date(year, month, 1 - index);
      cells.push(this.createCalendarCell(date, false));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      cells.push(this.createCalendarCell(date, true));
    }

    while (cells.length % 7 !== 0) {
      const date = new Date(year, month, daysInMonth + (cells.length - startOffset - daysInMonth) + 1);
      cells.push(this.createCalendarCell(date, false));
    }

    this.calendarWeeks = [];
    for (let index = 0; index < cells.length; index += 7) {
      this.calendarWeeks.push(cells.slice(index, index + 7));
    }
  }

  private createCalendarCell(date: Date, inCurrentMonth: boolean) {
    const entretienCount = this.getEntretiensForDate(date).length;
    return {
      date,
      inCurrentMonth,
      isToday: this.isSameDay(date, new Date()),
      hasEntretien: entretienCount > 0,
      entretienCount
    };
  }

  getEntretiensForDate(date: Date): CandidateEntretien[] {
    return this.entretiens.filter((item) => this.isSameDay(this.parseEntretienDate(item.dateEntretien), date));
  }

  private parseEntretienDate(value?: string): Date {
    if (!value) {
      return new Date('');
    }

    const parsed = new Date(value);
    return parsed;
  }

  private getEntretienTime(item: CandidateEntretien): number {
    const parsed = this.parseEntretienDate(item.dateEntretien);
    return parsed.getTime();
  }

  private buildReminders(items: CandidateEntretien[]): EntretienReminder[] {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const reminderWindowMs = 7 * oneDayMs;

    return items
      .map((item) => {
        const orderTime = this.getEntretienTime(item);
        if (!Number.isFinite(orderTime) || orderTime < now) {
          return null;
        }

        const diff = orderTime - now;
        if (diff > reminderWindowMs) {
          return null;
        }

        const level: EntretienReminder['level'] = diff <= oneDayMs
          ? 'today'
          : diff <= 3 * oneDayMs
            ? 'soon'
            : 'planned';

        const title = item.titre || item.offreTitre || item.poste || 'Entretien';
        const dateLabel = this.formatDate(item.dateEntretien);

        return {
          entretienId: Number(item.id) || 0,
          title,
          dateLabel,
          message: `Votre entretien "${title}" est prevu le ${dateLabel}.`,
          level,
          orderTime
        } as EntretienReminder;
      })
      .filter((reminder): reminder is EntretienReminder => !!reminder)
      .sort((left, right) => left.orderTime - right.orderTime)
      .slice(0, 5);
  }

  private isUpcoming(item: CandidateEntretien): boolean {
    const time = this.getEntretienTime(item);
    return Number.isFinite(time) && time >= Date.now();
  }

  private isSameDay(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();
  }

  private isTestEntretien(item: CandidateEntretien): boolean {
    const type = String(item?.type || '').toUpperCase();
    const categorie = String(item?.categorie || '').toUpperCase();
    return type === 'TEST' || categorie === 'TEST';
  }

  private parseInterviewDateOnly(item: CandidateEntretien): Date | null {
    const parsed = this.parseEntretienDate(item.dateEntretien);
    if (!Number.isFinite(parsed.getTime())) {
      return null;
    }
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  private getTodayDateOnly(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  hasAttempted(item: CandidateEntretien): boolean {
    if (!item?.id) {
      return false;
    }
    return localStorage.getItem(`${this.attemptStoragePrefix}${item.id}`) === '1';
  }

  private isInterviewInFuture(item: CandidateEntretien): boolean {
    const parsed = this.parseEntretienDate(item?.dateEntretien);
    return Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now();
  }

  isPassAllowedToday(item: CandidateEntretien): boolean {
    const interviewDay = this.parseInterviewDateOnly(item);
    if (!interviewDay) {
      return false;
    }
    return interviewDay.getTime() === this.getTodayDateOnly().getTime();
  }

  isPassButtonDisabled(item: CandidateEntretien): boolean {
    if (!item?.id || item.id <= 0 || item.isPlaceholder) {
      return true;
    }

    if (this.isInterviewInFuture(item)) {
      return false;
    }

    if (!item.completed) {
      return false;
    }

    return this.hasAttempted(item);
  }

  getPassButtonLabel(item: CandidateEntretien): string {
    if (!item?.id || item.id <= 0 || item.isPlaceholder) {
      return 'En attente de planification';
    }

    if (!this.isInterviewInFuture(item) && item.completed && this.hasAttempted(item)) {
      return 'Entretien deja passe';
    }

    if (this.isVideoEntretien(item)) {
      return 'Rejoindre l entretien video';
    }

    return 'Passer l\'entretien';
  }

  passEntretien(item: CandidateEntretien): void {
    if (this.isPassButtonDisabled(item)) {
      return;
    }

    if (this.isVideoEntretien(item)) {
      this.router.navigate(['/entretiens/video', item.id]);
      return;
    }

    this.apiService.getQuestionsByEntretien(item.id).subscribe({
      next: (questions: any) => {
        const hasQuestions = Array.isArray(questions) && questions.length > 0;
        if (!hasQuestions) {
          alert('Cet entretien ne contient pas encore de questions. Si c\'est un entretien video, utilisez le lien de reunion envoye par le recruteur.');
          return;
        }
        this.router.navigate(['/entretiens/test', item.id]);
      },
      error: () => {
        this.router.navigate(['/entretiens/test', item.id]);
      }
    });
  }

  private isVideoEntretien(item: CandidateEntretien): boolean {
    const mode = String(item?.mode || item?.modeEntretien || '').toUpperCase();
    return mode === 'VIDEO';
  }

  trackByEntretien(index: number, item: CandidateEntretien): number {
    return item?.id ?? index;
  }
}
