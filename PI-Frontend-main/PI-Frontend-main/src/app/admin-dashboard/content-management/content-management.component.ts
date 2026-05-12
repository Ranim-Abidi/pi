import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Formation } from '../../formations/models/formation.model';
import { ParcoursFormation } from '../../formations/models/parcours.model';
import { FormationService } from '../../formations/services/formation.service';
import { ParcoursService } from '../../formations/services/parcours.service';

@Component({
  selector: 'app-content-management',
  standalone: false,
  templateUrl: './content-management.component.html',
  styleUrls: ['./content-management.component.scss']
})
export class ContentManagementComponent implements OnInit {
  private formationService = inject(FormationService);
  private parcoursService = inject(ParcoursService);
  private router = inject(Router);

  // Formations
  formations: Formation[] = [];
  formationLoading = false;
  searchTerm = '';
  filterNiveau = '';
  
  // Parcours
  parcours: ParcoursFormation[] = [];
  parcoursLoading = false;

  // States
  deletingId: number | null = null;
  archivingId: number | null = null;

  ngOnInit(): void {
    this.loadFormations();
    this.loadParcours();
  }

  loadFormations(): void {
    this.formationLoading = true;
    this.formationService.getAllFormationsAdmin().subscribe({
      next: (data) => {
        this.formations = data.filter(f => f.statut !== 'Archivée');
        this.formationLoading = false;
      },
      error: () => { this.formationLoading = false; }
    });
  }

  loadParcours(): void {
    this.parcoursLoading = true;
    this.parcoursService.getAll().subscribe({
      next: (data) => {
        this.parcours = data || [];
        this.parcoursLoading = false;
      },
      error: () => {
        this.parcours = [];
        this.parcoursLoading = false;
      }
    });
  }

  get filteredFormations(): Formation[] {
    const usedIds = this.formationsInParcours;
    return this.formations.filter(f => {
      const isUsed = usedIds.has(f.id);
      const matchSearch = f.titre.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                         f.categorie.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchNiv = this.filterNiveau ? f.niveau === this.filterNiveau : true;
      
      // On ne garde que les formations qui ne sont pas déjà dans un parcours
      return !isUsed && matchSearch && matchNiv;
    });
  }

  // Formations utilisées dans les parcours
  get formationsInParcours(): Set<number> {
    const ids = new Set<number>();
    this.parcours.forEach(p => {
      if (p.niveauDebutant) ids.add(p.niveauDebutant.id);
      if (p.niveauIntermediaire) ids.add(p.niveauIntermediaire.id);
      if (p.niveauAvance) ids.add(p.niveauAvance.id);
      if (p.niveauExpert) ids.add(p.niveauExpert.id);
    });
    return ids;
  }

  get coverageStats() {
    const total = this.formations.length;
    const used = Array.from(this.formationsInParcours).length;
    const unused = total - used;
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    return { total, used, unused, percentage };
  }

  creerFormation(): void {
    this.router.navigate(['/admin-dashboard/formations/create']);
  }

  creerParcours(): void {
    this.router.navigate(['/admin-dashboard/parcours/create']);
  }

  archiver(id: number): void {
    if (!confirm('Archiver cette formation ?')) return;
    this.archivingId = id;
    this.formationService.archiverFormation(id).subscribe({
      next: () => { this.archivingId = null; this.loadFormations(); },
      error: () => { this.archivingId = null; }
    });
  }

  delete(id: number): void {
    if (!confirm('Supprimer définitivement cette formation ?')) return;
    this.deletingId = id;
    this.formationService.deleteFormation(id).subscribe({
      next: () => { this.deletingId = null; this.loadFormations(); },
      error: () => { this.deletingId = null; }
    });
  }

  deleteParcours(id: number): void {
    if (!confirm('Supprimer ce parcours ?')) return;
    this.deletingId = id;
    this.parcoursService.delete(id).subscribe({
      next: () => { this.deletingId = null; this.loadParcours(); },
      error: () => { this.deletingId = null; }
    });
  }

  getNiveauTag(niveau: string): string {
    const map: Record<string, string> = {
      'Débutant': 'tag-green',
      'Intermédiaire': 'tag-blue',
      'Avancé': 'tag-amber',
      'Expert': 'tag-purple'
    };
    return map[niveau] || 'tag-blue';
  }

  isFormationUsed(id: number): boolean {
    return this.formationsInParcours.has(id);
  }

  getParcoursPourFormation(formationId: number): string[] {
    const parcoursList: string[] = [];
    this.parcours.forEach(p => {
      if (p.niveauDebutant?.id === formationId) parcoursList.push(p.titre + ' (Débutant)');
      if (p.niveauIntermediaire?.id === formationId) parcoursList.push(p.titre + ' (Intermédiaire)');
      if (p.niveauAvance?.id === formationId) parcoursList.push(p.titre + ' (Avancé)');
      if (p.niveauExpert?.id === formationId) parcoursList.push(p.titre + ' (Expert)');
    });
    return parcoursList;
  }
}
