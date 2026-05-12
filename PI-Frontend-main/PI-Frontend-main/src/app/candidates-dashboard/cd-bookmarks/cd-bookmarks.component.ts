import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../api.service';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { MergedOffersService, Offer } from '../../services/merged-offers.service';

@Component({
    selector: 'app-cd-bookmarks',
    standalone: false,
    templateUrl: './cd-bookmarks.component.html',
    styleUrls: ['./cd-bookmarks.component.scss']
})
export class CdBookmarksComponent implements OnInit {

    bookmarkedOffers: Offer[] = [];
    isLoading = true;
    message = '';
    messageType = '';
    userProfileText = '';
    detectedDomain = '';
    candidat: any = null;

    constructor(
        private router: Router,
        private apiService: ApiService,
        private mergedOffersService: MergedOffersService
    ) {}

    ngOnInit(): void {
        this.loadCandidatFromBackend();
    }

    /**
     * Récupère le candidat depuis le backend
     */
    loadCandidatFromBackend(): void {
        this.isLoading = true;
        
        this.apiService.getCurrentCandidat().subscribe({
            next: (candidat) => {
                this.candidat = candidat;
                this.userProfileText = this.buildProfileText(candidat);
                
                console.log('👤 Candidat:', candidat.prenom, candidat.nom);
                console.log('📝 Description (About me):', candidat.description);
                console.log('📚 Compétences:', candidat.competences);
                console.log('📤 Texte envoyé au ML:', this.userProfileText);
                
                // Vérifier si le domaine a changé pour vider les anciens bookmarks
                this.checkAndClearBookmarksIfDomainChanged();
                
                this.loadBookmarkedOffers();
            },
            error: (err) => {
                console.error('❌ Erreur chargement candidat:', err);
                this.isLoading = false;
                this.showMessage('Impossible de charger votre profil. Veuillez rafraîchir.', 'error');
            }
        });
    }

    /**
     * Construit le texte de profil à partir des données du candidat
     */
    buildProfileText(candidat: any): string {
        // Priorité à la description "About me"
        if (candidat.description && candidat.description.trim().length > 0) {
            console.log('✅ Utilisation de la description "About me":', candidat.description);
            return candidat.description;
        }
        
        // Fallback sur backgroundExpertise
        if (candidat.backgroundExpertise && candidat.backgroundExpertise.trim().length > 0) {
            console.log('⚠️ Fallback sur backgroundExpertise:', candidat.backgroundExpertise);
            return candidat.backgroundExpertise;
        }
        
        // Fallback sur les compétences
        if (candidat.competences && candidat.competences.length > 0) {
            const skills = candidat.competences.map((c: any) => c.nom).join(' ');
            console.log('⚠️ Fallback sur compétences:', skills);
            return skills;
        }
        
        console.error('❌ Aucune description trouvée pour ce candidat!');
        return '';
    }

    /**
     * Détecte le domaine à partir d'un texte
     */
    detectDomainFromText(text: string): string {
        const textLower = text.toLowerCase();
        
        if (textLower.includes('médecin') || textLower.includes('infirmier') || textLower.includes('clinique') || 
            textLower.includes('santé') || textLower.includes('soins') || textLower.includes('patient') ||
            textLower.includes('urgences') || textLower.includes('hôpital')) {
            return 'sante';
        }
        if (textLower.includes('java') || textLower.includes('python') || textLower.includes('angular') || 
            textLower.includes('spring') || textLower.includes('react') || textLower.includes('docker') ||
            textLower.includes('fullstack') || textLower.includes('backend') || textLower.includes('frontend')) {
            return 'informatique';
        }
        if (textLower.includes('comptable') || textLower.includes('finance') || textLower.includes('audit') || 
            textLower.includes('bilan') || textLower.includes('excel') || textLower.includes('trésorerie')) {
            return 'finance';
        }
        if (textLower.includes('enseignant') || textLower.includes('professeur') || textLower.includes('pédagogie') ||
            textLower.includes('cours') || textLower.includes('langues') || textLower.includes('éducation')) {
            return 'enseignement';
        }
        if (textLower.includes('marketing') || textLower.includes('digital') || textLower.includes('seo') ||
            textLower.includes('social media') || textLower.includes('communication')) {
            return 'marketing';
        }
        
        return 'general';
    }

    /**
     * Obtient le domaine des bookmarks actuels
     */
    getBookmarksDomain(bookmarkIds: string[]): string | null {
        if (bookmarkIds.length === 0) return null;
        
        const devIds = ['STATIC_DEV_001', 'STATIC_DEV_002', 'STATIC_DEV_003', 'STATIC_DEV_004', 'STATIC_DEV_005', 'STATIC_DEV_006', 'STATIC_DEV_007'];
        const healthIds = ['STATIC_HEALTH_001', 'STATIC_HEALTH_002', 'STATIC_HEALTH_003'];
        const financeIds = ['STATIC_FINANCE_001', 'STATIC_FINANCE_002', 'STATIC_FINANCE_003'];
        const teachingIds = ['STATIC_TEACHING_001', 'STATIC_TEACHING_002'];
        const marketingIds = ['STATIC_MARKETING_001', 'STATIC_MARKETING_002'];
        
        const firstId = bookmarkIds[0];
        
        if (devIds.includes(firstId)) return 'informatique';
        if (healthIds.includes(firstId)) return 'sante';
        if (financeIds.includes(firstId)) return 'finance';
        if (teachingIds.includes(firstId)) return 'enseignement';
        if (marketingIds.includes(firstId)) return 'marketing';
        
        return null;
    }

    /**
     * Vérifie si le domaine a changé et vide les bookmarks si nécessaire
     */
    checkAndClearBookmarksIfDomainChanged(): void {
        const currentDomain = this.detectDomainFromText(this.userProfileText);
        const savedBookmarks = JSON.parse(localStorage.getItem('static_offer_bookmarks') || '[]');
        const bookmarksDomain = this.getBookmarksDomain(savedBookmarks);
        
        console.log('🏷️ Domaine actuel:', currentDomain);
        console.log('🏷️ Domaine des bookmarks:', bookmarksDomain);
        
        // Si les bookmarks ne correspondent pas au domaine actuel, on les vide
        if (bookmarksDomain && currentDomain !== bookmarksDomain && currentDomain !== 'general') {
            console.log('🔄 Domaine changé, vidage des anciens bookmarks');
            localStorage.setItem('static_offer_bookmarks', JSON.stringify([]));
        }
    }

    /**
     * Charge les offres recommandées depuis le ML
     */
    loadBookmarkedOffers(): void {
        this.isLoading = true;
        
        let savedBookmarks = JSON.parse(localStorage.getItem('static_offer_bookmarks') || '[]');
        
        console.log('📌 Saved bookmarks:', savedBookmarks);
        console.log('📤 Texte envoyé au ML:', this.userProfileText);
        
        if (!this.userProfileText || this.userProfileText.trim().length < 5) {
            console.log('⚠️ Pas de description valide');
            this.isLoading = false;
            this.showMessage('Veuillez ajouter une description dans votre profil "About me"', 'error');
            return;
        }
        
        this.mergedOffersService.getMLRecommendations(this.userProfileText).subscribe({
            next: (offers) => {
                console.log('✅ Offres reçues du ML:', offers);
                console.log('📊 Nombre d\'offres:', offers.length);
                
                if (offers.length === 0) {
                    console.log('⚠️ Aucune offre retournée par le ML');
                    this.bookmarkedOffers = [];
                    this.isLoading = false;
                    return;
                }
                
                // Si pas de bookmarks ou bookmarks vides, afficher toutes les offres ML
                if (savedBookmarks.length === 0) {
                    this.bookmarkedOffers = offers.slice(0, 6);
                    // Sauvegarder automatiquement les nouvelles offres
                    const newBookmarks = this.bookmarkedOffers.map(o => o.id);
                    localStorage.setItem('static_offer_bookmarks', JSON.stringify(newBookmarks));
                    console.log('📦 Nouvelles offres sauvegardées:', newBookmarks);
                } else {
                    // Filtrer par bookmarks
                    this.bookmarkedOffers = offers.filter(offer => savedBookmarks.includes(offer.id));
                    console.log('🔍 Offres après filtrage bookmarks:', this.bookmarkedOffers.length);
                    
                    // Si aucune offre après filtrage, afficher toutes et mettre à jour les bookmarks
                    if (this.bookmarkedOffers.length === 0 && offers.length > 0) {
                        console.log('⚠️ Aucune correspondance, mise à jour des bookmarks');
                        this.bookmarkedOffers = offers.slice(0, 6);
                        const newBookmarks = this.bookmarkedOffers.map(o => o.id);
                        localStorage.setItem('static_offer_bookmarks', JSON.stringify(newBookmarks));
                    }
                }
                
                if (offers.length > 0 && offers[0].domaine) {
                    this.detectedDomain = offers[0].domaine;
                    console.log('🏷️ Domaine détecté:', this.detectedDomain);
                }
                
                this.isLoading = false;
            },
            error: (err) => {
                console.error('❌ Erreur ML:', err);
                this.isLoading = false;
                this.showMessage('Erreur de connexion au service de recommandation', 'error');
            }
        });
    }

    /**
     * Supprime une offre des favoris
     */
    removeBookmark(offer: Offer): void {
        let bookmarks = JSON.parse(localStorage.getItem('static_offer_bookmarks') || '[]');
        bookmarks = bookmarks.filter((id: string) => id !== offer.id);
        localStorage.setItem('static_offer_bookmarks', JSON.stringify(bookmarks));
        this.loadBookmarkedOffers();
        this.showMessage(`❌ "${offer.titre}" retiré de vos favoris`, 'success');
    }

    /**
     * Affiche les détails d'une offre
     */
    viewDetails(offer: Offer): void {
        this.router.navigate(['/job-details'], { queryParams: { id: offer.id } });
    }

    /**
     * Affiche un message temporaire
     */
    showMessage(msg: string, type: string): void {
        this.message = msg;
        this.messageType = type;
        setTimeout(() => {
            this.message = '';
        }, 3000);
    }

    /**
     * Rafraîchit le profil
     */
    refreshProfile(): void {
        this.loadCandidatFromBackend();
        this.showMessage('🔄 Profil actualisé', 'success');
    }

    /**
     * Formate une date
     */
    formatDate(dateStr: string): string {
        if (!dateStr) return 'Non spécifiée';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Non spécifiée';
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    /**
     * Retourne la classe CSS pour le score
     */
    getScoreClass(score: number): string {
        if (score >= 70) return 'score-high';
        if (score >= 40) return 'score-medium';
        return 'score-low';
    }

    /**
     * Retourne l'icône pour le domaine
     */
    getDomainIcon(domain: string): string {
        const icons: { [key: string]: string } = {
            'informatique': '💻',
            'sante': '🩺',
            'finance': '💰',
            'marketing': '📢',
            'enseignement': '📚'
        };
        return icons[domain] || '🎯';
    }
}