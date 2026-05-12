import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { FreelanceViewMode, RoleSwitchService } from './services/role-switch.service';
import { FreelanceService, FreelanceStats, MatchResult, Mission } from './services/freelance.service';
import { ApiService } from '../api.service';
import { FreelanceWorkspaceService, FreelanceContract, FreelanceInvoice } from './services/freelance-workspace.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-freelance-home',
  standalone: false,
  templateUrl: './freelance-home.component.html'
})
export class FreelanceHomeComponent implements OnInit, OnDestroy {
  mode: FreelanceViewMode = 'FREELANCER';
  jwtRole: string | null = null;
  canSwitchToClient = false;
  private sub!: Subscription;

  // ── Stats ──────────────────────────────────────────────────────────
  freelancerStats: FreelanceStats | null = null;
  clientStats: FreelanceStats | null = null;

  // ── AI Matching ────────────────────────────────────────────────────
  showMatchPanel = false;
  matchResults: MatchResult[] = [];
  matchLoading = false;
  matchPanelTitle = '';
  showOpsPanel = false;
  opsLoading = false;
  opsPanelTitle = '';
  // Used to conditionally render content inside the generic smart panel
  opsPanelKey: '' | 'contracts_legal' = '';
  opsCards: Array<{ title: string; value: string; subtitle: string }> = [];
  opsTips: string[] = [];
  opsActions: Array<{ id: string; label: string }> = [];

  // ── Scheduler ───────────────────────────────────────────────────────
  upcomingEvents: any[] = []; // Type: FreelanceEvent[]
  uiNotice = '';
  uiNoticeType: 'success' | 'error' = 'success';
  notifications: any[] = [];
  unreadNotifications = 0;
  showNotificationsPanel = false;
  emailVerified = false;
  identityStatus = 'UNVERIFIED';

  // ── Invoices (Home Dashboard) ───────────────────────────────────────
  dashboardInvoices: FreelanceInvoice[] = [];
  dashboardContracts: FreelanceContract[] = [];
  legalDocsView: 'contracts' | 'invoices' = 'contracts';

  constructor(
    public roleSwitchService: RoleSwitchService,
    private freelanceService: FreelanceService,
    private apiService: ApiService,
    private workspaceService: FreelanceWorkspaceService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.checkRole();
    this.sub = this.roleSwitchService.mode$.subscribe(m => {
      this.mode = m;
      this.showMatchPanel = false;
      this.loadStats();
      this.loadInvoices();
      this.loadContracts();
    });
    this.loadStats();
    this.loadNotifications();
    this.loadVerificationStatus();
    this.loadInvoices();
    this.loadContracts();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ── Mode switching ─────────────────────────────────────────────────
  checkRole(): void {
    const raw = this.roleSwitchService.getJwtRole();
    this.jwtRole = raw ? raw.toUpperCase().replace(/^ROLE_/, '') : null;
    // Both actual clients and candidates can switch to Client interface for recruitment
    this.canSwitchToClient = this.jwtRole === 'CLIENT_FREELANCE' || this.jwtRole === 'CANDIDAT';
  }

  switchToFreelancerMode(): void {
    console.log('Switching to Freelancer mode');
    this.roleSwitchService.switchMode('FREELANCER');
  }

  switchToClientMode(): void {
    console.log('Switching to Client mode, checking permits...');
    if (!this.canSwitchToClient) {
      this.showNotice('Acces reserve aux clients et candidats.', 'error');
      return;
    }
    this.roleSwitchService.switchMode('CLIENT_FREELANCE');
  }

  goToClientMissions(): void {
    console.log('Navigating to client missions...');
    this.router.navigate(['/freelance/client']);
  }

  goBackToCandidate(): void {
    this.router.navigate(['/candidates-dashboard']);
  }

  // ── Load Stats ─────────────────────────────────────────────────────
  loadStats(): void {
    // Always try freelancer stats (both roles can access)
    this.freelanceService.getFreelancerStats().subscribe({
      next: s => this.freelancerStats = s,
      error: () => this.freelancerStats = null
    });

    // Client stats only if applicable
    if (this.jwtRole === 'CLIENT_FREELANCE') {
      this.freelanceService.getClientStats().subscribe({
        next: s => this.clientStats = s,
        error: () => this.clientStats = null
      });
    }

    // Load upcoming events
    this.freelanceService.getMyEvents().subscribe({
      next: events => {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        this.upcomingEvents = events
          .filter(e => {
            const startDate = new Date(e.startDate);
            return startDate >= now && startDate <= nextWeek;
          })
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 3); // Show top 3
      },
      error: () => this.upcomingEvents = []
    });
  }

  loadNotifications(): void {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      this.notifications = [];
      this.unreadNotifications = 0;
      return;
    }
    this.apiService.getNotifications(token).subscribe({
      next: n => {
        this.notifications = (n || []).slice(0, 10);
        this.unreadNotifications = this.notifications.filter(x => !x.isRead).length;
      },
      error: () => {
        this.notifications = [];
        this.unreadNotifications = 0;
      }
    });
  }

  toggleNotificationsPanel(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
  }

  closeNotificationsPanel(): void {
    this.showNotificationsPanel = false;
  }

  markNotificationAsRead(notification: any): void {
    if (!notification?.id || notification?.isRead) {
      return;
    }
    this.apiService.markNotificationAsRead(notification.id).subscribe({
      next: () => {
        notification.isRead = true;
        this.unreadNotifications = this.notifications.filter(x => !x.isRead).length;
      }
    });
  }

  markAllNotificationsAsRead(): void {
    const token = localStorage.getItem('token') || '';
    if (!token) return;
    this.apiService.markAllNotificationsAsRead(token).subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
        this.unreadNotifications = 0;
      }
    });
  }

  getNotificationTone(type?: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('PAYMENT') || t.includes('INVOICE')) return 'success';
    if (t.includes('DEADLINE') || t.includes('ALERT')) return 'warning';
    if (t.includes('REJECT') || t.includes('CANCEL')) return 'danger';
    return 'info';
  }

  loadVerificationStatus(): void {
    const token = localStorage.getItem('token') || '';
    if (!token) return;
    this.apiService.getVerificationStatus(token).subscribe({
      next: (res) => {
        this.emailVerified = !!res?.emailVerified;
        this.identityStatus = res?.identityStatus || 'UNVERIFIED';
      }
    });
  }

  // ── Invoices ─────────────────────────────────────────────────────────
  loadInvoices(): void {
    this.workspaceService.getMyInvoices().subscribe({
      next: (res) => {
        const list = res || [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.dashboardInvoices = list;
      },
      error: () => {
        this.dashboardInvoices = [];
      }
    });
  }

  loadContracts(): void {
    this.workspaceService.getMyContracts().subscribe({
      next: (res) => {
        const list = res || [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.dashboardContracts = list;
      },
      error: () => {
        this.dashboardContracts = [];
      }
    });
  }

  downloadInvoicePdf(invoiceId: number): void {
    this.workspaceService.getInvoicePdf(invoiceId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.showNotice('Impossible de télécharger la facture.', 'error')
    });
  }

  downloadContractPdf(contract: FreelanceContract): void {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const left = 14;
      let y = 18;
      const lineGap = 8;
      const safe = (v: any) => (v === null || v === undefined || v === '' ? '-' : String(v));
      const addLine = (label: string, value: any) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${label}:`, left, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(safe(value), left + 42, y);
        y += lineGap;
      };

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Contrat Freelance', left, y);
      y += 10;

      pdf.setFontSize(11);
      addLine('Mission', contract.missionTitre);
      addLine('Contrat ID', contract.id);
      addLine('Statut', contract.status);
      addLine('Client', contract.clientNom);
      addLine('Freelancer', contract.freelancerNom);
      addLine('Montant', `${contract.amount} TND`);
      addLine('Escrow', `${contract.inEscrow} TND`);
      addLine('Total payé', `${contract.totalPaid} TND`);
      addLine('Créé le', contract.createdAt ? new Date(contract.createdAt).toLocaleString('fr-FR') : '-');

      y += 2;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Termes', left, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      const wrapped = pdf.splitTextToSize(safe(contract.terms), 180);
      pdf.text(wrapped, left, y);

      const safeTitle = (contract.missionTitre || `contract_${contract.id}`)
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_');
      pdf.save(`Contrat_${safeTitle}.pdf`);
    } catch {
      this.showNotice('Impossible de générer le PDF du contrat.', 'error');
    }
  }

  // ── AI Matching Actions ────────────────────────────────────────────
  openSmartMatching(): void {
    this.showMatchPanel = true;
    this.matchLoading = true;
    this.matchPanelTitle = '🎯 Missions recommandées (profil & compétences)';

    const rawEmail =
      localStorage.getItem('userEmail') ||
      (() => {
        const n = localStorage.getItem('userName') || '';
        return n.includes('@') ? n : '';
      })();

    if (!rawEmail) {
      this.runAiMissionFallback();
      return;
    }

    forkJoin({
      candidate: this.apiService.getCandidateByEmail(rawEmail),
      missions: this.freelanceService.getMissions()
    }).subscribe({
      next: ({ candidate, missions }) => {
        const mySkills = this.extractCandidateSkillLabels(candidate);
        const open = (missions || []).filter(m => m.statut === 'OUVERTE');
        if (!mySkills.length || !open.length) {
          this.runAiMissionFallback();
          return;
        }
        const skillSet = new Set(mySkills.map(s => this.normalizeSkillToken(s)));
        const ranked = open
          .map(m => this.buildMissionSkillMatch(m, skillSet))
          .filter(r => r.matchScore > 0)
          .sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0))
          .slice(0, 25);
        if (!ranked.length) {
          this.runAiMissionFallback();
          return;
        }
        this.matchResults = ranked;
        this.matchLoading = false;
      },
      error: () => this.runAiMissionFallback()
    });
  }

  private runAiMissionFallback(): void {
    this.matchPanelTitle = '🎯 Missions recommandées par l\'IA';
    this.freelanceService.getAIMatchedMissions().subscribe({
      next: results => {
        this.matchResults = results || [];
        this.matchLoading = false;
      },
      error: () => {
        this.matchResults = [];
        this.matchLoading = false;
      }
    });
  }

  openTalentRecommendations(): void {
    this.freelanceService.mesMissions().subscribe({
      next: missions => {
        const prioritized = [...missions].sort((a, b) => {
          const aOpen = a.statut === 'OUVERTE' ? 1 : 0;
          const bOpen = b.statut === 'OUVERTE' ? 1 : 0;
          return bOpen - aOpen;
        });
        const targetMission = prioritized[0];
        if (!targetMission) {
          this.showNotice('Publiez une mission d abord pour recevoir des recommandations.', 'error');
          return;
        }
        this.showMatchPanel = true;
        this.matchLoading = true;
        this.matchPanelTitle = '🤖 Talents recommandés pour: ' + targetMission.titre;
        this.freelanceService.getAIMatchedTalents(targetMission.id).subscribe({
          next: results => {
            this.matchResults = results;
            this.matchLoading = false;
            if (results.length === 0) {
              this.showNotice('Aucun talent recommande pour cette mission pour le moment.', 'error');
            }
          },
          error: () => {
            this.matchResults = [];
            this.matchLoading = false;
            this.showNotice('Impossible de charger les recommandations IA.', 'error');
          }
        });
      },
      error: () => this.showNotice('Impossible de charger vos missions.', 'error')
    });
  }

  closeMatchPanel(): void {
    this.showMatchPanel = false;
    this.matchResults = [];
  }

  closeOpsPanel(): void {
    this.showOpsPanel = false;
    this.opsCards = [];
    this.opsTips = [];
    this.opsActions = [];
    this.opsPanelKey = '';
  }

  selectEventFromDash(event: any): void {
    // Navigate to full scheduler for management
    this.router.navigate(['/freelance/scheduler']);
  }

  openApprovalInsights(): void {
    this.showOpsPanel = true;
    this.opsLoading = true;
    this.opsPanelTitle = '📈 Approval Insights';
    this.opsCards = [];
    this.opsTips = [];
    this.freelanceService.mesCandidatures().subscribe({
      next: (cands) => {
        const total = cands.length;
        const accepted = cands.filter(c => c.statut === 'ACCEPTEE').length;
        const rejected = cands.filter(c => c.statut === 'REJETEE').length;
        const pending = cands.filter(c => c.statut === 'EN_ATTENTE' || c.statut === 'SHORTLISTEE').length;
        const approval = total > 0 ? Math.round((accepted / total) * 100) : 0;
        this.opsCards = [
          { title: 'Approval Rate', value: `${approval}%`, subtitle: `${accepted}/${total} accepted` },
          { title: 'Pending Pipeline', value: `${pending}`, subtitle: 'Awaiting recruiter response' },
          { title: 'Rejected', value: `${rejected}`, subtitle: 'Needs proposal optimization' },
          { title: 'Freelancer Level', value: this.freelancerStats?.freelancerLevel || 'N/A', subtitle: `${this.freelancerStats?.freelancerPoints || 0} points` }
        ];
        this.opsTips = approval < 40
          ? ['Use mission-specific cover letters.', 'Apply to roles matching your top skills first.']
          : ['Keep response quality consistent.', 'Follow up quickly on shortlisted candidatures.'];
        this.opsActions = [
          { id: 'copy', label: 'Copy Summary' },
          { id: 'refresh', label: 'Refresh' },
          { id: 'plan', label: 'Generate Action Plan' }
        ];
        this.opsLoading = false;
      },
      error: () => {
        this.opsLoading = false;
        this.showNotice('Impossible de charger les insights approbation.', 'error');
      }
    });
  }

  openFinancialDashboard(): void {
    this.showOpsPanel = true;
    this.opsLoading = false;
    this.opsPanelTitle = '💳 Financial Snapshot';
    const earnings = this.freelancerStats?.totalEarnings || 0;
    const total = this.freelancerStats?.totalCandidatures || 0;
    const accepted = this.freelancerStats?.acceptedCandidatures || 0;
    const avgPerWin = accepted > 0 ? Math.round(earnings / accepted) : 0;
    const winRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    this.opsCards = [
      { title: 'Total Earnings', value: `${earnings.toLocaleString()} TND`, subtitle: 'All paid milestones' },
      { title: 'Avg per Won Mission', value: `${avgPerWin.toLocaleString()} TND`, subtitle: 'Average value per accepted candidature' },
      { title: 'Current Win Rate', value: `${winRate}%`, subtitle: `${accepted} wins out of ${total}` }
    ];
    this.opsTips = [
      'Focus on missions near your successful bid range.',
      'Use milestone-based proposals to improve close rate.'
    ];
    this.opsActions = [
      { id: 'copy', label: 'Copy Summary' },
      { id: 'refresh', label: 'Refresh' },
      { id: 'plan', label: 'Generate Action Plan' }
    ];
  }

  openIncomingCandidatures(): void {
    this.showOpsPanel = true;
    this.opsLoading = true;
    this.opsPanelTitle = '👁️ Incoming Candidatures Radar';
    this.opsCards = [];
    this.opsTips = [];
    this.freelanceService.mesMissions().subscribe({
      next: missions => {
        const target = missions.filter(m => m.statut === 'OUVERTE').slice(0, 3);
        if (target.length === 0) {
          this.opsLoading = false;
          this.opsCards = [{ title: 'No Open Missions', value: '0', subtitle: 'Publish a mission to receive candidates' }];
          return;
        }
        forkJoin(target.map(m => this.freelanceService.candidaturesDeMission(m.id))).subscribe({
          next: lists => {
            const totals = lists.map((l, i) => ({
              mission: target[i].titre,
              total: l.length,
              pending: l.filter(c => c.statut === 'EN_ATTENTE' || c.statut === 'SHORTLISTEE').length
            }));
            const pendingAll = totals.reduce((a, x) => a + x.pending, 0);
            const totalAll = totals.reduce((a, x) => a + x.total, 0);
            const hottest = [...totals].sort((a, b) => b.pending - a.pending)[0];
            this.opsCards = [
              { title: 'Total Incoming', value: `${totalAll}`, subtitle: `Across ${target.length} open missions` },
              { title: 'Pending to Review', value: `${pendingAll}`, subtitle: 'Candidates waiting your decision' },
              { title: 'Most Urgent Mission', value: hottest?.mission || '-', subtitle: `${hottest?.pending || 0} pending` }
            ];
            this.opsTips = ['Review pending candidatures daily.', 'Shortlist first, then hire from top-ranked profiles.'];
            this.opsActions = [
              { id: 'copy', label: 'Copy Summary' },
              { id: 'refresh', label: 'Refresh' },
              { id: 'plan', label: 'Generate Action Plan' }
            ];
            this.opsLoading = false;
          },
          error: () => {
            this.opsLoading = false;
            this.showNotice('Impossible de charger les candidatures entrantes.', 'error');
          }
        });
      },
      error: () => {
        this.opsLoading = false;
        this.showNotice('Impossible de charger vos missions.', 'error');
      }
    });
  }

  openBudgetOverview(): void {
    this.showOpsPanel = true;
    this.opsLoading = true;
    this.opsPanelTitle = '💵 Budget Allocation Insights';
    this.opsCards = [];
    this.opsTips = [];
    this.freelanceService.mesMissions().subscribe({
      next: missions => {
        const totalBudget = missions.reduce((a, m) => a + (m.budget || 0), 0);
        const openBudget = missions.filter(m => m.statut === 'OUVERTE').reduce((a, m) => a + (m.budget || 0), 0);
        const inProgressBudget = missions.filter(m => m.statut === 'EN_COURS').reduce((a, m) => a + (m.budget || 0), 0);
        this.opsCards = [
          { title: 'Total Budget', value: `${Math.round(totalBudget).toLocaleString()} TND`, subtitle: `${missions.length} missions` },
          { title: 'Open Missions Budget', value: `${Math.round(openBudget).toLocaleString()} TND`, subtitle: 'Still recruiting' },
          { title: 'In Progress Budget', value: `${Math.round(inProgressBudget).toLocaleString()} TND`, subtitle: 'Contracts active now' }
        ];
        this.opsTips = ['Close stalled missions to rebalance budget.', 'Prioritize high-value roles with strong match scores.'];
        this.opsActions = [
          { id: 'copy', label: 'Copy Summary' },
          { id: 'refresh', label: 'Refresh' },
          { id: 'plan', label: 'Generate Action Plan' }
        ];
        this.opsLoading = false;
      },
      error: () => {
        this.opsLoading = false;
        this.showNotice('Impossible de charger la vue budget.', 'error');
      }
    });
  }

  openContractsAndLegal(): void {
    this.showOpsPanel = true;
    this.opsLoading = false;
    this.opsPanelTitle = '📁 Contrats & Juridique';
    this.opsPanelKey = 'contracts_legal';
    this.legalDocsView = 'contracts';
    // Keep this folder focused on contracts/invoices only.
    this.opsCards = [];
    this.opsTips = [];
    this.opsActions = [];
  }

  setLegalDocsView(view: 'contracts' | 'invoices'): void {
    this.legalDocsView = view;
  }

  showNotice(message: string, type: 'success' | 'error'): void {
    this.uiNotice = message;
    this.uiNoticeType = type;
    setTimeout(() => {
      if (this.uiNotice === message) this.uiNotice = '';
    }, 4500);
  }

  runOpsAction(actionId: string): void {
    if (actionId === 'refresh') {
      if (this.opsPanelTitle.includes('Approval')) this.openApprovalInsights();
      else if (this.opsPanelTitle.includes('Financial')) this.openFinancialDashboard();
      else if (this.opsPanelTitle.includes('Incoming')) this.openIncomingCandidatures();
      else if (this.opsPanelTitle.includes('Budget')) this.openBudgetOverview();
      else this.openContractsAndLegal();
      return;
    }

    if (actionId === 'copy') {
      const text = this.buildOpsSummaryText();
      navigator.clipboard?.writeText(text).then(
        () => this.showNotice('Summary copied to clipboard.', 'success'),
        () => this.showNotice('Unable to copy summary.', 'error')
      );
      return;
    }

    if (actionId === 'plan') {
      this.opsTips = [
        ...this.opsTips,
        'Assign top priority to the highest-impact metric this week.',
        'Review progress every 48h and adjust actions quickly.'
      ];
      this.showNotice('Action plan generated.', 'success');
    }
  }

  private buildOpsSummaryText(): string {
    const cards = this.opsCards.map(c => `- ${c.title}: ${c.value} (${c.subtitle})`).join('\n');
    const tips = this.opsTips.map(t => `- ${t}`).join('\n');
    return `${this.opsPanelTitle}\n\nMetrics:\n${cards}\n\nNext Steps:\n${tips}`;
  }

  getOpsHeadline(): string {
    if (this.opsPanelKey === 'contracts_legal') {
      const contractCount = this.dashboardContracts?.length || 0;
      const invoiceCount = this.dashboardInvoices?.length || 0;
      return `${contractCount} contrat(s) • ${invoiceCount} facture(s) PDF`;
    }
    if (!this.opsCards.length) return 'No insights available yet.';
    const top = this.opsCards[0];
    return `${top.title}: ${top.value} (${top.subtitle})`;
  }

  navigateToMission(id: number): void {
    this.router.navigate(['/freelance/projects', id]);
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  getEventTimeLabel(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  getEventTypeIcon(type: string): string {
    const map: any = {
      'INTERVIEW': '🎙️',
      'DEADLINE': '⏰',
      'MEETING': '🤝',
      'REVIEW': '📋',
      'MILESTONE': '🏁'
    };
    return map[type] || '📅';
  }

  private normalizeSkillToken(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9+#.-]/gi, '');
  }

  private extractCandidateSkillLabels(candidate: any): string[] {
    if (!candidate) {
      return [];
    }
    const raw = candidate.competences || candidate.competenceList || candidate.skills || [];
    const out: string[] = [];
    if (Array.isArray(raw)) {
      for (const c of raw) {
        if (typeof c === 'string') {
          out.push(c);
        } else if (c?.nom) {
          out.push(String(c.nom));
        } else if (c?.libelle) {
          out.push(String(c.libelle));
        } else if (c?.competence?.nom) {
          out.push(String(c.competence.nom));
        }
      }
    }
    return [...new Set(out.map(s => s.trim()).filter(Boolean))];
  }

  private buildMissionSkillMatch(m: Mission, skillSet: Set<string>): MatchResult {
    const missionCompetences = m.competences || [];
    const normalizedMission = missionCompetences
      .map(c => this.normalizeSkillToken(String(c)))
      .filter(Boolean);
    const matching: string[] = [];
    for (const mc of missionCompetences) {
      const n = this.normalizeSkillToken(String(mc));
      if (!n) {
        continue;
      }
      for (const userSkill of skillSet) {
        if (!userSkill) {
          continue;
        }
        if (n === userSkill || n.includes(userSkill) || userSkill.includes(n)) {
          matching.push(String(mc));
          break;
        }
      }
    }
    const total = normalizedMission.length || 1;
    const uniq = [...new Set(matching)];
    const score = uniq.length;
    const pct = Math.min(100, Math.round((score / total) * 100));
    return {
      id: m.id,
      titre: m.titre,
      description: m.description,
      budget: m.budget,
      competences: m.competences,
      statut: m.statut,
      matchScore: score,
      matchPercent: pct,
      matchingSkills: uniq
    };
  }
}