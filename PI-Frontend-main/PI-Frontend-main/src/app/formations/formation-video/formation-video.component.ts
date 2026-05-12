import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Formation } from '../models/formation.model';
import { FormationService } from '../services/formation.service';

@Component({
  selector: 'app-formation-video',
  standalone: false,
  templateUrl: './formation-video.component.html',
  styleUrls: ['./formation-video.component.scss']
})
export class FormationVideoComponent implements OnInit {
  formation!:     Formation;
  loading       = true;
  inscriptionId: number | null = null;
  candidatId:    number | null = null;
  parcoursId:    number | null = null;
  niveau:        string | null = null;
  isAlreadyCompleted = false;

  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private formationService = inject(FormationService);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.candidatId = Number(localStorage.getItem('candidatId')) || null;
    this.parcoursId = Number(this.route.snapshot.queryParamMap.get('parcoursId')) || null;
    this.niveau     = this.route.snapshot.queryParamMap.get('niveau');

    const completedParam = this.route.snapshot.queryParamMap.get('completed');
    this.isAlreadyCompleted = completedParam === 'true';

    // Try user-scoped key first, then fall back to legacy key (and then wipe it)
    if (this.candidatId) {
      const scopedKey = `candidat_${this.candidatId}_ins_${id}` + (this.parcoursId ? `_p${this.parcoursId}` : '');
      const scoped = Number(localStorage.getItem(scopedKey)) || null;
      if (scoped) {
        this.inscriptionId = scoped;
      }
      // Remove any old non-scoped key so it doesn't pollute next user's session
      localStorage.removeItem('inscription_' + id);
    }

    this.formationService.getFormationById(id).subscribe({
      next: (f) => {
        this.formation = f;

        // Always verify from backend for accuracy
        if (this.candidatId) {
          this.formationService.getInscriptionByDetails(this.candidatId, f.id, this.parcoursId || undefined).subscribe({
            next: (found) => {
              if (found) {
                this.inscriptionId = found.id;
                // Si l'URL n'avait pas les paramètres de parcours, on les restaure depuis la base
                if (!this.parcoursId && found.parcoursId) {
                  this.parcoursId = found.parcoursId;
                }
                if (!this.niveau && found.niveau) {
                  this.niveau = found.niveau;
                }
                
                // Persist with user-scoped key
                const scopedKey = `candidat_${this.candidatId}_ins_${f.id}` + (this.parcoursId ? `_p${this.parcoursId}` : '');
                localStorage.setItem(scopedKey, String(found.id));
              }
              this.loading = false;
            },
            error: () => {
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/formations']);
      }
    });
  }

  retour(): void {
    if (this.parcoursId) {
      this.router.navigate(['/formations/parcours', this.parcoursId]);
    } else {
      this.router.navigate(['/formations', this.formation.id]);
    }
  }
}