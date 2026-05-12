import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { EdHeaderComponent } from './ed-header/ed-header.component';
import { EdSidebarComponent } from './ed-sidebar/ed-sidebar.component';
import { EdFooterComponent } from './ed-footer/ed-footer.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-employers-dashboard',
    standalone: false,
    templateUrl: './employers-dashboard.component.html',
    styleUrls: ['./employers-dashboard.component.scss']
})
export class EmployersDashboardComponent {

    title = 'Employers Dashboard - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

