import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'app-admin-dashboard',
    standalone: false,
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {

    title = 'Admin Dashboard - Partenariat';

    constructor(private titleService: Title) {}

    ngOnInit() {
        this.titleService.setTitle(this.title);
    }
}