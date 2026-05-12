import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from '../../common/navbar/navbar.component';
import { SubscribeComponent } from '../../common/subscribe/subscribe.component';
import { FooterComponent } from '../../common/footer/footer.component';
import { NgxScrollTopComponent } from 'ngx-scrolltop';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-employers-page',
    standalone: false,
    templateUrl: './employers-page.component.html',
    styleUrls: ['./employers-page.component.scss']
})
export class EmployersPageComponent {

    title = 'Employers - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

