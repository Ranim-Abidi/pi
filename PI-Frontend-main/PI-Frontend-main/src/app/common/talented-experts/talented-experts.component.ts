import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-talented-experts',
    standalone: false,
    templateUrl: './talented-experts.component.html',
    styleUrls: ['./talented-experts.component.scss']
})
export class TalentedExpertsComponent {

    constructor(
        public router: Router
    ) { }

}

