import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CdHeaderComponent } from './cd-header/cd-header.component';
import { CdSidebarComponent } from './cd-sidebar/cd-sidebar.component';
import { CdFooterComponent } from './cd-footer/cd-footer.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-candidates-dashboard',
    standalone: false,
    templateUrl: './candidates-dashboard.component.html',
    styleUrls: ['./candidates-dashboard.component.scss']
})
export class CandidatesDashboardComponent {

    title = 'MatchyKhedma Dashboard';
 
    constructor(private titleService: Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

