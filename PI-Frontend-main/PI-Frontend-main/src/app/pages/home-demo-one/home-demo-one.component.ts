// src/app/home-demo-one/home-demo-one.component.ts
import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SharedModule } from '../../shared/shared.module';
import { ApiService } from '../../api.service';
import { StaticOffersService, StaticOffer } from '../../services/static-offers.service';

interface PublicTestEntretien {
    id: number;
    titre?: string;
    description?: string;
    domaine?: string;
    domaineLabel?: string;
    dateEntretien?: string;
    photo?: string;
}

interface HomeOffreEmploi {
    id: number;
    titre?: string;
    description?: string;
    type?: string;
    datePublication?: string;
    dateLimite?: string;
    statut?: string;
    status?: string;
    source?: string;
    domaine?: string;
    entreprise?: string;
    competencesRequises?: string[];
    salary?: string;
    location?: string;
    typeContrat?: string;
}

// Type unifié pour les offres
type UnifiedOffer = HomeOffreEmploi | StaticOffer;

@Component({
    selector: 'app-home-demo-one',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './home-demo-one.component.html',
    styleUrls: ['./home-demo-one.component.scss']
})
export class HomeDemoOneComponent {

    title = 'Home Demo - 1 - Jove';
    publicTestEntretiens: PublicTestEntretien[] = [];
    offresDisponibles: HomeOffreEmploi[] = [];
    offresStatiques: StaticOffer[] = [];
    isLoadingPublicTests = false;
    isLoadingOffres = false;
    isLoadingStaticOffres = false;
    publicTestsError = '';
    offresError = '';
    staticOffresError = '';
    readonly defaultEntretienPhoto = 'images/banner/banner1.jpg';
 
    constructor(
        private titleService: Title,
        private apiService: ApiService,
        private staticOffersService: StaticOffersService
    ) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
        this.loadOffresDisponibles();
        this.loadStaticOffres();
        this.loadPublicTestEntretiens();
    }

    // Charger les offres des recruteurs
    loadOffresDisponibles(): void {
        this.isLoadingOffres = true;
        this.offresError = '';

        this.apiService.getOffresEmploi().subscribe({
            next: (data: HomeOffreEmploi[]) => {
                const raw = Array.isArray(data) ? data : [];
                this.offresDisponibles = raw
                    .filter((item) => this.isOffreAvailable(item))
                    .map(item => ({ ...item, source: 'recruiter' }))
                    .sort((a, b) => this.getDateTime(b.datePublication) - this.getDateTime(a.datePublication))
                    .slice(0, 6);
                this.isLoadingOffres = false;
            },
            error: () => {
                this.offresError = 'Impossible de charger les offres d emploi pour le moment.';
                this.offresDisponibles = [];
                this.isLoadingOffres = false;
            }
        });
    }

    // Charger les offres statiques
    loadStaticOffres(): void {
        this.isLoadingStaticOffres = true;
        this.staticOffresError = '';

        this.staticOffersService.getAllStaticOffers().subscribe({
            next: (data: StaticOffer[]) => {
                this.offresStatiques = data
                    .filter((item) => item.statut === 'ACTIVE')
                    .sort((a, b) => this.getDateTime(b.datePublication) - this.getDateTime(a.datePublication))
                    .slice(0, 6);
                this.isLoadingStaticOffres = false;
            },
            error: () => {
                this.staticOffresError = 'Impossible de charger les offres de démonstration.';
                this.offresStatiques = [];
                this.isLoadingStaticOffres = false;
            }
        });
    }

    private isOffreAvailable(item: HomeOffreEmploi): boolean {
        const status = String(item?.statut || item?.status || '').toUpperCase();
        if (status === 'CLOSED' || status === 'CLOTUREE' || status === 'INACTIVE' || status === 'ARCHIVEE') {
            return false;
        }

        const rawDeadline = item?.dateLimite ?? (item as { deadline?: string })?.deadline;
        const deadlineTime = this.getDateTime(rawDeadline);
        if (Number.isFinite(deadlineTime) && deadlineTime < Date.now()) {
            return false;
        }

        return true;
    }

    private getDateTime(value?: string): number {
        if (!value) {
            return Number.NEGATIVE_INFINITY;
        }
        const date = new Date(value);
        return date.getTime();
    }

    // Vérifier si l'offre est de type recruteur
    isRecruiterOffer(item: UnifiedOffer): item is HomeOffreEmploi {
        return (item as any).source === 'recruiter' || (item as HomeOffreEmploi).type !== undefined;
    }

    // Vérifier si l'offre est de type statique
    isStaticOffer(item: UnifiedOffer): item is StaticOffer {
        return (item as any).source === 'static' || (item as StaticOffer).source === 'static';
    }

    getOffreTitle(item: UnifiedOffer): string {
        return String(item?.titre || '').trim() || 'Offre d emploi';
    }

    getOffreDescription(item: UnifiedOffer): string {
        const raw = String(item?.description || '').trim();
        if (!raw) {
            return 'Consultez les details de cette opportunite et postulez rapidement.';
        }
        return raw.length > 120 ? `${raw.slice(0, 120)}...` : raw;
    }

    getOffreType(item: UnifiedOffer): string {
        // Pour les offres statiques
        if (this.isStaticOffer(item)) {
            return 'DÉMO';
        }
        // Pour les offres recruteurs
        const offreItem = item as HomeOffreEmploi;
        return String(offreItem?.type || 'EMPLOI').toUpperCase();
    }

    getOffreSourceClass(item: UnifiedOffer): string {
        if (this.isStaticOffer(item)) {
            return 'type-demo';
        }
        return 'type-recruiter';
    }

    getOffreDomaine(item: UnifiedOffer): string {
        return (item as any)?.domaine || 'General';
    }

    getDomainIcon(domaine: string): string {
        const icons: { [key: string]: string } = {
            'informatique': '💻',
            'sante': '🩺',
            'finance': '💰',
            'marketing': '📢',
            'enseignement': '📚',
            'General': '🎯'
        };
        return icons[domaine?.toLowerCase()] || '🎯';
    }

    getOffreEntreprise(item: UnifiedOffer): string {
        return (item as any)?.entreprise || 'Entreprise';
    }

    getOffreLocation(item: UnifiedOffer): string {
        return (item as any)?.location || 'Non spécifiée';
    }

    getOffreSalary(item: UnifiedOffer): string {
        return (item as any)?.salary || 'À négocier';
    }

    getOffreTypeContrat(item: UnifiedOffer): string {
        return (item as any)?.typeContrat || 'CDI';
    }

    getOffreCompetences(item: UnifiedOffer): string[] {
        return (item as any)?.competencesRequises || [];
    }

    formatOffreDate(value?: string): string {
        if (!value) {
            return 'Date non specifiee';
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return 'Date non specifiee';
        }
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    trackByOffreId(index: number, item: HomeOffreEmploi): number {
        return item?.id ?? index;
    }

    trackByStaticOffreId(index: number, item: StaticOffer): string {
        return item?.id ?? index.toString();
    }

    loadPublicTestEntretiens(): void {
        this.isLoadingPublicTests = true;
        this.publicTestsError = '';

        this.apiService.getPublicTestEntretiens().subscribe({
            next: (data: PublicTestEntretien[]) => {
                console.log('✅ Public test entretiens loaded:', data);
                this.publicTestEntretiens = Array.isArray(data) ? data : [];
                this.isLoadingPublicTests = false;
            },
            error: (err) => {
                console.error('❌ Error loading public test entretiens:', err?.status, err?.message);
                this.publicTestsError = 'Impossible de charger les entretiens test pour le moment.';
                this.publicTestEntretiens = [];
                this.isLoadingPublicTests = false;
            }
        });
    }

    getEntretienPhoto(item: PublicTestEntretien): string {
        const raw = (item?.photo || '').trim();
        if (!raw) {
            return this.defaultEntretienPhoto;
        }
        return raw;
    }

    getEntretienTitle(item: PublicTestEntretien): string {
        const raw = (item?.titre || '').trim();
        return raw || 'Entretien Test';
    }

    getEntretienDescription(item: PublicTestEntretien): string {
        const raw = (item?.description || '').trim();
        if (!raw) {
            return 'Mettez vos competences a l epreuve avec cet entretien test en ligne.';
        }
        return raw.length > 135 ? `${raw.slice(0, 135)}...` : raw;
    }

    getEntretienDomaine(item: PublicTestEntretien): string {
        return (item?.domaineLabel || item?.domaine || 'General').trim();
    }

    formatEntretienDate(value?: string): string {
        if (!value) {
            return 'Date a venir';
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return 'Date a venir';
        }
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    trackByEntretienId(index: number, item: PublicTestEntretien): number {
        return item?.id ?? index;
    }

    // Dans home-demo-one.component.ts, ajoutez cette méthode

loadAllOffres(): void {
    this.isLoadingOffres = true;
    this.offresError = '';
    
    // Appeler votre API existante pour charger les offres
    this.apiService.getOffresEmploi().subscribe({
        next: (data: any[]) => {
            const raw = Array.isArray(data) ? data : [];
            this.offresDisponibles = raw
                .filter((item) => this.isOffreAvailable(item))
                .sort((a, b) => this.getDateTime(b.datePublication) - this.getDateTime(a.datePublication))
                .slice(0, 6);
            this.isLoadingOffres = false;
        },
        error: (err) => {
            console.error('Erreur chargement offres:', err);
            this.offresError = 'Impossible de charger les offres pour le moment.';
            this.isLoadingOffres = false;
        }
    });
}
}