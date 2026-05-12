import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { interval } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { FilterPipe } from '../../pipes/filter.pipe';

@Component({
  selector: 'app-cd-mailbox',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterPipe],
  templateUrl: './cd-mailbox.component.html',
  styleUrls: ['./cd-mailbox.component.scss']
})
export class CdMailboxComponent implements OnInit {
  messages: any[] = [];
  filteredMessages: any[] = [];
  loading = false;
  selectedMessage: any = null;
  showDetailModal = false;
  selectedFilter = 'tous'; // tous, nonLus, acceptation, rejet
  searchTerm = '';
  
  // Pagination
  pageSize = 5;
  currentPage = 1;
  totalMessages = 0;
  
  // Refresh interval
  refreshInterval: any;

  constructor(
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadMessages();
    // Rafraîchir automatiquement tous les 30 secondes
    this.refreshInterval = interval(30000).pipe(
      startWith(0)
    ).subscribe(() => {
      this.loadMessages();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  // Charger les messages
  loadMessages(): void {
    this.loading = true;
    this.apiService.getMessagesForCandidat().subscribe({
      next: (data) => {
        this.messages = data || [];
        this.totalMessages = this.messages.length;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des messages:', err);
        this.notifyError('Erreur lors du chargement des messages');
        this.loading = false;
      }
    });
  }

  // Appliquer les filtres
  applyFilters(): void {
    let filtered = this.messages;

    // Filtrer par type de message
    switch (this.selectedFilter) {
      case 'nonLus':
        filtered = filtered.filter(m => !m.lu);
        break;
      case 'acceptation':
        filtered = filtered.filter(m => m.type === 'ACCEPTATION');
        break;
      case 'rejet':
        filtered = filtered.filter(m => m.type === 'REJET');
        break;
      case 'entretien':
        filtered = filtered.filter(m => m.type === 'ENTRETIEN');
        break;
      default:
        // tous - pas de filtre
    }

    // Filtrer par recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        (m.subject && m.subject.toLowerCase().includes(term)) ||
        (m.contenu && m.contenu.toLowerCase().includes(term))
      );
    }

    this.filteredMessages = filtered;
    this.currentPage = 1; // Reset à la première page
  }

  // Afficher les détails d'un message
  showDetails(message: any): void {
    this.selectedMessage = message;
    this.showDetailModal = true;
    
    // Marquer comme lu
    if (!message.lu) {
      this.marquerCommeL(message);
    }
  }

  // Fermer la modal
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedMessage = null;
  }

  // Marquer un message comme lu
  marquerCommeL(message: any): void {
    this.apiService.marquerMessageCommeL(message.id).subscribe({
      next: (response) => {
        message.lu = true;
        // Mise à jour du message dans la liste
        const index = this.messages.findIndex(m => m.id === message.id);
        if (index !== -1) {
          this.messages[index].lu = true;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour:', err);
      }
    });
  }

  // Supprimer un message
  supprimerMessage(message: any): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce message?')) {
      this.apiService.supprimerMessage(message.id).subscribe({
        next: () => {
          this.notifySuccess('Message supprimé');
          this.messages = this.messages.filter(m => m.id !== message.id);
          this.applyFilters();
          this.closeDetailModal();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          this.notifyError('Erreur lors de la suppression du message');
        }
      });
    }
  }

  // Paginer
  get paginatedMessages(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredMessages.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredMessages.length / this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Obtenir l'icône du type de message
  getMessageIcon(type: string): string {
    switch (type) {
      case 'ACCEPTATION':
        return 'fas fa-check-circle';
      case 'REJET':
        return 'fas fa-times-circle';
      case 'ENTRETIEN':
        return 'fas fa-calendar';
      default:
        return 'fas fa-envelope';
    }
  }

  // Obtenir la couleur du type de message
  getMessageColor(type: string): string {
    switch (type) {
      case 'ACCEPTATION':
        return 'success';
      case 'REJET':
        return 'danger';
      case 'ENTRETIEN':
        return 'info';
      default:
        return 'secondary';
    }
  }

  // Formater la date
  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // Obtenir la classe CSS pour le message
  getMessageClass(message: any): string {
    let classes = 'message-item';
    if (!message.lu) classes += ' non-lu';
    return classes;
  }

  // Obtenir le nombre de messages non lus
  getNonLusCount(): number {
    return this.messages.filter(m => !m.lu).length;
  }

  getAcceptationCount(): number {
    return this.messages.filter(m => m.type === 'ACCEPTATION').length;
  }

  getRejetCount(): number {
    return this.messages.filter(m => m.type === 'REJET').length;
  }

  private notifySuccess(message: string): void {
    console.log(message);
  }

  private notifyError(message: string): void {
    console.error(message);
  }
}
