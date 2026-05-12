import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SharedModule } from '../../shared/shared.module';

@Component({
    selector: 'app-home-demo-four',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './home-demo-four.component.html',
    styleUrls: ['./home-demo-four.component.scss']
})
export class HomeDemoFourComponent {

    title = 'Home Demo - 4 - Jove';
 
    constructor(private titleService:Title) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
    }

}
