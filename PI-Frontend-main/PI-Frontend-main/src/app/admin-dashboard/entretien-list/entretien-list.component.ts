import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-entretien-list',
  standalone: false,
  templateUrl: './entretien-list.component.html',
  styleUrls: ['./entretien-list.component.scss']
})
export class EntretienListComponent implements OnInit {
  entretiens: any[] = [];
  filteredEntretiens: any[] = [];
  searchTerm = '';
  loading = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadEntretiens();
  }

  loadEntretiens(): void {
    this.loading = true;
    this.apiService.getAllEntretiensForAdmin().subscribe({
      next: (data: any[]) => {
        this.entretiens = Array.isArray(data) ? data : [];
        this.filteredEntretiens = [...this.entretiens];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur chargement entretiens admin:', error);
        this.entretiens = [];
        this.filteredEntretiens = [];
        this.loading = false;
      }
    });
  }

  filterEntretiens(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEntretiens = [...this.entretiens];
      return;
    }

    const search = this.searchTerm.toLowerCase();
    this.filteredEntretiens = this.entretiens.filter(e =>
      (e.titre?.toLowerCase() || '').includes(search) ||
      (this.getRecruteur(e).toLowerCase() || '').includes(search) ||
      (e.type?.toLowerCase() || '').includes(search) ||
      (e.categorie?.toLowerCase() || '').includes(search)
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredEntretiens = [...this.entretiens];
  }

  accepterEntretien(entretien: any): void {
    this.updateStatut(entretien, 'ACCEPTE');
  }

  refuserEntretien(entretien: any): void {
    this.updateStatut(entretien, 'REFUSE');
  }

  private updateStatut(entretien: any, statut: 'ACCEPTE' | 'REFUSE'): void {
    const id = Number(entretien?.id);
    if (!id || isNaN(id) || id <= 0) {
      return;
    }

    this.apiService.updateEntretienStatutByAdmin(id, statut).subscribe({
      next: () => {
        entretien.statut = statut;
        entretien.status = statut;
      },
      error: (error: any) => {
        console.error(`Erreur mise a jour statut entretien ${id}:`, error);
        alert(`Impossible de mettre a jour le statut (${error?.status || '?'})`);
      }
    });
  }

  getStatut(entretien: any): string {
    const brut = (entretien?.statut || entretien?.status || entretien?.validationStatus || 'EN_ATTENTE').toString();
    return brut.toUpperCase();
  }

  getStatutLabel(entretien: any): string {
    const statut = this.getStatut(entretien);
    if (statut.includes('ACCEPT')) return 'Accepte';
    if (statut.includes('REFUS')) return 'Refuse';
    return 'En attente';
  }

  getStatutClass(entretien: any): string {
    const statut = this.getStatut(entretien);
    if (statut.includes('ACCEPT')) return 'tag-accepted';
    if (statut.includes('REFUS')) return 'tag-refused';
    return 'tag-pending';
  }

  canAccepter(entretien: any): boolean {
    return !this.getStatut(entretien).includes('ACCEPT');
  }

  canRefuser(entretien: any): boolean {
    return !this.getStatut(entretien).includes('REFUS');
  }

  getRecruteur(entretien: any): string {
    return entretien?.recruteur?.nom || entretien?.recruteurNom || entretien?.createdBy || '-';
  }

  formatDate(date: string): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
