import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FreelanceService, FreelanceEvent, Mission, AvailabilitySlot, DeadlineItem, SchedulerUserOption } from './services/freelance.service';
import { FreelanceViewMode, RoleSwitchService } from './services/role-switch.service';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: FreelanceEvent[];
}

@Component({
  selector: 'app-freelance-scheduler',
  standalone: false,
  templateUrl: './freelance-scheduler.component.html'
})
export class FreelanceSchedulerComponent implements OnInit, OnDestroy {

  // ── Calendar state ──────────────────────────────────────────────────
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  allEvents: FreelanceEvent[] = [];
  missions: Mission[] = [];
  counterparties: SchedulerUserOption[] = [];
  missionScopedCounterpartyIds: number[] | null = null;
  counterpartyLoading = false;
  private modeSub?: Subscription;
  availabilitySlots: AvailabilitySlot[] = [];
  upcomingDeadlines: DeadlineItem[] = [];
  uiNotice = '';
  uiNoticeType: 'success' | 'error' = 'success';

  // ── Selected day & detail panel ─────────────────────────────────────
  selectedDay: CalendarDay | null = null;
  selectedEvent: FreelanceEvent | null = null;

  // ── Create/Edit form ────────────────────────────────────────────────
  showForm = false;
  editingEvent: FreelanceEvent | null = null;
  showAvailabilityForm = false;
  availabilityForm = { startDate: '', endDate: '' };
  formData = {
    title: '',
    description: '',
    type: 'MEETING' as string,
    startDate: '',
    endDate: '',
    missionId: null as number | null,
    counterpartyId: null as number | null
  };

  eventTypes = [
    { value: 'INTERVIEW', label: '🎙️ Entretien', color: '#8b5cf6' },
    { value: 'DEADLINE', label: '⏰ Deadline', color: '#ef4444' },
    { value: 'MEETING', label: '🤝 Réunion', color: '#3b82f6' },
    { value: 'REVIEW', label: '📋 Revue', color: '#f59e0b' },
    { value: 'MILESTONE', label: '🏁 Jalon', color: '#10b981' }
  ];

  constructor(
    private freelanceService: FreelanceService,
    private router: Router,
    private roleSwitchService: RoleSwitchService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadMissions();
    this.loadCounterparties();
    this.modeSub = this.roleSwitchService.mode$.subscribe(() => {
      this.loadMissions();
      this.loadCounterparties();
    });
    this.loadAvailability();
    this.loadUpcomingDeadlines();
    this.buildCalendar();
  }

  ngOnDestroy(): void {
    this.modeSub?.unsubscribe();
  }

  // ── Data loading ────────────────────────────────────────────────────
  loadEvents(): void {
    const selectedDayTs = this.selectedDay?.date?.getTime() ?? null;
    const selectedEventId = this.selectedEvent?.id ?? null;
    this.freelanceService.getMyEvents().subscribe({
      next: events => {
        this.allEvents = events;
        this.buildCalendar();
        if (selectedDayTs !== null) {
          const reboundDay = this.calendarDays.find(d => d.date.getTime() === selectedDayTs) || null;
          this.selectedDay = reboundDay;
        }
        if (selectedEventId !== null) {
          this.selectedEvent = this.allEvents.find(e => e.id === selectedEventId) || null;
        }
      },
      error: () => {
        this.allEvents = [];
        this.showNotice('Impossible de charger les événements.', 'error');
      }
    });
  }

  loadMissions(): void {
    if (this.roleSwitchService.isClientMode()) {
      this.freelanceService.mesMissions().subscribe({
        next: m => this.missions = m,
        error: () => this.missions = []
      });
      return;
    }
    this.freelanceService.getMissions().subscribe({
      next: m => this.missions = m,
      error: () => this.missions = []
    });
  }

  loadCounterparties(): void {
    const view: FreelanceViewMode = this.roleSwitchService.isClientMode() ? 'CLIENT_FREELANCE' : 'FREELANCER';
    this.freelanceService.getSchedulerCounterparties(view).subscribe({
      next: list => this.counterparties = list,
      error: () => this.counterparties = []
    });
  }

  get counterpartyFieldLabel(): string {
    return this.roleSwitchService.isClientMode() ? 'Freelancer invité' : 'Client invité';
  }

  loadAvailability(): void {
    this.freelanceService.getMyAvailability().subscribe({
      next: s => this.availabilitySlots = s,
      error: () => this.availabilitySlots = []
    });
  }

  loadUpcomingDeadlines(): void {
    this.freelanceService.getUpcomingDeadlines(14).subscribe({
      next: d => this.upcomingDeadlines = d,
      error: () => this.upcomingDeadlines = []
    });
  }

  // ── Calendar building ───────────────────────────────────────────────
  buildCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based week: getDay() returns 0=Sun, we want 0=Mon
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days: CalendarDay[] = [];
    const today = new Date();

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push(this.makeDay(d, false, today));
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push(this.makeDay(date, true, today));
    }

    // Next month filler days (fill to 42 = 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      days.push(this.makeDay(date, false, today));
    }

    this.calendarDays = days;
  }

  private makeDay(date: Date, isCurrentMonth: boolean, today: Date): CalendarDay {
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

    const dayStr = this.toDateStr(date);
    const events = this.allEvents.filter(e => {
      const eStart = e.startDate ? e.startDate.substring(0, 10) : '';
      return eStart === dayStr;
    });

    return { date, dayNumber: date.getDate(), isCurrentMonth, isToday, events };
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ── Navigation ──────────────────────────────────────────────────────
  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.buildCalendar();
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  // ── Day selection ───────────────────────────────────────────────────
  selectDay(day: CalendarDay): void {
    this.selectedDay = day;
    this.selectedEvent = null;
  }

  selectEvent(event: FreelanceEvent): void {
    this.selectedEvent = event;
  }

  // ── Create/Edit form ────────────────────────────────────────────────
  openCreateForm(day?: CalendarDay): void {
    this.editingEvent = null;
    const dateStr = day ? this.toDateStr(day.date) : this.toDateStr(new Date());
    this.formData = {
      title: '',
      description: '',
      type: 'MEETING',
      startDate: dateStr + 'T09:00',
      endDate: dateStr + 'T10:00',
      missionId: null,
      counterpartyId: null
    };
    this.missionScopedCounterpartyIds = null;
    this.counterpartyLoading = false;
    this.showForm = true;
  }

  openEditForm(event: FreelanceEvent): void {
    this.editingEvent = event;
    this.formData = {
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDate: event.startDate ? event.startDate.substring(0, 16) : '',
      endDate: event.endDate ? event.endDate.substring(0, 16) : '',
      missionId: event.missionId || null,
      counterpartyId: event.participantId || null
    };
    this.missionScopedCounterpartyIds = null;
    this.counterpartyLoading = false;
    if (this.formData.missionId != null) {
      this.onMissionChange();
    }
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingEvent = null;
    this.missionScopedCounterpartyIds = null;
    this.counterpartyLoading = false;
  }

  submitForm(): void {
    if (!this.formData.title || !this.formData.startDate || !this.formData.endDate) return;
    if (this.roleSwitchService.isClientMode() && this.formData.missionId != null && this.counterpartyLoading) {
      this.showNotice('Veuillez patienter : les contreparties de la mission sont encore en cours de chargement.', 'error');
      return;
    }
    const selectedCounterpartyId = this.formData.counterpartyId;
    if (selectedCounterpartyId != null && this.visibleCounterparties.every(c => c.id !== selectedCounterpartyId)) {
      this.showNotice('La contrepartie sélectionnée ne correspond pas à la mission choisie.', 'error');
      return;
    }

    const payload: Record<string, string | number | null | undefined> = {
      title: this.formData.title,
      description: this.formData.description,
      type: this.formData.type,
      startDate: this.formData.startDate,
      endDate: this.formData.endDate,
      missionId: this.formData.missionId ?? undefined
    };
    const cid = selectedCounterpartyId;
    if (cid != null) {
      if (this.roleSwitchService.isClientMode()) {
        payload['freelancerId'] = cid;
      } else {
        payload['clientId'] = cid;
      }
    }

    if (this.editingEvent) {
      this.freelanceService.updateEvent(this.editingEvent.id, payload).subscribe({
        next: () => {
          this.closeForm();
          this.loadEvents();
          this.showNotice('Événement mis à jour.', 'success');
        },
        error: (err) => this.showNotice(err?.error?.error || err?.error?.message || 'Erreur lors de la mise à jour.', 'error')
      });
    } else {
      this.freelanceService.createEvent(payload).subscribe({
        next: () => {
          this.closeForm();
          this.loadEvents();
          this.showNotice('Événement créé.', 'success');
        },
        error: (err) => this.showNotice(err?.error?.error || err?.error?.message || 'Erreur lors de la création.', 'error')
      });
    }
  }

  onMissionChange(): void {
    const mid = this.formData.missionId;
    if (mid == null) {
      this.missionScopedCounterpartyIds = null;
      this.counterpartyLoading = false;
      return;
    }
    const mission = this.missions.find(m => m.id === mid);
    if (!this.roleSwitchService.isClientMode() && mission?.postedById) {
      this.missionScopedCounterpartyIds = mission.postedById ? [mission.postedById] : null;
      this.formData.counterpartyId = mission.postedById;
      return;
    }
    if (this.roleSwitchService.isClientMode()) {
      const previous = this.formData.counterpartyId;
      const keepOnEdit = this.editingEvent != null;
      this.counterpartyLoading = true;
      this.missionScopedCounterpartyIds = [];
      // On creation: clear to avoid sending an invalid counterparty while loading.
      // On edit: keep the existing participant if it remains valid.
      if (!keepOnEdit) {
        this.formData.counterpartyId = null;
      }
      this.freelanceService.candidaturesDeMission(mid).subscribe({
        next: apps => {
          const allCandidateIds = Array.from(new Set((apps || []).map(a => a.utilisateurId).filter(Boolean)));
          this.missionScopedCounterpartyIds = allCandidateIds;
          this.counterpartyLoading = false;
          if (previous != null && !allCandidateIds.includes(previous)) {
            this.formData.counterpartyId = null;
          }

          const accepted = (apps || []).filter(a => a.statut === 'ACCEPTEE');
          if (this.formData.counterpartyId == null && accepted.length === 1) {
            this.formData.counterpartyId = accepted[0].utilisateurId ?? null;
          }
        },
        error: () => {
          this.missionScopedCounterpartyIds = [];
          this.formData.counterpartyId = null;
          this.counterpartyLoading = false;
        }
      });
    }
  }

  get visibleCounterparties(): SchedulerUserOption[] {
    if (this.counterpartyLoading) return [];
    if (this.missionScopedCounterpartyIds === null) {
      return this.counterparties;
    }
    if (this.missionScopedCounterpartyIds.length === 0) {
      return [];
    }
    const allowed = new Set(this.missionScopedCounterpartyIds);
    return this.counterparties.filter(c => allowed.has(c.id));
  }

  counterpartyLabel(u: SchedulerUserOption): string {
    const name = u.nom?.trim();
    if (name) return name;
    return u.email || `Utilisateur #${u.id}`;
  }

  openAvailabilityForm(): void {
    this.availabilityForm = { startDate: '', endDate: '' };
    this.showAvailabilityForm = true;
  }

  saveAvailability(): void {
    if (!this.availabilityForm.startDate || !this.availabilityForm.endDate) {
      return;
    }
    this.freelanceService.createAvailabilitySlot(this.availabilityForm).subscribe({
      next: () => {
        this.showAvailabilityForm = false;
        this.loadAvailability();
      },
      error: () => this.showAvailabilityForm = false
    });
  }

  removeAvailability(id: number): void {
    this.freelanceService.deleteAvailabilitySlot(id).subscribe({
      next: () => this.loadAvailability()
    });
  }

  autoBookSelectedDay(day: CalendarDay): void {
    const firstSlot = this.availabilitySlots.find(s => !s.booked);
    if (!firstSlot) return;
    const startDate = `${this.toDateStr(day.date)}T09:00`;
    const endDate = `${this.toDateStr(day.date)}T10:00`;
    this.freelanceService.autoBook({
      freelancerId: firstSlot.freelancerId,
      title: `Auto booking ${this.toDateStr(day.date)}`,
      type: 'MEETING',
      startDate,
      endDate
    }).subscribe({
      next: () => {
        this.loadEvents();
        this.loadAvailability();
      }
    });
  }

  // ── Status & Delete ─────────────────────────────────────────────────
  changeStatus(event: FreelanceEvent, status: string): void {
    this.freelanceService.updateEventStatus(event.id, status).subscribe({
      next: updated => {
        this.selectedEvent = updated;
        this.loadEvents();
        this.showNotice(`Statut mis à jour: ${this.getStatusLabel(updated.status)}`, 'success');
      },
      error: (err) => {
        this.showNotice(err?.error?.error || err?.error?.message || 'Action non autorisée ou événement invalide.', 'error');
      }
    });
  }

  deleteEvent(event: FreelanceEvent): void {
    this.freelanceService.deleteEvent(event.id).subscribe({
      next: () => {
        this.selectedEvent = null;
        this.loadEvents();
        this.showNotice('Événement supprimé.', 'success');
      },
      error: (err) => {
        this.showNotice(err?.error?.error || err?.error?.message || 'Suppression impossible.', 'error');
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  getEventColor(type: string): string {
    const t = this.eventTypes.find(et => et.value === type);
    return t ? t.color : '#6b7280';
  }

  getEventLabel(type: string): string {
    const t = this.eventTypes.find(et => et.value === type);
    return t ? t.label : type;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'SCHEDULED': '📅 Planifié',
      'CONFIRMED': '✅ Confirmé',
      'CANCELLED': '❌ Annulé',
      'COMPLETED': '🏆 Terminé'
    };
    return map[status] || status;
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  goBack(): void {
    this.router.navigate(['/freelance']);
  }

  showNotice(message: string, type: 'success' | 'error'): void {
    this.uiNotice = message;
    this.uiNoticeType = type;
    setTimeout(() => {
      if (this.uiNotice === message) this.uiNotice = '';
    }, 4000);
  }
}
