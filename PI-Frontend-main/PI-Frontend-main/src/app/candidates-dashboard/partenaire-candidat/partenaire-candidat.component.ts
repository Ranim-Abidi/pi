import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PartenaireService } from '../../services/partenaire.service';
import { OffrePartenaireService } from '../../services/offre-partenaire.service';

export interface FeaturesModele {
  nbOffres: number;
  activityRate: number;
  typePartenaire: string;
  tauxEpinglee: number;
  anciennete: number;
  nbOffreEmploi: number;
}

@Component({
  selector: 'app-partenaire-candidat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partenaire-candidat.component.html',
  styleUrls: ['./partenaire-candidat.component.scss']
})
export class PartenaireCandidatComponent implements OnInit {

  partenaires: any[] = [];
  topPartenaires: any[] = [];
  searchTerm: string = '';
  isFocused: boolean = false;
  activityRates: { [id: number]: number } = {};

  comparaisonMode: boolean = false;
  partenaireSelectionne1: any = null;
  partenaireSelectionne2: any = null;
  resultatComparaison: any = null;

  predictions: { [id: number]: any } = {};
  vues: { [id: number]: number } = {};

  predModalOuvert: boolean = false;
  partenaireActif: any = null;
  predictionActive: any = null;
  featuresActives: FeaturesModele | null = null;

  constructor(
    private partenaireService: PartenaireService,
    private router: Router,
    private offrePartenaireService: OffrePartenaireService
  ) {}

  ngOnInit(): void {
    this.loadPartenaires();
    this.loadTopPartenaires();
  }

  loadPartenaires(): void {
    this.partenaireService.getAll().subscribe({
      next: (data: any) => {
        this.partenaires = Array.isArray(data) ? data : data.content ?? [];
        this.partenaires.forEach(p => {
          this.loadActivityRate(p.id);
          this.loadPrediction(p.id);
          this.loadVues(p.id);
        });
      },
      error: (err: any) => console.error(err)
    });
  }

  loadTopPartenaires(): void {
    this.partenaireService.getTopPartenaires(3).subscribe({
      next: (data: any[]) => this.topPartenaires = data,
      error: (err: any) => console.error(err)
    });
  }

  loadActivityRate(id: number): void {
    this.partenaireService.getActivityRate(id).subscribe({
      next: (rate: number) => this.activityRates[id] = rate,
      error: () => this.activityRates[id] = 0
    });
  }

  loadPrediction(id: number): void {
  this.offrePartenaireService.predictML(id).subscribe({
    next: (pred: any) => {
      console.log('FLASK RESPONSE id=' + id, JSON.stringify(pred));
      this.predictions[id] = pred;
    },
    error: () => this.predictions[id] = {
      type: 'EMPLOI', probability: 50, confidence: 'LOW', probaStage: 50, probaEmploi: 50
    }
  });
}

  loadVues(id: number): void {
    this.partenaireService.getNombreVues(id).subscribe({
      next: (v: number) => this.vues[id] = v,
      error: () => this.vues[id] = 0
    });
  }

  getPredictionColor(pred: string): string {
    if (!pred) return '#6366f1';
    return pred.includes('EMPLOI') ? '#1d4ed8' : '#92400e';
  }

  getPredictionIcon(pred: string): string {
    if (!pred) return 'ri-question-line';
    return pred.includes('EMPLOI') ? 'ri-briefcase-line' : 'ri-graduation-cap-line';
  }

  getActivityLabel(rate: number): string {
    if (rate >= 2) return 'Très actif';
    if (rate >= 1) return 'Actif';
    if (rate > 0)  return 'Peu actif';
    return 'Inactif';
  }

  getActivityColor(rate: number): string {
    if (rate >= 2) return '#16a34a';
    if (rate >= 1) return '#f59e0b';
    if (rate > 0)  return '#f97316';
    return '#ef4444';
  }

  get filteredPartenaires(): any[] {
    if (!this.searchTerm.trim()) return this.partenaires;
    const term = this.searchTerm.toLowerCase().trim();
    return this.partenaires.filter(p =>
      p.nom?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.type?.toLowerCase().includes(term)
    );
  }

  getCount(type: string): number {
    return this.partenaires.filter(p => p.type === type).length;
  }

  selectionnerPourComparaison(p: any): void {
    if (!this.partenaireSelectionne1) {
      this.partenaireSelectionne1 = p;
    } else if (!this.partenaireSelectionne2 && p.id !== this.partenaireSelectionne1.id) {
      this.partenaireSelectionne2 = p;
      this.lancerComparaison();
    }
  }

  lancerComparaison(): void {
    if (!this.partenaireSelectionne1 || !this.partenaireSelectionne2) return;
    this.partenaireService.comparerPartenaires(
      this.partenaireSelectionne1.id,
      this.partenaireSelectionne2.id
    ).subscribe({
      next: (data: any) => this.resultatComparaison = data,
      error: (err: any) => console.error(err)
    });
  }

  resetComparaison(): void {
    this.comparaisonMode = false;
    this.partenaireSelectionne1 = null;
    this.partenaireSelectionne2 = null;
    this.resultatComparaison = null;
  }

  voirOffres(id: number): void {
    this.router.navigate(['/candidates-dashboard/partenaires', id, 'offres']);
  }

  // ── Popup Prédiction ─────────────────────────────────────
  
  


  ouvrirPrediction(p: any): void {
  this.partenaireActif = p;

  const pred = this.predictions[p.id] ?? {
    type: 'EMPLOI', probability: 50, confidence: 'LOW',
    probaEmploi: 50, probaStage: 50
  };

  this.predictionActive = pred;

  console.log('PRED OBJECT:', pred); // ← regarde ici dans la console

  this.featuresActives = {
    // activityRate fonctionne déjà
    activityRate: this.activityRates[p.id] ?? 0,

    // Les autres — essaie ces variantes selon ce que tu vois dans la console :
    nbOffres:       pred.nbOffres        ?? pred.nb_offres        ?? pred.nombreOffres     ?? 0,
    typePartenaire: pred.typePartenaire  ?? pred.type_partenaire  ?? p.type               ?? '—',
    tauxEpinglee:   pred.tauxEpinglee    ?? pred.taux_epinglee    ?? pred.tauxEpingle      ?? 0,
    anciennete:     pred.anciennete      ?? pred.ancienneté       ?? pred.anciennete_sem   ?? 0,
    nbOffreEmploi:  pred.nbOffreEmploi   ?? pred.nb_offre_emploi  ?? pred.nbOffresEmploi   ?? 0,
  };

  this.predModalOuvert = true;
  document.body.style.overflow = 'hidden';
}

  fermerPrediction(): void {
    this.predModalOuvert = false;
    this.partenaireActif = null;
    this.predictionActive = null;
    this.featuresActives = null;
    document.body.style.overflow = '';
  }

  isMedium(): boolean {
    return this.predictionActive?.type !== 'EMPLOI'
        && this.predictionActive?.type !== 'STAGE';
  }

  getGaugeOffset(pct: number = 0): number {
    return 263.9 * (1 - pct / 100);
  }

  getGaugeColor(): string {
    if (this.predictionActive?.type === 'EMPLOI') return '#4f46e5';
    if (this.predictionActive?.type === 'STAGE')  return '#1D9E75';
    return '#f97316';
  }

  getBadgeClass(): string {
  const type = this.getPredictionType();

  if (type === 'EMPLOI') return 'badge-emploi';
  if (type === 'STAGE')  return 'badge-stage';
  return 'badge-medium';
}

  getDotClass(): string {
    if (this.predictionActive?.type === 'EMPLOI') return 'dot-emploi';
    if (this.predictionActive?.type === 'STAGE')  return 'dot-stage';
    return 'dot-medium';
  }
  getPredictionType(): string {
  const e = this.predictionActive?.probaEmploi ?? 0;
  const s = this.predictionActive?.probaStage ?? 0;

  if (e > s) return 'EMPLOI';
  if (s > e) return 'STAGE';
  return 'MEDIUM';
  }
  getDisplayProbability(): number {
  const e = this.predictionActive?.probaEmploi ?? 0;
  const s = this.predictionActive?.probaStage ?? 0;

  if (e > s) return e;
  if (s > e) return s;
  return 50;
  }

}