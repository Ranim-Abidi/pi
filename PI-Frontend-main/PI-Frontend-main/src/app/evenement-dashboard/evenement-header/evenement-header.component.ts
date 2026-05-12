import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-evenement-header',
    standalone: false,
    templateUrl: './evenement-header.component.html',
    styleUrls: ['./evenement-header.component.scss']
})
export class EvenementHeaderComponent implements OnInit {

    classApplied = false;
    classApplied2 = false;
    userName = '';

    constructor(private router: Router) {}

    ngOnInit() {
        this.userName = localStorage.getItem('userName') || 'Organisateur';
    }

    toggleClass() {
        this.classApplied = !this.classApplied;
    }

    toggleClass2() {
        this.classApplied2 = !this.classApplied2;
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        this.router.navigate(['/']);
    }
}