import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OffrePartenaireService } from '../../services/offre-partenaire.service';
import { PartenaireService } from '../../services/partenaire.service';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-offre-candidat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offre-candidat.component.html',
  styleUrls: ['./offre-candidat.component.scss']
})
export class OffreCandidatComponent implements OnInit {

  offres: any[] = [];
  partenaire: any = null;
  partenaireNom: string = '';
  typeFilter: string = '';

  
  searchKeyword: string = '';
  isSearching: boolean = false;

  isPostulerOpen = false;
  offreSelectionnee: any = null;
  message: string = '';
  submitted: boolean = false;
  envoyeEnCours: boolean = false;
  cvFile: File | null = null;

  private partenaireId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private offreService: OffrePartenaireService,
    private partenaireService: PartenaireService,
    private emailService: EmailService
  ) {}

  ngOnInit() {
    this.partenaireId = +this.route.snapshot.paramMap.get('id')!;
    this.loadPartenaire();
    this.loadOffres();
    this.partenaireService.incrementerVues(this.partenaireId)
    .subscribe();
  }

  loadPartenaire() {
    this.partenaireService.getById(this.partenaireId).subscribe({
      next: (data: any) => {
        this.partenaire = data;
        this.partenaireNom = data.nom;
      },
      error: (err: any) => console.error(err)
    });
  }

  loadOffres() {
    this.offreService.getByPartenaireTriees(this.partenaireId).subscribe({
      next: (data: any[]) => this.offres = data,
      error: (err: any) => console.error(err)
    });
  }

  
  searchOffres() {
  if (!this.searchKeyword.trim()) {
    this.loadOffres();
    return;
  }

  this.isSearching = true;
  this.offreService.searchByKeyword(this.searchKeyword).subscribe({
    next: (data: any[]) => {
      
      this.offres = data
        .filter(o => o.partenaire?.id === this.partenaireId)
        .sort((a, b) => {
          if (a.epinglee && !b.epinglee) return -1;
          if (!a.epinglee && b.epinglee) return 1;
          return 0;
        });
      this.isSearching = false;
    },
    error: (err: any) => {
      console.error(err);
      this.isSearching = false;
    }
  });
}

  
  clearSearch() {
    this.searchKeyword = '';
    this.loadOffres();
  }

  get filteredOffres(): any[] {
    if (!this.typeFilter) return this.offres;
    return this.offres.filter((o: any) => o.type === this.typeFilter);
  }

  getEmailCandidat(): string {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload complet :', payload); // ← regarde F12
      return payload.email ?? payload.mail ?? payload.sub ?? '';
    } catch { return ''; }
  }
  return '';
}
  onCvSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.cvFile = file;
  }

  ouvrirPostuler(offre: any) {
    this.offreSelectionnee = offre;
    this.message = '';
    this.submitted = false;
    this.cvFile = null;
    this.isPostulerOpen = true;
  }

  fermerPostuler() {
    this.isPostulerOpen = false;
    this.offreSelectionnee = null;
  }

  envoyerCandidature() {
    this.submitted = true;
    if (!this.message.trim()) return;
    this.envoyeEnCours = true;
    this.emailService.postuler(
      this.partenaire?.email,
      '',
      this.getEmailCandidat(),
      this.message,
      this.offreSelectionnee?.titre,
      this.cvFile || undefined
    ).subscribe({
      next: () => {
        this.envoyeEnCours = false;
        alert('✅ Candidature envoyée avec succès !');
        this.fermerPostuler();
      },
      error: (err: any) => {
        this.envoyeEnCours = false;
        alert('❌ Erreur : ' + err.message);
      }
    });
  }

  retour() {
    this.router.navigate(['/candidates-dashboard/partenaires']);
  }

  triggerFileInput() {
    document.getElementById('cvInput')?.click();
  }

  removeCv() {
    this.cvFile = null;
    const input = document.getElementById('cvInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  getJoursDepuis(dateStr: string): string {
  if (!dateStr) return 'Date inconnue';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffJours === 0) return "Publié aujourd'hui";
  if (diffJours === 1) return 'Publié il y a 1 jour';
  if (diffJours < 30)  return `Publié il y a ${diffJours} jours`;
  if (diffJours < 60)  return 'Publié il y a 1 mois';
  return `Publié il y a ${Math.floor(diffJours / 30)} mois`;
}
}