import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-rd-sidebar',
    standalone: false,
    templateUrl: './rd-sidebar.component.html',
    styleUrls: ['./rd-sidebar.component.scss']
})
export class RdSidebarComponent {
    classApplied = false;

    constructor(private router: Router) { }

    ngOnInit(): void { }

    toggleClass(): void {
        this.classApplied = !this.classApplied;
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('recruteurId');
        localStorage.removeItem('currentUser');
        this.classApplied = false;
        this.router.navigate(['/login']);
    }
}
