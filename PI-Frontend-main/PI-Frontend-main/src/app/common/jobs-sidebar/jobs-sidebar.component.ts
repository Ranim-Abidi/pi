import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-jobs-sidebar',
    standalone: false,
    templateUrl: './jobs-sidebar.component.html',
    styleUrls: ['./jobs-sidebar.component.scss']
})
export class JobsSidebarComponent {

    constructor(
        public router: Router
    ) { }

}

