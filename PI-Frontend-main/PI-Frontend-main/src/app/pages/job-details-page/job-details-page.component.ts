import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from '../../common/navbar/navbar.component';
import { SubscribeComponent } from '../../common/subscribe/subscribe.component';
import { FooterComponent } from '../../common/footer/footer.component';
import { NgxScrollTopComponent } from 'ngx-scrolltop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';

interface JobDetailsOffre {
    id: number;
    titre?: string;
    description?: string;
    type?: string;
    typeContrat?: string;
    datePublication?: string;
    dateLimite?: string;
    deadline?: string;
    statut?: string;
    status?: string;
    salaire?: string;
    salary?: string;
    entreprise?: string;
    location?: string;
    competencesRequises?: string[];
    competences?: string[] | string;
    localisation?: {
        ville?: string;
        pays?: string;
        adresse?: string;
    };
    partenaire?: {
        nom?: string;
    };
}

@Component({
    selector: 'app-job-details-page',
    standalone: false,
    templateUrl: './job-details-page.component.html',
    styleUrls: ['./job-details-page.component.scss']
})
export class JobDetailsPageComponent {

    title = 'Job Details - Jove';
    offre: JobDetailsOffre | null = null;
    loading = true;
    errorMessage = '';
 
    constructor(
        private titleService: Title,
        private route: ActivatedRoute,
        private apiService: ApiService,
        private router: Router
    ) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
        this.loadJobDetails();
    }

    private loadJobDetails(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isFinite(id) || id <= 0) {
            this.loading = false;
            this.errorMessage = 'Offre invalide.';
            return;
        }

        this.apiService.getOffreEmploiById(id).subscribe({
            next: (data: JobDetailsOffre) => {
                this.offre = data || null;
                this.loading = false;
            },
            error: () => {
                this.offre = null;
                this.loading = false;
                this.errorMessage = 'Impossible de charger les details de cette offre.';
            }
        });
    }

    get offreTitle(): string {
        return String(this.offre?.titre || '').trim() || 'Offre d emploi';
    }

    get offreDescription(): string {
        return String(this.offre?.description || '').trim() || 'Aucune description disponible.';
    }

    get offreType(): string {
        return String(this.offre?.type || this.offre?.typeContrat || 'EMPLOI').toUpperCase();
    }

    get offreStatus(): string {
        const raw = String(this.offre?.statut || this.offre?.status || 'ACTIVE').toUpperCase();
        return raw || 'ACTIVE';
    }

    get entrepriseNom(): string {
        return String(this.offre?.partenaire?.nom || this.offre?.entreprise || '').trim() || 'Entreprise non specifiee';
    }

    get jobLocation(): string {
        const locationText = String(this.offre?.location || '').trim();
        if (locationText) {
            return locationText;
        }
        const ville = String(this.offre?.localisation?.ville || '').trim();
        const pays = String(this.offre?.localisation?.pays || '').trim();
        const adresse = String(this.offre?.localisation?.adresse || '').trim();
        const main = [ville, pays].filter(Boolean).join(', ');
        return main || adresse || 'Localisation non specifiee';
    }

    get salaryLabel(): string {
        const salary = String(this.offre?.salary || this.offre?.salaire || '').trim();
        return salary || 'Non specifie';
    }

    get deadlineLabel(): string {
        return this.formatDate(this.offre?.dateLimite || this.offre?.deadline);
    }

    get competencesLabels(): string[] {
        const raw = this.offre?.competencesRequises ?? this.offre?.competences;

        if (Array.isArray(raw)) {
            return raw
                .map((item) => String(item || '').trim())
                .filter((item) => !!item);
        }

        if (typeof raw === 'string') {
            return raw
                .split(',')
                .map((item) => item.trim())
                .filter((item) => !!item);
        }

        return [];
    }

    applyToOffer(): void {
        if (!this.offre?.id) {
            return;
        }

        this.router.navigate(['/candidates-dashboard/applied-jobs'], {
            queryParams: {
                openForm: 1,
                offreId: this.offre.id,
                offreTitre: this.offreTitle,
                entreprise: this.entrepriseNom
            }
        });
    }

    formatDate(value?: string): string {
        if (!value) {
            return 'Non specifiee';
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return 'Non specifiee';
        }
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

}

