import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from '../../common/navbar/navbar.component';
import { SubscribeComponent } from '../../common/subscribe/subscribe.component';
import { FooterComponent } from '../../common/footer/footer.component';
import { NgxScrollTopComponent } from 'ngx-scrolltop';
import { JobsSidebarComponent } from '../../common/jobs-sidebar/jobs-sidebar.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-jobs-listing-page',
    standalone: false,
    templateUrl: './jobs-listing-page.component.html',
    styleUrls: ['./jobs-listing-page.component.scss']
})
export class JobsListingPageComponent {

    title = 'Jobs Listing - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

