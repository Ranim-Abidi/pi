import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-ad-header',
    standalone: false,
    templateUrl: './ad-header.component.html',
    styleUrls: ['./ad-header.component.scss']
})
export class AdHeaderComponent {

    adminName: string = '';

    constructor(private router: Router) {
        this.adminName = localStorage.getItem('userName') || 'Admin';
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        this.router.navigate(['/']);
    }
}