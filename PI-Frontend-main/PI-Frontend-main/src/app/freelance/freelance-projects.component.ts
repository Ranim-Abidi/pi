import { Component, OnInit } from '@angular/core';
import { FreelanceService, Mission } from './services/freelance.service';

@Component({
  selector: 'app-freelance-projects',
  standalone: false,
  templateUrl: './freelance-projects.component.html'
})
export class FreelanceProjectsComponent implements OnInit {
  missions: Mission[] = [];
  totalElements = 0;
  currentPage = 0;
  pageSize = 12;
  loading = true;
  erreur = '';
  searchTerm = '';
  statusFilter: 'ALL' | 'OUVERTE' | 'EN_COURS' | 'FERMEE' = 'ALL';
  sortMode: 'RECENT' | 'BUDGET_DESC' | 'BUDGET_ASC' = 'RECENT';

  constructor(private freelanceService: FreelanceService) {}

  ngOnInit(): void {
    this.fetchMissions();
  }

  fetchMissions(page = 0): void {
    this.loading = true;
    this.currentPage = page;
    const params: Record<string, string> = {
      page: String(this.currentPage),
      size: String(this.pageSize),
      sortBy: this.sortMode === 'RECENT' ? 'dateCreation' : 'budget',
      sortDir: this.sortMode === 'BUDGET_ASC' ? 'asc' : 'desc'
    };
    if (this.searchTerm.trim()) params['skill'] = this.searchTerm.trim();
    if (this.statusFilter !== 'ALL') params['status'] = this.statusFilter;
    this.freelanceService.searchMissions(params).subscribe({
      next: (res) => {
        this.missions = res.content || [];
        this.totalElements = res.totalElements || 0;
        this.loading = false;
      },
      error: () => {
        this.erreur = 'Erreur de chargement des missions.';
        this.loading = false;
      }
    });
  }

  onFiltersChanged(): void {
    this.fetchMissions(0);
  }

  nextPage(): void {
    const maxPage = Math.max(Math.ceil(this.totalElements / this.pageSize) - 1, 0);
    if (this.currentPage < maxPage) this.fetchMissions(this.currentPage + 1);
  }

  previousPage(): void {
    if (this.currentPage > 0) this.fetchMissions(this.currentPage - 1);
  }
}