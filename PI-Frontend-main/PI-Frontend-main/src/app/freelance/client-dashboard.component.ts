import { Component, OnInit, OnDestroy } from '@angular/core';
import { FreelanceService, Mission, Candidature } from './services/freelance.service';
import { Router } from '@angular/router';
import { FreelanceWorkspaceService } from './services/freelance-workspace.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: false,
  templateUrl: './client-dashboard.component.html'
})
export class ClientDashboardComponent implements OnInit, OnDestroy {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  candidaturesMission: Candidature[] = [];
  missionSelectionnee?: number;
  missionSelectionneeDetails: Mission | null = null;
  showCandidaturesPanel = false;
  loadingCandidatures = false;
  loading = true;
  protected math = Math;
  sortMode: 'newest' | 'oldest' | 'budget_desc' | 'budget_asc' = 'newest';
  statusFilter: 'ALL' | 'OUVERTE' | 'EN_COURS' | 'FERMEE' = 'ALL';
  searchTerm = '';

  // Edit state
  editingMission: Mission | null = null;
  editForm = { titre: '', description: '', budget: 0, competences: '' };
  showEditMissionPanel = false;

  constructor(
    private freelanceService: FreelanceService,
    private workspaceService: FreelanceWorkspaceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.loading = true;
    const params: Record<string, string> = {
      onlyMine: 'true',
      page: '0',
      size: '100',
      sortBy: this.sortMode.includes('budget') ? 'budget' : 'dateCreation',
      sortDir: this.sortMode === 'oldest' || this.sortMode === 'budget_asc' ? 'asc' : 'desc'
    };
    if (this.searchTerm.trim()) params['skill'] = this.searchTerm.trim();
    if (this.statusFilter !== 'ALL') params['status'] = this.statusFilter;
    this.freelanceService.searchMissions(params).subscribe({
      next: (res) => {
        this.missions = res.content || [];
        this.filteredMissions = [...this.missions];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private getMissionTimestamp(mission: Mission): number {
    if (mission.dateCreation) {
      const t = new Date(mission.dateCreation).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return mission.id || 0;
  }

  ngOnDestroy(): void {
  }

  voirCandidatures(missionId: number): void {
    this.missionSelectionnee = missionId;
    this.missionSelectionneeDetails = this.missions.find(m => m.id === missionId) || null;
    this.showCandidaturesPanel = true;
    this.loadingCandidatures = true;
    this.freelanceService.candidaturesDeMission(missionId)
      .subscribe({
        next: c => {
          this.candidaturesMission = c;
          this.loadingCandidatures = false;
        },
        error: () => {
          this.candidaturesMission = [];
          this.loadingCandidatures = false;
        }
      });
  }

  closeCandidaturesPanel(): void {
    this.showCandidaturesPanel = false;
    this.missionSelectionnee = undefined;
    this.missionSelectionneeDetails = null;
    this.candidaturesMission = [];
  }

  // ── Edit ────────────────────────────────────────────────────────────

  startEdit(mission: Mission): void {
    this.editingMission = mission;
    this.editForm = {
      titre: mission.titre,
      description: mission.description,
      budget: mission.budget,
      competences: (mission.competences || []).join(', ')
    };
    this.showEditMissionPanel = true;
  }

  cancelEdit(): void {
    this.editingMission = null;
    this.showEditMissionPanel = false;
  }

  saveEdit(): void {
    if (!this.editingMission) return;
    const payload = {
      titre: this.editForm.titre,
      description: this.editForm.description,
      budget: this.editForm.budget,
      competences: this.editForm.competences.split(',').map(s => s.trim()).filter(s => s)
    };
    this.freelanceService.updateMission(this.editingMission.id, payload).subscribe({
      next: () => {
        this.editingMission = null;
        this.showEditMissionPanel = false;
        this.applyFilters();
      },
      error: () => alert('Erreur lors de la mise à jour.')
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────

  deleteMission(mission: Mission): void {
    this.freelanceService.deleteMission(mission.id).subscribe({
      error: () => alert('Erreur lors de la suppression.')
    });
  }

  // ── Accept / Reject candidatures ────────────────────────────────────

  accepter(candidature: Candidature): void {
    this.freelanceService.accepterCandidature(candidature.id).subscribe(updated => {
      const idx = this.candidaturesMission.findIndex(c => c.id === updated.id);
      if (idx >= 0) this.candidaturesMission[idx] = updated;
    });
  }

  rejeter(candidature: Candidature): void {
    this.freelanceService.rejeterCandidature(candidature.id).subscribe(updated => {
      const idx = this.candidaturesMission.findIndex(c => c.id === updated.id);
      if (idx >= 0) this.candidaturesMission[idx] = updated;
    });
  }

  isGeneratingContract = false;
  simulatedHash = '0000000000000000';
  private hashInterval: any;

  generateContract(c: Candidature): void {
    if (!this.missionSelectionnee) return;
    const mission = this.missions.find(m => m.id === this.missionSelectionnee);
    if (!mission) return;
    
    this.isGeneratingContract = true;
    
    // Animate the hash
    this.hashInterval = setInterval(() => {
      this.simulatedHash = Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
    }, 50);
    
    // Simulate Blockchain Verification before backend call
    setTimeout(() => {
      clearInterval(this.hashInterval);
      this.workspaceService.generateContract(mission.id, c.utilisateurId, mission.budget).subscribe({
        next: (contract) => {
          this.isGeneratingContract = false;
          this.router.navigate(['/freelance/workspace']);
        },
        error: () => {
          this.isGeneratingContract = false;
          alert('Erreur lors de la génération du contrat.');
        }
      });
    }, 2500);
  }
}