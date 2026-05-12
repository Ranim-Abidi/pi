import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EvenementService } from '../../services/evenement-service';
import { ApiService } from '../../api.service';
import { FormationService } from '../../formations/services/formation.service';

@Component({
    selector: 'app-cd-news',
    templateUrl: './cd-news.component.html',
    styleUrls: ['./cd-news.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule]
})
export class CdNewsComponent implements OnInit {
    
    items: any[] = [];
    filteredItems: any[] = [];
    currentItemIndex: number = 0;
    isLoading: boolean = true;
    
    // Filter options
    showWorkshops: boolean = true;
    showJobs: boolean = true;
    showFormations: boolean = true;
    
    constructor(
        private evenementService: EvenementService,
        private apiService: ApiService,
        private formationService: FormationService
    ) { }
    
    ngOnInit(): void {
        console.log('CdNewsComponent initialized');
        this.loadItems();
    }
    
    loadItems(): void {
        console.log('Loading events, jobs, and formations...');
        let eventsLoaded = false;
        let jobsLoaded = false;
        let formationsLoaded = false;
        let events: any[] = [];
        let jobs: any[] = [];
        let formations: any[] = [];
        
        // Load events
        this.evenementService.getAll().subscribe({
            next: (data: any[]) => {
                console.log('Events loaded:', data);
                events = data && data.length > 0 ? data : [];
                eventsLoaded = true;
                this.checkAndUpdateItems(events, jobs, formations, eventsLoaded, jobsLoaded, formationsLoaded);
            },
            error: (err: any) => {
                console.error('Error loading events:', err);
                eventsLoaded = true;
                this.checkAndUpdateItems(events, jobs, formations, eventsLoaded, jobsLoaded, formationsLoaded);
            }
        });
        
        // Load jobs
        this.apiService.getOffresEmploi().subscribe({
            next: (data: any[]) => {
                console.log('Jobs loaded:', data);
                jobs = data && data.length > 0 ? data : [];
                jobsLoaded = true;
                this.checkAndUpdateItems(events, jobs, formations, eventsLoaded, jobsLoaded, formationsLoaded);
            },
            error: (err: any) => {
                console.error('Error loading jobs:', err);
                jobsLoaded = true;
                this.checkAndUpdateItems(events, jobs, formations, eventsLoaded, jobsLoaded, formationsLoaded);
            }
        });
        
        // Load formations
        this.formationService.getAllFormations().subscribe({
            next: (data: any[]) => {
                console.log('Formations loaded:', data);
                formations = data && data.length > 0 ? data : [];
                formationsLoaded = true;
                this.checkAndUpdateItems(events, jobs, formations, eventsLoaded, jobsLoaded, formationsLoaded);
            },
            error: (err: any) => {
                console.error('Error loading formations:', err);
                formationsLoaded = true;
                this.checkAndUpdateItems(events, jobs, formations, eventsLoaded, jobsLoaded, formationsLoaded);
            }
        });
    }
    
    checkAndUpdateItems(events: any[], jobs: any[], formations: any[], eventsLoaded: boolean, jobsLoaded: boolean, formationsLoaded: boolean): void {
        if (!eventsLoaded || !jobsLoaded || !formationsLoaded) return;
        
        const markedJobs = jobs.map((job: any) => ({
            ...job,
            type: 'JOB'
        }));
        
        const markedFormations = formations.map((formation: any) => ({
            ...formation,
            type: 'FORMATION'
        }));
        
        const markedEvents = events.map((event: any) => ({
            ...event,
            type: 'WORKSHOP'
        }));
        
        this.items = [...markedEvents, ...markedJobs, ...markedFormations];
        this.currentItemIndex = 0;
        this.applyFilters();
        this.isLoading = false;
        console.log('Items count:', this.items.length);
    }
    
    applyFilters(): void {
        this.filteredItems = this.items.length > 0 ? this.items.filter((item: any) => {
            if (item.type === 'JOB' && !this.showJobs) return false;
            if (item.type === 'FORMATION' && !this.showFormations) return false;
            if ((item.type === 'WORKSHOP' || !['JOB', 'FORMATION'].includes(item.type)) && !this.showWorkshops) return false;
            return true;
        }) : [];
        
        if (this.currentItemIndex >= this.filteredItems.length) {
            this.currentItemIndex = 0;
        }
    }
    
    onFilterChange(): void {
        this.applyFilters();
    }
    
    get currentItem(): any {
        return this.filteredItems[this.currentItemIndex] || null;
    }
    
    nextEvent(): void {
        if (this.filteredItems.length === 0) return;
        if (this.currentItemIndex < this.filteredItems.length - 1) {
            this.currentItemIndex++;
        } else {
            this.currentItemIndex = 0;
        }
    }
    
    prevEvent(): void {
        if (this.filteredItems.length === 0) return;
        if (this.currentItemIndex > 0) {
            this.currentItemIndex--;
        } else {
            this.currentItemIndex = this.filteredItems.length - 1;
        }
    }
    
    goToEvent(index: number): void {
        if (index >= 0 && index < this.filteredItems.length) {
            this.currentItemIndex = index;
        }
    }
}

