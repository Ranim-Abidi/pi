import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { EvenementService } from '../../services/evenement-service';
import { ParticipationService } from '../../services/participation-service';
import { FeedbackEventService } from '../../services/feedbackevent-service';
import { EvenementSearchService } from '../../services/evenement-search-service';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-evenement-candidat',
    standalone: false,
    templateUrl: './evenement-candidat.component.html',
    styleUrls: ['./evenement-candidat.component.scss']
})
export class EvenementCandidatComponent implements OnInit, OnDestroy {

    evenements: any[] = [];
    filteredEvenements: any[] = [];
    mesParticipations: any[] = [];
    searchTerm = '';
    isLoading = true;
    candidatId!: number;

    demandesEnvoyees: Set<number> = new Set();
    participationsStatuts: Map<number, string> = new Map();

    evenementSelectionne: any = null;
    reputationData: any = null;
    popupDetailOuvert = false;
    loadingReputation = false;

    // ── Recherche intelligente ──
    suggestions: any[] = [];
    historique: string[] = [];
    showDropdown = false;
    isSearching = false;
    modeRecherche: 'local' | 'backend' = 'local';
    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private evenementService: EvenementService,
        private participationService: ParticipationService,
        private feedbackEventService: FeedbackEventService,
        private searchService: EvenementSearchService
    ) {}

    ngOnInit() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.candidatId = decoded?.id;
        }

        this.evenementService.getAll().subscribe({
            next: (data) => {
                this.evenements = data;
                this.filteredEvenements = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement événements:', err);
                this.isLoading = false;
            }
        });

        this.chargerMesParticipations();
        this.chargerHistorique();
        this.chargerSuggestions();

        // Debounce 400ms après chaque frappe
        this.searchSubject.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(term => this.executerRecherche(term));

        // Rafraîchissement auto toutes les 15s
        setInterval(() => {
            this.chargerMesParticipations();
        }, 15000);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ════════════════════════════════════════════
    //  RECHERCHE INTELLIGENTE
    // ════════════════════════════════════════════

    onSearch(term: string) {
        this.searchTerm = term;
        this.showDropdown = true;

        if (!term.trim()) {
            this.filteredEvenements = [...this.evenements];
            return;
        }

        this.searchSubject.next(term);
    }

    executerRecherche(term: string) {
        if (!term.trim()) return;

        this.isSearching = true;

        this.searchService.rechercher(term, this.candidatId).subscribe({
            next: (data) => {
                this.filteredEvenements = data.resultats;
                this.historique = data.historiqueRecherches?.slice(0, 5) || [];
                this.suggestions = data.suggestions?.slice(0, 4) || [];
                this.isSearching = false;
                this.modeRecherche = 'backend';
            },
            error: () => {
                // Fallback local si backend KO
                this.filteredEvenements = this.filtreLocal(term);
                this.isSearching = false;
                this.modeRecherche = 'local';
            }
        });
    }

    private filtreLocal(term: string): any[] {
        const t = term.toLowerCase();
        return this.evenements.filter(e =>
            e.titre?.toLowerCase().includes(t) ||
            e.lieu?.toLowerCase().includes(t) ||
            e.type?.toLowerCase().includes(t)
        );
    }

    selectionnerSuggestion(evenement: any) {
        this.searchTerm = evenement.titre;
        this.filteredEvenements = [evenement];
        this.showDropdown = false;
    }

    selectionnerHistorique(terme: string) {
        this.searchTerm = terme;
        this.showDropdown = false;
        this.executerRecherche(terme);
    }

    effacerRecherche() {
        this.searchTerm = '';
        this.filteredEvenements = [...this.evenements];
        this.showDropdown = false;
    }

    fermerDropdown() {
        setTimeout(() => this.showDropdown = false, 200);
    }

    chargerHistorique() {
        if (!this.candidatId) return;
        this.searchService.getHistorique(this.candidatId).subscribe({
            next: (data) => this.historique = data.slice(0, 5),
            error: () => {}
        });
    }

    chargerSuggestions() {
        if (!this.candidatId) return;
        this.searchService.getSuggestions(this.candidatId).subscribe({
            next: (data) => this.suggestions = data.slice(0, 4),
            error: () => {}
        });
    }

    // ════════════════════════════════════════════
    //  POPUP DETAIL + REPUTATION
    // ════════════════════════════════════════════

    ouvrirDetail(evenement: any): void {
        this.evenementSelectionne = evenement;
        this.popupDetailOuvert = true;
        this.reputationData = null;
        this.loadingReputation = true;

        this.feedbackEventService.getReputation(
            evenement.organisateurId,
            evenement.nomOrganisateur,
            evenement.type,
            evenement.titre
        ).subscribe({
            next: (data) => {
                this.reputationData = data;
                this.loadingReputation = false;
            },
            error: () => this.loadingReputation = false
        });
    }

    fermerDetail(): void {
        this.popupDetailOuvert = false;
        this.evenementSelectionne = null;
        this.reputationData = null;
    }

    getBadgeClass(badge: string): string {
        if (!badge) return '';
        if (badge.includes('EXCELLENT') || badge.includes('TRES_APPRECIE')) return 'badge-excellent';
        if (badge.includes('RECOMMANDE') || badge.includes('BON') || badge.includes('BIEN')) return 'badge-recommande';
        if (badge.includes('MOYEN')) return 'badge-moyen';
        if (badge.includes('PEU') || badge.includes('MAUVAIS')) return 'badge-mauvais';
        if (badge.includes('NOUVEAU') || badge.includes('PREMIER')) return 'badge-nouveau';
        return '';
    }

    getBadgeLabel(badge: string): string {
        if (!badge) return '';
        if (badge.includes('EXCELLENT')) return '⭐ Excellent';
        if (badge.includes('TRES_APPRECIE')) return '🔥 Édition précédente très appréciée';
        if (badge.includes('RECOMMANDE')) return '👍 Recommandé';
        if (badge.includes('BON')) return '👍 Bon organisateur';
        if (badge.includes('BIEN_NOTE')) return '👍 Bien noté';
        if (badge.includes('MOYEN')) return '⚠️ Avis mitigés';
        if (badge.includes('PEU_RECOMMANDE')) return '❌ Peu recommandé';
        if (badge.includes('MAUVAIS')) return '❌ Mauvais retours';
        if (badge.includes('NOUVEAU') || badge.includes('PREMIER')) return '🆕 Premier événement de ce type';
        return badge;
    }

    // ════════════════════════════════════════════
    //  PARTICIPATIONS
    // ════════════════════════════════════════════

    chargerMesParticipations() {
        if (!this.candidatId) return;
        this.participationService.getByCandidat(this.candidatId).subscribe({
            next: (data) => {
                this.mesParticipations = data;
                this.demandesEnvoyees.clear();
                this.participationsStatuts.clear();
                data.forEach((p: any) => {
                    this.demandesEnvoyees.add(p.evenementId);
                    this.participationsStatuts.set(p.evenementId, p.statut);
                });
                this.demandesEnvoyees = new Set(this.demandesEnvoyees);
            },
            error: (err) => console.error('Erreur participations:', err)
        });
    }

    getStatutEvenement(evenementId: number): string {
        return this.participationsStatuts.get(evenementId) || '';
    }

    aDejaDemandeA(evenementId: number): boolean {
        return this.demandesEnvoyees.has(evenementId);
    }

    participer(evenementId: number) {
        this.participationService.confirmer({
            evenementId,
            candidatId: this.candidatId
        }).subscribe({
            next: () => {
                this.demandesEnvoyees.add(evenementId);
                this.participationsStatuts.set(evenementId, 'EN_ATTENTE');
                this.demandesEnvoyees = new Set(this.demandesEnvoyees);
                this.chargerMesParticipations();
            },
            error: (err) => {
                console.error('Erreur participation:', err);
                alert('Erreur lors de la demande');
            }
        });
    }

    annulerParticipation(evenementId: number) {
        const participation = this.mesParticipations.find((p: any) => p.evenementId === evenementId);
        if (!participation) return;
        if (!confirm('Voulez-vous annuler votre demande de participation ?')) return;

        this.participationService.annuler(participation.id).subscribe({
            next: () => {
                this.demandesEnvoyees.delete(evenementId);
                this.participationsStatuts.delete(evenementId);
                this.mesParticipations = this.mesParticipations.filter(
                    (p: any) => p.evenementId !== evenementId
                );
                this.demandesEnvoyees = new Set(this.demandesEnvoyees);
            },
            error: (err) => {
                console.error('Erreur annulation:', err);
                alert('Erreur lors de l\'annulation');
            }
        });
    }

    get participationsConfirmees(): number[] {
        return Array.from(this.demandesEnvoyees)
            .filter(id => this.participationsStatuts.get(id) === 'CONFIRME');
    }

    // ════════════════════════════════════════════
    //  UTILITAIRES
    // ════════════════════════════════════════════

    formatDate(value: any): string {
        if (!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        const heureVide = date.getHours() === 0 && date.getMinutes() === 0;
        const datePart = date.toLocaleDateString('fr-FR');
        return heureVide
            ? datePart
            : `${datePart} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
}