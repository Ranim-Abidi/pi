import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-candidats-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './candidats-list.component.html',
  styleUrls: ['./candidats-list.component.scss']
})
export class CandidatsListComponent implements OnInit {
  private router = inject(Router);
  private apiService = inject(ApiService);

  candidats: any[] = [];
  loading = false;
  deletingId: number | null = null;
  searchTerm: string = '';
  filteredCandidats: any[] = [];
  isAddPopupOpen = false;
  isSaving = false;
  isLocationPopupOpen = false;
  isCompetencePopupOpen = false;
  isEditPopupOpen = false;
  selectedCandidatId: number | null = null;

  newCandidat: any = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    niveau_etude: '',
    description: ''
  };

  editCandidat: any = {
    id: null,
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    niveau_etude: '',
    description: ''
  };

  localisationData: any = {
    latitude: '',
    longitude: '',
    pays: '',
    ville: ''
  };

  competenceData: any = {
    lien_portfolio: '',
    niveau_etude: '',
    backgroundExpertise: '',
    passionAndGoals: ''
  };

  ngOnInit(): void {
    this.loadCandidats();
  }

  loadCandidats(): void {
    this.loading = true;
    this.apiService.getCandidats().subscribe({
      next: (data) => {
        this.candidats = data || [];
        this.filterCandidats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement candidats:', err);
        this.candidats = [];
        this.loading = false;
      }
    });
  }

  filterCandidats(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCandidats = [...this.candidats];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredCandidats = this.candidats.filter(c =>
        (c.nom && c.nom.toLowerCase().includes(term)) ||
        (c.prenom && c.prenom.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.telephone && c.telephone.includes(term))
      );
    }
  }

  onSearch(): void {
    this.filterCandidats();
  }

  openAddCandidate(): void {
    this.newCandidat = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      niveau_etude: '',
      description: ''
    };
    this.isAddPopupOpen = true;
  }

  closeAddCandidate(): void {
    this.isAddPopupOpen = false;
    this.isSaving = false;
    this.newCandidat = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      niveau_etude: '',
      description: ''
    };
  }

  saveCandidat(): void {
    if (!this.isFormValid()) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isSaving = true;
    
    // Get admin ID from token
    const token = localStorage.getItem('token');
    let adminId = 0;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        adminId = payload.id || payload.userId || 0;
      } catch (e) {
        console.error('Token parsing error:', e);
      }
    }

    // Build candidate data matching backend expectations
    const candidatePayload = {
      nom: this.newCandidat.nom?.trim(),
      prenom: this.newCandidat.prenom?.trim(),
      email: this.newCandidat.email?.trim(),
      telephone: this.newCandidat.telephone?.trim(),
      niveau_etude: this.newCandidat.niveau_etude?.trim() || null,
      description: this.newCandidat.description?.trim() || null,
      utilisateur: {
        id: adminId
      }
    };

    console.log('Sending candidate data:', candidatePayload);

    this.apiService.createCandidate(candidatePayload).subscribe({
      next: () => {
        alert('✅ Candidat créé avec succès');
        this.closeAddCandidate();
        this.loadCandidats();
      },
      error: (err) => {
        console.error('Erreur création:', err);
        const errorMsg = err?.error?.message || 'Erreur lors de la création du candidat';
        alert('❌ ' + errorMsg);
        this.isSaving = false;
      }
    });
  }

  isFormValid(): boolean {
    return (
      this.newCandidat.nom?.trim() &&
      this.newCandidat.prenom?.trim() &&
      this.newCandidat.email?.trim() &&
      this.newCandidat.telephone?.trim()
    );
  }

  editCandidate(id: number): void {
    this.selectedCandidatId = id;
    this.editCandidat = {
      id: null,
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      niveau_etude: '',
      description: ''
    };

    // Load candidate data
    this.apiService.getCandidat(id).subscribe({
      next: (candidate: any) => {
        if (candidate) {
          this.editCandidat = {
            id: candidate.id,
            nom: candidate.nom || '',
            prenom: candidate.prenom || '',
            email: candidate.email || '',
            telephone: candidate.telephone || '',
            niveau_etude: candidate.niveau_etude || '',
            description: candidate.description || ''
          };
        }
        this.isEditPopupOpen = true;
      },
      error: (err) => {
        console.error('Error loading candidate:', err);
        alert('❌ Erreur lors du chargement du candidat');
      }
    });
  }

  closeEditPopup(): void {
    this.isEditPopupOpen = false;
    this.selectedCandidatId = null;
    this.isSaving = false;
    this.editCandidat = {
      id: null,
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      niveau_etude: '',
      description: ''
    };
  }

  saveEditCandidate(): void {
    if (!this.editCandidat.id) {
      alert('❌ Erreur: ID candidat manquant');
      return;
    }

    if (!this.editCandidat.nom?.trim() || !this.editCandidat.prenom?.trim() || 
        !this.editCandidat.email?.trim() || !this.editCandidat.telephone?.trim()) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isSaving = true;

    const editPayload = {
      nom: this.editCandidat.nom?.trim(),
      prenom: this.editCandidat.prenom?.trim(),
      email: this.editCandidat.email?.trim(),
      telephone: this.editCandidat.telephone?.trim(),
      niveau_etude: this.editCandidat.niveau_etude?.trim() || null,
      description: this.editCandidat.description?.trim() || null
    };

    this.apiService.updateCandidate(this.editCandidat.id, editPayload).subscribe({
      next: () => {
        alert('✅ Candidat modifié avec succès!');
        this.closeEditPopup();
        this.loadCandidats();
      },
      error: (err) => {
        console.error('Error updating candidate:', err);
        alert('❌ Erreur lors de la modification du candidat');
        this.isSaving = false;
      }
    });
  }

  addLocation(id: number): void {
    this.selectedCandidatId = id;
    this.localisationData = {
      latitude: '',
      longitude: '',
      pays: '',
      ville: ''
    };
    
    // Load candidate to check for existing location
    const candidate = this.candidats.find(c => c.id === id);
    if (candidate && candidate.localisation_id) {
      // Load existing localisation
      this.apiService.getLocalisation(candidate.localisation_id).subscribe({
        next: (locData: any) => {
          this.localisationData = { ...locData };
          this.isLocationPopupOpen = true;
        },
        error: (err) => {
          console.error('Error loading localisation:', err);
          this.isLocationPopupOpen = true;
        }
      });
    } else {
      this.isLocationPopupOpen = true;
    }
  }

  closeLocationPopup(): void {
    this.isLocationPopupOpen = false;
    this.selectedCandidatId = null;
    this.isSaving = false;
    this.localisationData = {
      latitude: '',
      longitude: '',
      pays: '',
      ville: ''
    };
  }

  saveLocation(): void {
    if (!this.selectedCandidatId) {
      alert('❌ Erreur: Candidat non sélectionné');
      return;
    }

    if (!this.localisationData.latitude || !this.localisationData.longitude) {
      alert('⚠️ Veuillez fournir les coordonnées (latitude et longitude)');
      return;
    }

    this.isSaving = true;

    const localisationPayload = {
      pays: this.localisationData.pays?.trim() || '',
      ville: this.localisationData.ville?.trim() || '',
      latitude: this.localisationData.latitude,
      longitude: this.localisationData.longitude
    };

    const candidate = this.candidats.find(c => c.id === this.selectedCandidatId);
    const localisationId = candidate?.localisation_id;

    const saveLocalisationObs = localisationId
      ? this.apiService.updateLocalisation(localisationId, localisationPayload)
      : this.apiService.createLocalisation(localisationPayload);

    saveLocalisationObs.subscribe({
      next: (response: any) => {
        // If we created a new localisation, link it to candidate
        if (!localisationId && response.id && this.selectedCandidatId) {
          const candidatePayload = { localisation_id: response.id };
          this.apiService.updateCandidate(this.selectedCandidatId, candidatePayload).subscribe({
            next: () => {
              alert('✅ Localisation sauvegardée avec succès!');
              this.closeLocationPopup();
              this.loadCandidats();
            },
            error: (err) => {
              console.error('Error linking localisation:', err);
              alert('❌ Erreur lors de la liaison de la localisation');
              this.isSaving = false;
            }
          });
        } else {
          alert('✅ Localisation mise à jour avec succès!');
          this.closeLocationPopup();
          this.loadCandidats();
        }
      },
      error: (err) => {
        console.error('Error saving localisation:', err);
        alert('❌ Erreur lors de la sauvegarde de la localisation');
        this.isSaving = false;
      }
    });
  }

  openCompetence(id: number): void {
    this.selectedCandidatId = id;
    this.competenceData = {
      lien_portfolio: '',
      niveau_etude: '',
      backgroundExpertise: '',
      passionAndGoals: ''
    };

    // Load candidate data
    this.apiService.getCandidat(id).subscribe({
      next: (candidate: any) => {
        if (candidate) {
          this.competenceData.lien_portfolio = candidate.lien_portfolio || '';
          this.competenceData.niveau_etude = candidate.niveau_etude || '';
          this.competenceData.backgroundExpertise = candidate.backgroundExpertise || '';
          this.competenceData.passionAndGoals = candidate.passionAndGoals || '';
        }
        this.isCompetencePopupOpen = true;
      },
      error: (err) => {
        console.error('Error loading candidate:', err);
        this.isCompetencePopupOpen = true;
      }
    });
  }

  closeCompetencePopup(): void {
    this.isCompetencePopupOpen = false;
    this.selectedCandidatId = null;
    this.isSaving = false;
    this.competenceData = {
      lien_portfolio: '',
      niveau_etude: '',
      backgroundExpertise: '',
      passionAndGoals: ''
    };
  }

  saveCompetence(): void {
    if (!this.selectedCandidatId) {
      alert('❌ Erreur: Candidat non sélectionné');
      return;
    }

    this.isSaving = true;

    const competencePayload = {
      lien_portfolio: this.competenceData.lien_portfolio?.trim() || '',
      niveau_etude: this.competenceData.niveau_etude?.trim() || '',
      backgroundExpertise: this.competenceData.backgroundExpertise?.trim() || '',
      passionAndGoals: this.competenceData.passionAndGoals?.trim() || ''
    };

    this.apiService.updateCandidate(this.selectedCandidatId, competencePayload).subscribe({
      next: () => {
        alert('✅ Informations sauvegardées avec succès!');
        this.closeCompetencePopup();
        this.loadCandidats();
      },
      error: (err) => {
        console.error('Error saving competence:', err);
        alert('❌ Erreur lors de la sauvegarde des informations');
        this.isSaving = false;
      }
    });
  }

  deleteCandidate(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce candidat ?')) return;
    this.deletingId = id;
    this.apiService.deleteCandidate(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.loadCandidats();
        alert('✅ Candidat supprimé avec succès');
      },
      error: (err) => {
        console.error('Erreur suppression:', err);
        this.deletingId = null;
        alert('❌ Erreur lors de la suppression');
      }
    });
  }

  exportToCSV(): void {
    if (this.filteredCandidats.length === 0) {
      alert('Aucun candidat à exporter');
      return;
    }

    const headers = ['ID', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Niveau d\'étude', 'Ville'];
    const rows = this.filteredCandidats.map(c => [
      c.id || '',
      c.nom || '',
      c.prenom || '',
      c.email || '',
      c.telephone || '',
      c.niveau_etude || '',
      c.localisations?.ville || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidats-${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getInitials(nom: string, prenom: string): string {
    return ((nom?.charAt(0) || '') + (prenom?.charAt(0) || '')).toUpperCase();
  }

  get totalCandidats(): number {
    return this.candidats.length;
  }
}
