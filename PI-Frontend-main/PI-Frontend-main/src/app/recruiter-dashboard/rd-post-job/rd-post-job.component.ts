import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../api.service';
import { Router } from '@angular/router';
import { SalaryPredictionService } from '../../services/salary-prediction.service';

@Component({
    selector: 'app-rd-post-job',
    standalone: false,
    templateUrl: './rd-post-job.component.html',
    styleUrls: ['./rd-post-job.component.scss']
})
export class RdPostJobComponent implements OnInit {
    loading = false;
    saving = false;
    predictingSalary = false;
    successMessage = '';
    errorMessage = '';
    lastCandidatureLink = '';
    submitAttempted = false;

    mesOffres: any[] = [];
    // Ajout de la méthode pour générer le salaire
    genererSalaire() {
        this.errorMessage = '';

        const titre = this.formulaire.titre.trim();
        const description = this.formulaire.description.trim();
        const entreprise = this.formulaire.entreprise.trim();
        const location = this.formulaire.location.trim();
        const typeContrat = (this.formulaire.typeContrat || '').trim();
        const competencesList = this.formulaire.competences
            .split(',')
            .map((c) => c.trim())
            .filter((c) => !!c)
            .slice(0, 15);

        if (!titre || !description || !entreprise || !location || !typeContrat || competencesList.length === 0) {
            this.errorMessage = 'Pour generer le salaire, remplissez titre, description, entreprise, localisation, type de contrat et competences.';
            return;
        }

        // Keep payload aligned with salary_api.py required keys.
        const data = {
            titre,
            description,
            entreprise,
            location,
            typeContrat,
            competences: competencesList
        };

        this.predictingSalary = true;
        this.salaryService.predictSalary(data).subscribe({
            next: (res) => {
                const predicted = res?.predicted_salary;
                if (predicted !== undefined && predicted !== null && String(predicted).trim() !== '') {
                    this.predictedSalary = String(predicted);
                    this.formulaire.salary = this.predictedSalary;
                } else {
                    this.errorMessage = 'Le service salaire a repondu sans valeur predicted_salary.';
                }
                this.predictingSalary = false;
            },
            error: (err) => {
                const status = err?.status ? ` (${err.status})` : '';
                const backendMessage = err?.error?.error || err?.error?.message || err?.message || 'Aucune precision.';
                this.errorMessage = `Echec generation salaire${status}: ${backendMessage}`;
                this.predictingSalary = false;
            }
        });
    }

    formulaire = {
        titre: '',
        description: '',
        entreprise: '',
        location: '',
        salary: '',
        typeContrat: '',
        deadline: '',
        competences: ''
    };

    // NOTE: Put '-' at the end inside [] to avoid invalid ranges in browsers.
    readonly textPattern = "^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 .,'()/+-]*$";
    readonly salaryPattern = "^[A-Za-zÀ-ÿ0-9 .,'()/+-]*$";

    predictedSalary: string = '';

    constructor(
        private apiService: ApiService,
        private router: Router,
        private salaryService: SalaryPredictionService
    ) { }

    ngOnInit(): void {
        this.chargerMesOffres();
    }

    chargerMesOffres(): void {
        this.loading = true;
        this.errorMessage = '';
        this.apiService.getMesOffresEmploi().subscribe({
            next: (offres) => {
                this.mesOffres = offres || [];
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                if (this.handleUnauthorized(err)) {
                    this.loading = false;
                    return;
                }
                this.apiService.getOffresEmploi().subscribe({
                    next: (fallbackOffres) => {
                        this.mesOffres = fallbackOffres || [];
                        this.errorMessage = this.mesOffres.length > 0 ? '' : 'Impossible de charger vos offres.';
                        this.loading = false;
                    },
                    error: () => {
                        this.errorMessage = 'Impossible de charger vos offres.';
                        this.loading = false;
                    }
                });
            }
        });
    }

    publierOffre(): void {
        this.successMessage = '';
        this.errorMessage = '';
        this.lastCandidatureLink = '';
        this.submitAttempted = true;

        const validationMessage = this.validateFormulaire();
        if (validationMessage) {
            this.errorMessage = validationMessage;
            return;
        }

        const payload = {
            titre: this.formulaire.titre.trim(),
            description: this.formulaire.description.trim(),
            entreprise: this.formulaire.entreprise.trim() || null,
            location: this.formulaire.location.trim(),
            salary: this.formulaire.salary.trim() || null,
            typeContrat: this.formulaire.typeContrat,
            deadline: this.formulaire.deadline ? new Date(this.formulaire.deadline) : null,
            competencesRequises: this.formulaire.competences
                .split(',')
                .map((item) => item.trim())
                .filter((item) => !!item)
                .slice(0, 15),
            statut: 'ACTIVE'
        };

        this.saving = true;
        this.apiService.creerOffreEmploi(payload).subscribe({
            next: (createdOffre) => {
                this.successMessage = 'Offre publiee avec succes.';
                this.lastCandidatureLink = this.getCandidatureFormLink(createdOffre);
                this.reinitialiser();
                this.chargerMesOffres();
                this.saving = false;
            },
            error: (err) => {
                console.error(err);
                if (this.handleUnauthorized(err)) {
                    this.saving = false;
                    return;
                }
                this.errorMessage = err?.error?.message || err?.message || 'Erreur lors de la publication de l\'offre.';
                this.saving = false;
            }
        });
    }

    reinitialiser(): void {
        this.submitAttempted = false;
        this.formulaire = {
            titre: '',
            description: '',
            entreprise: '',
            location: '',
            salary: '',
            typeContrat: '',
            deadline: '',
            competences: ''
        };
    }

    private validateFormulaire(): string {
        const titre = this.formulaire.titre.trim();
        const description = this.formulaire.description.trim();
        const location = this.formulaire.location.trim();
        const entreprise = this.formulaire.entreprise.trim();
        const salary = this.formulaire.salary.trim();
        const competences = this.formulaire.competences.trim();
        const typeContrat = (this.formulaire.typeContrat || '').trim();

        if (!titre || !description || !entreprise || !location || !salary || !typeContrat || !this.formulaire.deadline || !competences) {
            return 'Titre, description, entreprise, localisation, salaire, type de contrat, date limite et competences sont obligatoires.';
        }

        if (titre.length < 3 || titre.length > 120) {
            return 'Le titre doit contenir entre 3 et 120 caracteres.';
        }

        if (description.length < 20 || description.length > 2000) {
            return 'La description doit contenir entre 20 et 2000 caracteres.';
        }

        if (entreprise.length < 2 || entreprise.length > 100) {
            return 'Le nom de l\'entreprise doit contenir entre 2 et 100 caracteres.';
        }

        if (location.length < 2 || location.length > 100) {
            return 'La localisation doit contenir entre 2 et 100 caracteres.';
        }

        if (salary.length < 1 || salary.length > 50) {
            return 'Le salaire doit contenir entre 1 et 50 caracteres.';
        }

        if (competences.length < 2 || competences.length > 300) {
            return 'Le champ competences doit contenir entre 2 et 300 caracteres.';
        }

        const allowedTypes = ['CDI', 'CDD', 'STAGE', 'FREELANCE'];
        if (!allowedTypes.includes(typeContrat)) {
            return 'Type de contrat invalide.';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(this.formulaire.deadline);
        deadlineDate.setHours(0, 0, 0, 0);

        if (Number.isNaN(deadlineDate.getTime())) {
            return 'La date limite est invalide.';
        }

        if (deadlineDate <= today) {
            return 'La date limite doit etre strictement future.';
        }

        return '';
    }

    isInvalidTextField(value: string, min: number, max: number, required = false): boolean {
        const trimmed = (value || '').trim();
        if (!this.submitAttempted) {
            return false;
        }
        if (required && !trimmed) {
            return true;
        }
        if (!trimmed) {
            return false;
        }
        return trimmed.length < min || trimmed.length > max;
    }

    isInvalidDeadline(): boolean {
        if (!this.submitAttempted || !this.formulaire.deadline) {
            return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(this.formulaire.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        return Number.isNaN(deadlineDate.getTime()) || deadlineDate <= today;
    }

    isInvalidTypeContrat(): boolean {
        if (!this.submitAttempted) {
            return false;
        }
        return !(this.formulaire.typeContrat || '').trim();
    }

    formatDate(value: any): string {
        if (!value) {
            return '-';
        }
        return new Date(value).toLocaleDateString('fr-FR');
    }

    getCandidatureFormLink(offre: any): string {
        if (!offre?.id) {
            return '';
        }

        const base = `${window.location.origin}/candidates-dashboard/applied-jobs`;
        const params = new URLSearchParams({
            openForm: '1',
            offreId: String(offre.id),
            offreTitre: offre.titre || '',
            entreprise: offre.entreprise || ''
        });

        return `${base}?${params.toString()}`;
    }

    copyCandidatureFormLink(offre: any): void {
        const link = this.getCandidatureFormLink(offre);
        if (!link) {
            return;
        }

        navigator.clipboard.writeText(link).then(() => {
            this.successMessage = 'Lien du formulaire de candidature copie.';
        }).catch(() => {
            this.errorMessage = 'Impossible de copier le lien.';
        });
    }

    private handleUnauthorized(err: any): boolean {
        if (err?.status === 401) {
            this.errorMessage = 'Session expiree. Veuillez vous reconnecter.';
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            setTimeout(() => this.router.navigate(['/login']), 600);
            return true;
        }
        return false;
    }

}
