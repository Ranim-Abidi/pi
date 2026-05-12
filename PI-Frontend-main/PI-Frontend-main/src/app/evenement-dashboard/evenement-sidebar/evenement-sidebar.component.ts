import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-evenement-sidebar',
    standalone: false,
    templateUrl: './evenement-sidebar.component.html',
    styleUrls: ['./evenement-sidebar.component.scss']
})
export class EvenementSidebarComponent {

    classApplied = false;

    constructor(private router: Router) {}

    toggleClass() {
        this.classApplied = !this.classApplied;
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        localStorage.removeItem('recruteurId');
        this.router.navigate(['/']); // ✅ redirige vers home
    }
}