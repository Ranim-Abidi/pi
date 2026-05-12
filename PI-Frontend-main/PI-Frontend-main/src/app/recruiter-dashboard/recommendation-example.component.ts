// Example: Add this to your rd-manage-jobs component

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { RecommendationService } from '../services/recommendation.service';

@Component({
  selector: 'app-rd-manage-jobs-with-recommendations',
  standalone: true,
  imports: [CommonModule, SharedModule],
  template: `
    <div class="manage-jobs-container">
      <!-- Your existing job list code here... -->
      
      <!-- NEW: Add recommendation widget for each job -->
      <div class="job-item" *ngFor="let job of jobs">
        <h3>{{ job.title }}</h3>
        <p>{{ job.description }}</p>
        
        <!-- Add this recommendation widget -->
        <app-recommendation-widget
          [offerId]="job.id"
          [mode]="'candidates'"
          [limit]="10"
        ></app-recommendation-widget>
        
        <hr />
      </div>
    </div>
  `,
  styles: [`
    .manage-jobs-container {
      padding: 20px;
    }

    .job-item {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .job-item h3 {
      margin-top: 0;
      color: #333;
    }
  `]
})
export class RdManageJobsWithRecommendationsComponent implements OnInit {
  jobs: any[] = [];

  constructor(private recommendationService: RecommendationService) {}

  ngOnInit(): void {
    // Load your jobs here
    this.loadJobs();
  }

  loadJobs(): void {
    // Your existing job loading logic
  }
}
