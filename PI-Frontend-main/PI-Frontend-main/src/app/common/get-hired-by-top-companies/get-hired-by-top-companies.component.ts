import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-get-hired-by-top-companies',
    standalone: false,
    templateUrl: './get-hired-by-top-companies.component.html',
    styleUrls: ['./get-hired-by-top-companies.component.scss']
})
export class GetHiredByTopCompaniesComponent {

    constructor(
        public router: Router
    ) { }

}

