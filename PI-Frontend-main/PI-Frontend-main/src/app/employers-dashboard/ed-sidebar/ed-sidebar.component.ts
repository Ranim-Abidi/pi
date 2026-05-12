import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-ed-sidebar',
    standalone: false,
    templateUrl: './ed-sidebar.component.html',
    styleUrls: ['./ed-sidebar.component.scss']
})
export class EdSidebarComponent {

    classApplied = false;
    toggleClass() {
        this.classApplied = !this.classApplied;
    }

}

