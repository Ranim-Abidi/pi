import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Mission {
  id: number;
  titre: string;
  description: string;
  budget: number;
  competences: string[];
  statut: 'OUVERTE' | 'EN_COURS' | 'FERMEE';
  postedByNom?: string;
  postedById?: number;
  dateCreation?: string;
  experienceLevel?: string;
  location?: string;
  remoteAvailable?: boolean;
  availability?: string;
}

export interface Candidature {
  id: number;
  missionId: number;
  missionTitre?: string;
  utilisateurId: number;
  utilisateurNom?: string;
  statut: 'EN_ATTENTE' | 'SHORTLISTEE' | 'ACCEPTEE' | 'REJETEE';
  datePostulation?: string;
  coverLetter?: string;
  bidAmount?: number;
  estimatedDays?: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface FreelanceStats {
  totalCandidatures: number;
  acceptedCandidatures: number;
  rejectedCandidatures: number;
  pendingCandidatures: number;
  approvalPercent: number;
  freelancerPoints: number;
  freelancerLevel: string;
  totalEarnings: number;
  totalMissionsPosted: number;
  openMissions: number;
  totalIncomingCandidatures: number;
  pendingIncomingCandidatures: number;
  totalBudgetAllocated: number;
  monthLabels?: string[];
  monthlyRevenueSeries?: number[];
  monthlyMissionSeries?: number[];
  completionSuccessPercent?: number;
}

export interface MatchResult {
  id: number;
  titre?: string;
  description?: string;
  budget?: number;
  competences?: string[];
  statut?: string;
  nom?: string;
  matchScore: number;
  matchPercent: number;
  matchingSkills?: string[];
}

export interface AiProposalResponse {
  proposal: string;
}

export interface AiPriceRange {
  min: number;
  mid: number;
  max: number;
}

export interface FreelanceEvent {
  id: number;
  title: string;
  description?: string;
  type: 'INTERVIEW' | 'DEADLINE' | 'MEETING' | 'REVIEW' | 'MILESTONE';
  startDate: string;
  endDate: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  missionId?: number;
  missionTitre?: string;
  organizerId?: number;
  organizerNom?: string;
  participantId?: number;
  participantNom?: string;
}

export interface SchedulerUserOption {
  id: number;
  nom?: string;
  email?: string;
  role?: string;
}

export interface AvailabilitySlot {
  id: number;
  freelancerId: number;
  freelancerNom?: string;
  startDate: string;
  endDate: string;
  booked: boolean;
  bookedByUserId?: number;
}

export interface DeadlineItem {
  kind: 'EVENT' | 'MILESTONE';
  sourceId: number;
  title: string;
  dueDate: string;
  status: string;
  missionId?: number;
  missionTitre?: string;
}

@Injectable({ providedIn: 'root' })
export class FreelanceService {
  private readonly BASE = '/api/freelance';
  private readonly AI_BASE = `${environment.mlUrl}/api`;

  /** BehaviorSubject so the client dashboard auto-refreshes after any mutation */
  private mesMissionsSubject = new BehaviorSubject<Mission[]>([]);
  mesMissions$ = this.mesMissionsSubject.asObservable();

  /** BehaviorSubject for freelancer's candidatures */
  private mesCandidaturesSubject = new BehaviorSubject<Candidature[]>([]);
  mesCandidatures$ = this.mesCandidaturesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ── Missions (Freelancer view) ─────────────────────────────────────

  getMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.BASE}/missions`);
  }

  searchMissions(params: Record<string, string>): Observable<PagedResponse<Mission>> {
    return this.http.get<PagedResponse<Mission>>(`${this.BASE}/missions/search`, { params });
  }

  getMissionById(id: number): Observable<Mission> {
    return this.http.get<Mission>(`${this.BASE}/missions/${id}`);
  }

  // ── Missions CRUD (Client) ─────────────────────────────────────────

  /** Fetch client's own missions and push to BehaviorSubject */
  refreshMesMissions(): void {
    this.http.get<Mission[]>(`${this.BASE}/missions/mes-missions`).subscribe({
      next: (m) => this.mesMissionsSubject.next(m),
      error: () => this.mesMissionsSubject.next([])
    });
  }

  /** Legacy method — still callable for standalone use */
  mesMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.BASE}/missions/mes-missions`);
  }

  publierMission(mission: Partial<Mission>): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions`, mission).pipe(
      tap(() => this.refreshMesMissions())
    );
  }

  updateMission(id: number, mission: Partial<Mission>): Observable<Mission> {
    return this.http.put<Mission>(`${this.BASE}/missions/${id}`, mission).pipe(
      tap(() => this.refreshMesMissions())
    );
  }

  deleteMission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/missions/${id}`).pipe(
      tap(() => this.refreshMesMissions())
    );
  }

  // ── Candidatures (Freelancer) ──────────────────────────────────────

  postuler(
    missionId: number,
    payload?: { coverLetter?: string; bidAmount?: number; estimatedDays?: number }
  ): Observable<Candidature> {
    return this.http.post<Candidature>(
      `${this.BASE}/missions/${missionId}/postuler`, payload || {}
    ).pipe(
      tap(() => this.refreshMesCandidatures())
    );
  }

  refreshMesCandidatures(): void {
    this.http.get<Candidature[]>(`${this.BASE}/candidatures/mes-candidatures`).subscribe({
      next: (c) => this.mesCandidaturesSubject.next(c),
      error: () => this.mesCandidaturesSubject.next([])
    });
  }

  mesCandidatures(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.BASE}/candidatures/mes-candidatures`);
  }

  searchMesCandidatures(params: Record<string, string>): Observable<PagedResponse<Candidature>> {
    return this.http.get<PagedResponse<Candidature>>(`${this.BASE}/candidatures/mes-candidatures/search`, { params });
  }

  // ── Candidatures (Client view) ─────────────────────────────────────

  candidaturesDeMission(missionId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.BASE}/missions/${missionId}/candidatures`);
  }

  accepterCandidature(id: number): Observable<Candidature> {
    return this.http.put<Candidature>(`${this.BASE}/candidatures/${id}/accepter`, {});
  }

  shortlistCandidature(id: number): Observable<Candidature> {
    return this.http.put<Candidature>(`${this.BASE}/candidatures/${id}/shortlist`, {});
  }

  rejeterCandidature(id: number): Observable<Candidature> {
    return this.http.put<Candidature>(`${this.BASE}/candidatures/${id}/rejeter`, {});
  }

  // ── AI Matching & Analytics ─────────────────────────────────────────

  getFreelancerStats(): Observable<FreelanceStats> {
    return this.http.get<FreelanceStats>(`${this.BASE}/ai/stats/freelancer`);
  }

  getClientStats(): Observable<FreelanceStats> {
    return this.http.get<FreelanceStats>(`${this.BASE}/ai/stats/client`);
  }

  getAIMatchedMissions(): Observable<MatchResult[]> {
    return this.http.get<MatchResult[]>(`${this.BASE}/ai/match-missions`);
  }

  getAIMatchedTalents(missionId: number): Observable<MatchResult[]> {
    return this.http.get<MatchResult[]>(`${this.BASE}/ai/match-talents/${missionId}`);
  }

  generateAiProposal(payload: {
    job_description: string;
    skills: string;
    experience_years: number;
    timeline_days: number;
  }): Observable<AiProposalResponse> {
    return this.http.post<AiProposalResponse>(`${this.AI_BASE}/proposal`, payload);
  }

  predictAiPrice(payload: {
    skill: string;
    experience_years: number;
    rating: number;
    location: string;
  }): Observable<AiPriceRange> {
    return this.http.post<AiPriceRange>(`${this.AI_BASE}/price`, payload);
  }

  // ── Scheduler ───────────────────────────────────────────────────────

  getMyEvents(): Observable<FreelanceEvent[]> {
    return this.http.get<FreelanceEvent[]>(`${this.BASE}/scheduler/events`);
  }

  getEventsByRange(start: string, end: string): Observable<FreelanceEvent[]> {
    return this.http.get<FreelanceEvent[]>(`${this.BASE}/scheduler/events/range`, {
      params: { start, end }
    });
  }

  getSchedulerCounterparties(view: 'FREELANCER' | 'CLIENT_FREELANCE'): Observable<SchedulerUserOption[]> {
    return this.http.get<SchedulerUserOption[]>(`${this.BASE}/scheduler/counterparties`, {
      params: { view }
    });
  }

  createEvent(event: Partial<FreelanceEvent>): Observable<FreelanceEvent> {
    return this.http.post<FreelanceEvent>(`${this.BASE}/scheduler/events`, event);
  }

  updateEvent(id: number, event: Partial<FreelanceEvent>): Observable<FreelanceEvent> {
    return this.http.put<FreelanceEvent>(`${this.BASE}/scheduler/events/${id}`, event);
  }

  updateEventStatus(id: number, status: string): Observable<FreelanceEvent> {
    return this.http.put<FreelanceEvent>(`${this.BASE}/scheduler/events/${id}/status`, { status });
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/scheduler/events/${id}`);
  }

  getMyAvailability(): Observable<AvailabilitySlot[]> {
    return this.http.get<AvailabilitySlot[]>(`${this.BASE}/scheduler/availability`);
  }

  createAvailabilitySlot(payload: { startDate: string; endDate: string }): Observable<AvailabilitySlot> {
    return this.http.post<AvailabilitySlot>(`${this.BASE}/scheduler/availability`, payload);
  }

  deleteAvailabilitySlot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/scheduler/availability/${id}`);
  }

  autoBook(payload: {
    freelancerId: number;
    title: string;
    description?: string;
    type?: string;
    startDate: string;
    endDate: string;
    missionId?: number | null;
  }): Observable<FreelanceEvent> {
    return this.http.post<FreelanceEvent>(`${this.BASE}/scheduler/bookings/auto`, payload);
  }

  getUpcomingDeadlines(days = 14): Observable<DeadlineItem[]> {
    return this.http.get<DeadlineItem[]>(`${this.BASE}/scheduler/deadlines/upcoming`, {
      params: { days: String(days) }
    });
  }
}