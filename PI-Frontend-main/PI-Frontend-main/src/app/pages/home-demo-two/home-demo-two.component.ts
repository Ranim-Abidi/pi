import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SharedModule } from '../../shared/shared.module';

@Component({
    selector: 'app-home-demo-two',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './home-demo-two.component.html',
    styleUrls: ['./home-demo-two.component.scss']
})
export class HomeDemoTwoComponent {

    title = 'Home Demo - 2 - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

