import { Component, OnInit } from '@angular/core';
import { FreelanceService } from './services/freelance.service';

@Component({
  selector: 'app-mes-candidatures',
  standalone: false,
  templateUrl: './mes-candidatures.component.html'
})
export class MesCandidaturesComponent implements OnInit {
  candidatures: any[] = [];
  totalElements = 0;
  currentPage = 0;
  pageSize = 12;
  loading = true;
  erreur = '';
  searchTerm = '';
  statusFilter: 'ALL' | 'EN_ATTENTE' | 'ACCEPTEE' | 'REJETEE' = 'ALL';
  sortMode: 'recent' | 'oldest' = 'recent';

  constructor(private freelanceService: FreelanceService) {}

  ngOnInit(): void {
    this.fetchCandidatures();
  }

  private getPostulationTs(c: any): number {
    if (!c?.datePostulation) return 0;
    const t = new Date(c.datePostulation).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  resolveMissionId(c: any): number | null {
    const id = c?.missionId ?? c?.mission?.id ?? null;
    return id === null || id === undefined ? null : Number(id);
  }

  getMissionRoute(c: any): any[] {
    const id = this.resolveMissionId(c);
    return id ? ['/freelance/projects', id] : ['/freelance/projects'];
  }

  fetchCandidatures(page = 0): void {
    this.loading = true;
    this.currentPage = page;
    const params: Record<string, string> = {
      page: String(this.currentPage),
      size: String(this.pageSize),
      sortBy: 'datePostulation',
      sortDir: this.sortMode === 'recent' ? 'desc' : 'asc'
    };
    if (this.statusFilter !== 'ALL') params['statut'] = this.statusFilter;
    if (this.searchTerm.trim()) params['search'] = this.searchTerm.trim();
    this.freelanceService.searchMesCandidatures(params).subscribe({
      next: (res) => {
        this.candidatures = res.content || [];
        this.totalElements = res.totalElements || 0;
        this.loading = false;
      },
      error: () => {
        this.erreur = 'Erreur de chargement des candidatures.';
        this.loading = false;
      }
    });
  }

  onFiltersChanged(): void {
    this.fetchCandidatures(0);
  }

  nextPage(): void {
    if ((this.currentPage + 1) * this.pageSize < this.totalElements) this.fetchCandidatures(this.currentPage + 1);
  }

  previousPage(): void {
    if (this.currentPage > 0) this.fetchCandidatures(this.currentPage - 1);
  }
}
