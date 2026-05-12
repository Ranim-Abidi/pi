import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Formation } from '../../formations/models/formation.model';
import { FormationService } from '../../formations/services/formation.service';
import { ParcoursService } from '../../formations/services/parcours.service';
import { ParcoursFormation } from '../../formations/models/parcours.model';

interface ContentItem {
  id: number;
  titre: string;
  categorie: string;
  niveau: string;
  statut: string;
  type: 'formation' | 'parcours';
  contentId?: number;
  niveaux?: { debut?: Formation; inter?: Formation; avance?: Formation; expert?: Formation };
  scorePopularite?: number;
  totalInscrits?: number;
  badge?: string;
}

@Component({
  selector: 'app-formations-admin',
  standalone: false,
  templateUrl: './formations-admin.component.html',
  styleUrls: ['./formations-admin.component.scss']
})
export class FormationsAdminComponent implements OnInit {
  private formationService = inject(FormationService);
  private parcoursService = inject(ParcoursService);
  private router = inject(Router);

  allFormations: Formation[] = [];  // Toutes formations du backend
  parcours: ParcoursFormation[] = [];

  /** IDs des formations déjà rattachées à un parcours */
  private get parcoursFormationIds(): Set<number> {
    const ids = new Set<number>();
    this.parcours.forEach(p => {
      if (p.niveauDebutant?.id)      ids.add(Number(p.niveauDebutant.id));
      if (p.niveauIntermediaire?.id) ids.add(Number(p.niveauIntermediaire.id));
      if (p.niveauAvance?.id)        ids.add(Number(p.niveauAvance.id));
      if (p.niveauExpert?.id)        ids.add(Number(p.niveauExpert.id));
    });
    return ids;
  }

  /** Formations standalone (non rattachées à un parcours) */
  get actives(): Formation[] {
    const usedIds = this.parcoursFormationIds;
    return this.allFormations.filter(f => f.statut !== 'Archivée' && !usedIds.has(Number(f.id)));
  }

  get archivees(): Formation[] {
    const usedIds = this.parcoursFormationIds;
    return this.allFormations.filter(f => f.statut === 'Archivée' && !usedIds.has(Number(f.id)));
  }

  get activeParcoursCount(): number {
    return this.parcours.filter(p => p.statut !== 'Archivée').length;
  }

  get archivedParcoursCount(): number {
    return this.parcours.filter(p => p.statut === 'Archivée').length;
  }

  loading       = false;
  deletingId:   number | null = null;
  archivingId:  number | null = null;
  activeTab: 'actives' | 'archivees' = 'actives';
  showTypeModal = false;


  searchTerm: string = '';
  filterNiveau: string = '';
  filterStatut: string = '';
  currentPage: number = 1;
  pageSize: number = 5;

  // Contenu unifié (formations + parcours)
  get unifiedContent(): ContentItem[] {
    const items: ContentItem[] = [];

    // Ajouter les formations
    const formationList = this.activeTab === 'actives' ? this.actives : this.archivees;
    formationList.forEach(f => {
      items.push({
        id: f.id,
        titre: f.titre,
        categorie: f.categorie,
        niveau: f.niveau,
        statut: f.statut,
        type: 'formation',
        scorePopularite: f.scorePopularite,
        totalInscrits: f.totalInscrits,
        badge: f.badge
      });
    });

    // Ajouter les parcours (filtrés selon l'onglet actif)
    const parcoursActifs  = this.parcours.filter(p => p.statut !== 'Archivée');
    const parcoursArchive = this.parcours.filter(p => p.statut === 'Archivée');
    const parcoursList = this.activeTab === 'actives' ? parcoursActifs : parcoursArchive;

    parcoursList.forEach(p => {
      items.push({
        id: p.id,
        titre: p.titre,
        categorie: p.categorie,
        niveau: 'Complet',
        statut: p.statut || 'Disponible',
        type: 'parcours',
        contentId: p.id,
        niveaux: {
          debut: p.niveauDebutant,
          inter: p.niveauIntermediaire,
          avance: p.niveauAvance,
          expert: p.niveauExpert
        },
        scorePopularite: p.scorePopularite || 0,
        totalInscrits: p.totalInscrits || 0,
        badge: p.niveauDebutant?.badge || p.niveauIntermediaire?.badge || p.niveauAvance?.badge || p.niveauExpert?.badge
      });
    });

    return items.filter(item => {
      const matchSearch = item.titre.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                         item.categorie.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchNiv = this.filterNiveau ? item.niveau === this.filterNiveau : true;
      const matchStatut = this.filterStatut ? item.statut === this.filterStatut : true;
      return matchSearch && matchNiv && matchStatut;
    });
  }

  get paginatedContent(): ContentItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.unifiedContent.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.unifiedContent.length / this.pageSize);
  }

  get filteredFormations(): Formation[] {
    const list = this.activeTab === 'actives' ? this.actives : this.archivees;
    return list.filter(f => {
      const matchSearch = f.titre.toLowerCase().includes(this.searchTerm.toLowerCase()) || f.categorie.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchNiv = this.filterNiveau ? f.niveau === this.filterNiveau : true;
      const matchStatut = this.filterStatut ? f.statut === this.filterStatut : true;
      return matchSearch && matchNiv && matchStatut;
    });
  }

  getPageNumbers(): number[] {
    const total = this.totalPages;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  ngOnInit(): void {
    this.refresh();
    this.loadParcours();
  }

  refresh(): void {
    this.loading = true;
    this.formationService.getAllFormationsAdmin().subscribe({
      next: (data) => {
        this.allFormations = data;
        this.loading = false;

        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        } else if (this.totalPages === 0) {
          this.currentPage = 1;
        }
      },
      error: () => { this.loading = false; }
    });
  }

  loadParcours(): void {
    this.parcoursService.getAll().subscribe({
      next: (data) => { this.parcours = data || []; },
      error: () => { this.parcours = []; }
    });
  }

  creerFormation(): void {
    this.router.navigate(['/admin-dashboard/formations/create']);
  }

  creerParcours(): void {
    this.router.navigate(['/admin-dashboard/parcours/create']);
  }

  delete(id: number, type: 'formation' | 'parcours'): void {
    const msg = type === 'formation' 
      ? 'Supprimer définitivement cette formation ?' 
      : 'Supprimer définitivement ce parcours et toutes ses associations ?';
    
    if (!confirm(msg)) return;
    
    this.deletingId = id;
    
    if (type === 'formation') {
      this.formationService.deleteFormation(id).subscribe({
        next: () => { this.deletingId = null; this.refresh(); },
        error: () => { this.deletingId = null; }
      });
    } else {
      this.parcoursService.delete(id).subscribe({
        next: () => { this.deletingId = null; this.loadParcours(); },
        error: () => { this.deletingId = null; }
      });
    }
  }

  archivingParcoursId: number | null = null;

  archiver(id: number): void {
    if (!confirm('Archiver cette formation ? Elle ne sera plus visible dans la liste publique.')) return;
    this.archivingId = id;
    this.formationService.archiverFormation(id).subscribe({
      next: () => { this.archivingId = null; this.refresh(); },
      error: () => { this.archivingId = null; }
    });
  }

  archiverParcours(id: number): void {
    if (!confirm('Archiver ce parcours ? Il ne sera plus visible dans la liste publique.')) return;
    this.archivingParcoursId = id;
    this.parcoursService.archiver(id).subscribe({
      next: () => {
        const p = this.parcours.find(x => x.id === id);
        if (p) p.statut = 'Archivée';
        this.archivingParcoursId = null;
        this.loadParcours();
        this.refresh(); // Refresh formation statues too
      },
      error: (err) => {
        this.archivingParcoursId = null;
        alert(`Erreur lors de l'archivage : ${err?.status === 404 ? 'Endpoint introuvable sur le serveur (404).' : err?.message || 'Erreur serveur.'}`);
      }
    });
  }

  desarchiver(id: number): void {
    if (!confirm('Désarchiver cette formation ? Elle sera à nouveau visible dans la liste publique.')) return;
    this.archivingId = id;
    this.formationService.desarchiverFormation(id).subscribe({
      next: () => { this.archivingId = null; this.refresh(); },
      error: () => { this.archivingId = null; }
    });
  }

  desarchiverParcours(id: number): void {
    if (!confirm('Désarchiver ce parcours ? Il sera à nouveau visible dans la liste publique.')) return;
    this.archivingParcoursId = id;
    this.parcoursService.desarchiver(id).subscribe({
      next: () => {
        const p = this.parcours.find(x => x.id === id);
        if (p) p.statut = 'Disponible';
        this.archivingParcoursId = null;
        this.loadParcours();
        this.refresh(); // Refresh formation statues too
      },
      error: () => { this.archivingParcoursId = null; }
    });
  }


  getCount(statut: string): number {
    const usedIds = this.parcoursFormationIds;
    const formationsCount = this.allFormations.filter(f => f.statut === statut && !usedIds.has(Number(f.id))).length;
    const parcoursCount = this.parcours.filter(p => p.statut === statut || (statut === 'Disponible' && !p.statut)).length;
    return formationsCount + parcoursCount;
  }

  get totalFormations(): number {
    const usedIds = this.parcoursFormationIds;
    const standaloneCount = this.allFormations.filter(f => !usedIds.has(Number(f.id))).length;
    return standaloneCount + this.parcours.length;
  }

  get archivedCount(): number {
    const usedIds = this.parcoursFormationIds;
    const formationsArchived = this.allFormations.filter(f => f.statut === 'Archivée' && !usedIds.has(Number(f.id))).length;
    const parcoursArchived = this.parcours.filter(p => p.statut === 'Archivée').length;
    return formationsArchived + parcoursArchived;
  }

  getNiveauTag(niveau: string): string {
    const map: Record<string, string> = {
      'Débutant': 'tag-green', 'Intermédiaire': 'tag-blue',
      'Avancé': 'tag-amber',   'Expert': 'tag-purple',
      'Complet': 'tag-purple'
    };
    return map[niveau] || 'tag-blue';
  }

  getStatutTag(statut: string): string {
    const map: Record<string, string> = {
      'Disponible': 'tag-green', 'Bientôt': 'tag-amber', 'Archivée': 'tag-gray'
    };
    return map[statut] || 'tag-gray';
  }

  setTab(tab: 'actives' | 'archivees'): void {
    this.activeTab = tab;
    this.searchTerm = '';
    this.filterNiveau = '';
    this.filterStatut = '';
    this.currentPage = 1;
  }
}