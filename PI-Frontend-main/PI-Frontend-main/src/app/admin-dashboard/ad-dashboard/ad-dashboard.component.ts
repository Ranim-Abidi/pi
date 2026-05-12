import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PartenaireService } from '../../services/partenaire.service';
import { OffrePartenaireService } from '../../services/offre-partenaire.service';
import { DashboardService } from '../../services/dashboard.service';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-ad-dashboard',
    standalone: false,
    templateUrl: './ad-dashboard.component.html',
    styleUrls: ['./ad-dashboard.component.scss']
})
export class AdDashboardComponent implements OnInit, OnDestroy {

    
    totalPartenaires = 0;
    totalOffres      = 0;
    totalEmplois     = 0;
    totalStages      = 0;
    offres: any[]    = [];
    adminName        = '';
    today            = new Date();

    
    currentTime = '';
    currentDate = '';
    private clockInterval: any;

    
    topPartenaires: any[] = [];
    maxOffres = 1;
    medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

    
    scores: any[] = [];

   
    statsKeywords: any = null;

    
    activities: any[]  = [];
    wsConnected = false;
    private subs: Subscription[] = [];

    constructor(
        private titleService:      Title,
        private partenaireService: PartenaireService,
        private offreService:      OffrePartenaireService,
        private dashboardService:  DashboardService,
        private wsService:         WebsocketService
    ) {}

    ngOnInit() {
        this.titleService.setTitle('Admin Dashboard');
        this.adminName = localStorage.getItem('userName') || 'Admin';
        this.loadData();
        this.startClock();
        this.loadTopPartenaires();
        this.loadScores();
        this.loadStatsKeywords();
        this.connectWebSocket();
    }

    ngOnDestroy() {
        clearInterval(this.clockInterval);
        this.subs.forEach(s => s.unsubscribe());
        
    }

    
    loadData() {
        this.partenaireService.getAll().subscribe({
            next: (data: any[]) => {
                this.totalPartenaires = data.length;
            },
            error: (err: any) => console.error(err)
        });

        this.offreService.getAll().subscribe({
            next: (data: any[]) => {
                this.totalOffres  = data.length;
                this.totalEmplois = data.filter(o => o.type === 'EMPLOI').length;
                this.totalStages  = data.filter(o => o.type === 'STAGE').length;
                this.offres       = [...data]
                    .sort((a, b) =>
                        new Date(b.datePublication).getTime() -
                        new Date(a.datePublication).getTime()
                    )
                    .slice(0, 5);
            },
            error: (err: any) => console.error(err)
        });
    }

    getPourcentage(valeur: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((valeur / total) * 100);
    }

    formatDate(date: string): string {
        if (!date) return '';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }

    
    startClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        const now        = new Date();
        this.currentTime = now.toLocaleTimeString('fr-FR');
        this.currentDate = now.toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
    }

    
    loadTopPartenaires() {
        this.dashboardService.getTopPartenaires().subscribe({
            next: (data: any[]) => {
                this.topPartenaires = data;
                this.maxOffres = data.length > 0 ? data[0].nbOffres : 1;
            },
            error: (e) => console.error(e)
        });
    }

    
    loadScores() {
        this.dashboardService.getScoresPopularite().subscribe({
            next: (data: any[]) => this.scores = data,
            error: (e) => console.error(e)
        });
    }

    
    loadStatsKeywords() {
        this.dashboardService.getStatsKeywords().subscribe({
            next: (data: any) => this.statsKeywords = data,
            error: (e) => console.error(e)
        });
    }

    
    connectWebSocket() {
    this.wsService.connect();

    
    const actSub = this.wsService.getActivities().subscribe(data => {
        if (data && data.length > 0) {
            this.activities = data;
        }
    });

    
    const dashSub = this.wsService.getDashboardUpdates().subscribe(data => {
        if (!data) return;
        this.wsConnected = true;
        if (data.topPartenaires) {
            this.topPartenaires = data.topPartenaires;
            this.maxOffres = this.topPartenaires[0]?.nbOffres || 1;
        }
        if (data.scores) this.scores = data.scores;
    });

    this.subs.push(actSub, dashSub);
   }

    
    getBarWidth(nbOffres: number): number {
        return Math.round((nbOffres / this.maxOffres) * 100);
    }

    getStatutClass(statut: string): string {
    if (statut === 'TRES_ACTIF') return 'statut-tres-actif';
    if (statut === 'ACTIF')      return 'statut-actif';
    if (statut === 'PEU_ACTIF')  return 'statut-peu-actif';
    return 'statut-inactif';
}
}