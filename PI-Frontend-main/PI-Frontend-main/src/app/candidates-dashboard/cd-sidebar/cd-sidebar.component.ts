import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-cd-sidebar',
    standalone: false,
    templateUrl: './cd-sidebar.component.html',
    styleUrls: ['./cd-sidebar.component.scss']
})
export class CdSidebarComponent {

    classApplied = false;

    constructor(private router: Router) { }

    ngOnInit(): void { }

    toggleClass() {
        this.classApplied = !this.classApplied;
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('candidatId');
        localStorage.removeItem('currentUser');
        this.classApplied = false;
        this.router.navigate(['/login']);
    }

}

