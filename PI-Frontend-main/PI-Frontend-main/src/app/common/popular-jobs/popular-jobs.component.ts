import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-popular-jobs',
    standalone: false,
    templateUrl: './popular-jobs.component.html',
    styleUrls: ['./popular-jobs.component.scss']
})
export class PopularJobsComponent {

    constructor(
        public router: Router
    ) { }

}

