import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from '../../common/navbar/navbar.component';
import { LeadingCompanyComponent } from '../../common/leading-company/leading-company.component';
import { AboutUsComponent } from '../../common/about-us/about-us.component';
import { FunfactsComponent } from '../../common/funfacts/funfacts.component';
import { HowJoveWorksComponent } from '../../common/how-jove-works/how-jove-works.component';
import { TalentedExpertsComponent } from '../../common/talented-experts/talented-experts.component';
import { TestimonialsComponent } from '../../common/testimonials/testimonials.component';
import { DownloadAppComponent } from '../../common/download-app/download-app.component';
import { SubscribeComponent } from '../../common/subscribe/subscribe.component';
import { FooterComponent } from '../../common/footer/footer.component';
import { NgxScrollTopComponent } from 'ngx-scrolltop';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-about-page',
    standalone: false,
    templateUrl: './about-page.component.html',
    styleUrls: ['./about-page.component.scss']
})
export class AboutPageComponent {

    title = 'About Us - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

