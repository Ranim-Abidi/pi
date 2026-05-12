import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ParcoursService } from '../../formations/services/parcours.service';
import { ParcoursFormation } from '../../formations/models/parcours.model';
import { Formation } from '../../formations/models/formation.model';
import { FormationService } from '../../formations/services/formation.service';


@Component({
  selector: 'app-parcours-admin',
  standalone: false,
  templateUrl: './parcours-admin.component.html',
  styleUrls: ['./parcours-admin.component.scss']
})
export class ParcoursAdminComponent implements OnInit {

  parcours: ParcoursFormation[] = [];
  loading = true;
  confirmDelete: number | null = null;
  activeTab: 'actives' | 'archivees' = 'actives';


  constructor(
    private parcoursService: ParcoursService,
    private formationService: FormationService, // For archive/delete actions on formations
    private router: Router
  ) {}

  get flattenedParcours(): any[] {
    const rows: any[] = [];
    this.parcours.forEach(p => {
      if (p.niveauDebutant)     rows.push({ ...p.niveauDebutant,     parcoursId: p.id, parcoursTitre: p.titre, labelNiveau: 'Débutant' });
      if (p.niveauIntermediaire) rows.push({ ...p.niveauIntermediaire, parcoursId: p.id, parcoursTitre: p.titre, labelNiveau: 'Intermédiaire' });
      if (p.niveauAvance)       rows.push({ ...p.niveauAvance,       parcoursId: p.id, parcoursTitre: p.titre, labelNiveau: 'Avancé' });
      if (p.niveauExpert)        rows.push({ ...p.niveauExpert,        parcoursId: p.id, parcoursTitre: p.titre, labelNiveau: 'Expert' });
    });
    return rows.filter(r => {
      if (this.activeTab === 'actives') return r.statut !== 'Archivée';
      return r.statut === 'Archivée';
    });
  }



  ngOnInit(): void {
    this.loadParcours();
  }

  loadParcours(): void {
    this.loading = true;
    this.parcoursService.getAll().subscribe({
      next: (data) => { this.parcours = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  creer(): void {
    this.router.navigate(['/admin-dashboard/parcours/create']);
  }

  supprimer(id: number): void {
    if (!confirm('Supprimer définitivement ce parcours ?')) return;
    this.parcoursService.delete(id).subscribe({
      next: () => {
        this.parcours = this.parcours.filter(p => p.id !== id);
        this.confirmDelete = null;
      },
      error: (err) => console.error('Erreur suppression:', err)
    });
  }

  // --- Actions mirroring Formations logic ---
  archiver(id: number, currentStatut: string): void {
    const isArchived = currentStatut === 'Archivée';
    const msg = isArchived ? 'Désarchiver cette formation ?' : 'Archiver cette formation ?';
    if (!confirm(msg)) return;
    
    const obs$ = isArchived 
      ? this.formationService.desarchiverFormation(id)
      : this.formationService.archiverFormation(id);
      
    obs$.subscribe({
      next: () => this.loadParcours(),
      error: (err) => console.error('Erreur toggle archive:', err)
    });
  }

  deleteFormation(id: number): void {
    if (!confirm('Supprimer cette formation ? (Attention, cela cassera le parcours associé)')) return;
    this.formationService.deleteFormation(id).subscribe({
      next: () => this.loadParcours(),
      error: (err) => console.error('Erreur delete formation:', err)
    });
  }

  getNiveauTag(niveau: string): string {
    const map: Record<string, string> = {
      'Débutant': 'tag-green', 'Intermédiaire': 'tag-blue',
      'Avancé': 'tag-amber',   'Expert': 'tag-purple'
    };
    return map[niveau] || 'tag-blue';
  }

  getStatutTag(statut: string): string {
    const map: Record<string, string> = {
      'Disponible': 'tag-green', 'Bientôt': 'tag-amber', 'Archivée': 'tag-gray'
    };
    return map[statut] || 'tag-gray';
  }
}

