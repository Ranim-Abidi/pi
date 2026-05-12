import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SharedModule } from '../../shared/shared.module';

@Component({
    selector: 'app-home-demo-three',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './home-demo-three.component.html',
    styleUrls: ['./home-demo-three.component.scss']
})
export class HomeDemoThreeComponent {

    title = 'Home Demo - 3 - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}

