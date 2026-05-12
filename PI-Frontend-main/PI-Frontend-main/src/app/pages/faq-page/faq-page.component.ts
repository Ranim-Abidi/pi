import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SharedModule } from '../../shared/shared.module';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-faq-page',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './faq-page.component.html',
    styleUrls: ['./faq-page.component.scss']
})
export class FaqPageComponent {

    title = 'Frequently Asked Questions - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

