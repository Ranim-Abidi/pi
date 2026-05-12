import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../api.service';

@Component({
    selector: 'app-rd-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './rd-dashboard.component.html',
    styleUrls: ['./rd-dashboard.component.scss']
})
export class RdDashboardComponent {
    loading = true;
    errorMessage = '';

    stats = {
        activeOffers: 0,
        totalCandidatures: 0,
        pendingCandidatures: 0,
        upcomingInterviews: 0,
        completedInterviews: 0,
        acceptanceRate: 0
    };

    topOffers: Array<{ titre: string; total: number; ratio: number }> = [];
    recentActivities: Array<{ icon: string; title: string; subtitle: string; badge: string; badgeClass: string }> = [];

    constructor(private apiService: ApiService) { }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.loading = true;
        this.errorMessage = '';

        this.apiService.getCurrentRecruteur().pipe(
            catchError(() => of(null))
        ).subscribe((recruteur: any) => {
            const recruteurId = Number(recruteur?.id || localStorage.getItem('recruteurId'));

            const offres$ = this.apiService.getMesOffresEmploi().pipe(catchError(() => of([])));
            const candidatures$ = this.apiService.getAllCandidaturesForRecruteur().pipe(catchError(() => of([])));
            const entretiens$ = (!isNaN(recruteurId) && recruteurId > 0)
                ? this.apiService.getEntretiensByRecruteur(recruteurId).pipe(catchError(() => of([])))
                : of([]);

            forkJoin({ offres: offres$, candidatures: candidatures$, entretiens: entretiens$ }).subscribe({
                next: ({ offres, candidatures, entretiens }) => {
                    const offresList = this.normalizeArray(offres);
                    const candidaturesList = this.normalizeArray(candidatures);
                    const entretiensList = this.normalizeArray(entretiens);

                    this.computeStats(offresList, candidaturesList, entretiensList);
                    this.computeTopOffers(offresList, candidaturesList);
                    this.computeRecentActivities(candidaturesList, entretiensList);
                    this.loading = false;
                },
                error: () => {
                    this.errorMessage = 'Impossible de charger les statistiques du dashboard.';
                    this.loading = false;
                }
            });
        });
    }

    private normalizeArray(value: any): any[] {
        if (Array.isArray(value)) {
            return value;
        }

        if (value && typeof value === 'object') {
            const nestedArray = Object.values(value).find((entry: any) => Array.isArray(entry));
            return Array.isArray(nestedArray) ? nestedArray : [];
        }

        return [];
    }

    private computeStats(offres: any[], candidatures: any[], entretiens: any[]): void {
        const offerIds = new Set(offres.map((offre: any) => Number(offre?.id)).filter((id: number) => !isNaN(id)));
        const candidaturesForMyOffers = candidatures.filter((c: any) => offerIds.has(Number(c?.offreId)));

        const now = new Date();
        const upcomingInterviews = entretiens.filter((entretien: any) => {
            const d = new Date(entretien?.dateEntretien);
            return !isNaN(d.getTime()) && d >= now;
        }).length;

        const completedInterviews = entretiens.filter((entretien: any) => entretien?.completed === true).length;
        const accepted = candidaturesForMyOffers.filter((c: any) => c?.statut === 'ACCEPTEE').length;

        this.stats.activeOffers = offres.filter((offre: any) => {
            const statut = String(offre?.statut || 'ACTIVE').toUpperCase();
            return statut !== 'CLOSED' && statut !== 'FERMEE';
        }).length;
        this.stats.totalCandidatures = candidaturesForMyOffers.length;
        this.stats.pendingCandidatures = candidaturesForMyOffers.filter((c: any) => c?.statut === 'EN_ATTENTE').length;
        this.stats.upcomingInterviews = upcomingInterviews;
        this.stats.completedInterviews = completedInterviews;
        this.stats.acceptanceRate = this.stats.totalCandidatures > 0
            ? Math.round((accepted / this.stats.totalCandidatures) * 100)
            : 0;
    }

    private computeTopOffers(offres: any[], candidatures: any[]): void {
        const offerById = new Map<number, any>();
        offres.forEach((offre: any) => {
            const id = Number(offre?.id);
            if (!isNaN(id)) {
                offerById.set(id, offre);
            }
        });

        const counts = new Map<number, number>();
        candidatures.forEach((c: any) => {
            const offreId = Number(c?.offreId);
            if (!isNaN(offreId) && offerById.has(offreId)) {
                counts.set(offreId, (counts.get(offreId) || 0) + 1);
            }
        });

        const max = Math.max(1, ...Array.from(counts.values()));
        this.topOffers = Array.from(counts.entries())
            .map(([offreId, total]) => {
                const offre = offerById.get(offreId);
                return {
                    titre: offre?.titre || `Offre #${offreId}`,
                    total,
                    ratio: Math.round((total / max) * 100)
                };
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }

    private computeRecentActivities(candidatures: any[], entretiens: any[]): void {
        const activities: Array<{ date: Date; icon: string; title: string; subtitle: string; badge: string; badgeClass: string }> = [];

        candidatures.forEach((c: any) => {
            const d = new Date(c?.dateEnvoi);
            if (isNaN(d.getTime())) {
                return;
            }

            activities.push({
                date: d,
                icon: 'ri-user-add-line',
                title: 'Nouvelle candidature',
                subtitle: `${c?.nomComplet || 'Candidat'} pour ${c?.offreTitre || c?.poste || 'une offre'}`,
                badge: this.getStatutLabel(c?.statut),
                badgeClass: this.getStatutBadgeClass(c?.statut)
            });
        });

        entretiens.forEach((e: any) => {
            const d = new Date(e?.dateEntretien);
            if (isNaN(d.getTime())) {
                return;
            }

            activities.push({
                date: d,
                icon: e?.completed ? 'ri-checkbox-circle-line' : 'ri-calendar-event-line',
                title: e?.completed ? 'Entretien terminé' : 'Entretien planifié',
                subtitle: `${e?.titre || 'Entretien'} • ${e?.mode || 'N/A'}`,
                badge: e?.completed ? 'Terminé' : 'À venir',
                badgeClass: e?.completed ? 'badge-success' : 'badge-primary'
            });
        });

        this.recentActivities = activities
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 6)
            .map((item) => ({
                icon: item.icon,
                title: item.title,
                subtitle: item.subtitle,
                badge: item.badge,
                badgeClass: item.badgeClass
            }));
    }

    private getStatutLabel(statut: string): string {
        switch (statut) {
            case 'ACCEPTEE':
                return 'Acceptée';
            case 'REFUSEE':
                return 'Refusée';
            case 'EN_ATTENTE':
                return 'En attente';
            default:
                return 'Nouvelle';
        }
    }

    private getStatutBadgeClass(statut: string): string {
        switch (statut) {
            case 'ACCEPTEE':
                return 'badge-success';
            case 'REFUSEE':
                return 'badge-danger';
            case 'EN_ATTENTE':
                return 'badge-warning';
            default:
                return 'badge-secondary';
        }
    }
}
