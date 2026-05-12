# Frontend Testing Guide: Recommendation System

## 🎯 Quick Start

### Step 1: Add Recommendation Widget to Your Page

In any component where you manage jobs or candidates, import the widget:

```typescript
import { RecommendationWidgetComponent } from './path/to/recommendation-widget.component';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, RecommendationWidgetComponent],
  template: `
    <!-- Show top candidates for a job -->
    <app-recommendation-widget
      [offerId]="currentJobId"
      [mode]="'candidates'"
      [limit]="10"
    ></app-recommendation-widget>
    
    <!-- OR show recommended jobs for a candidate -->
    <app-recommendation-widget
      [candidateId]="currentCandidateId"
      [mode]="'offers'"
      [limit]="10"
    ></app-recommendation-widget>
  `
})
export class MyComponent {
  currentJobId = 1;  // Replace with actual job ID
  currentCandidateId = 1;  // Replace with actual candidate ID
}
```

### Step 2: Test in Browser

1. **Start Angular Dev Server**
   ```bash
   cd PI-Frontend
   ng serve
   # Visit: http://localhost:4200
   ```

2. **Ensure backends are running**
   ```bash
   # Terminal 2: Spring Boot
   cd PI-Backend
   mvn spring-boot:run
   
   # Terminal 3: Flask
   cd PI-Backend
   python flask_recommendation_api.py
   ```

3. **Navigate to your page** with the recommendation widget

---

## 🧪 Testing Scenarios

### Scenario 1: Show Top Candidates for a Job Offer

**Setup:**
```typescript
// In recruiter dashboard or job details page
@Component({
  template: `
    <div class="job-details">
      <h2>{{ job.title }}</h2>
      
      <!-- Show top 10 recommended candidates -->
      <app-recommendation-widget
        [offerId]="job.id"
        [mode]="'candidates'"
        [limit]="10"
      ></app-recommendation-widget>
    </div>
  `
})
```

**Expected Result:**
- Widget loads and shows "Loading recommendations..."
- After 2-3 seconds, displays list of candidates
- Each candidate shows:
  - ✓ Name
  - ✓ Overall score (0-100%)
  - ✓ Recommendation level (Très recommandé, Recommandé, etc.)
  - ✓ Breakdown of 4 scores (Skills, Experience, Location, Domain)
  - ✓ Action buttons (View Profile, Send Offer)

---

### Scenario 2: Show Recommended Jobs for a Candidate

**Setup:**
```typescript
// In candidate profile or dashboard
@Component({
  template: `
    <div class="candidate-profile">
      <h2>{{ candidate.name }}</h2>
      
      <!-- Show top 10 recommended jobs -->
      <app-recommendation-widget
        [candidateId]="candidate.id"
        [mode]="'offers'"
        [limit]="10"
      ></app-recommendation-widget>
    </div>
  `
})
```

**Expected Result:**
- Widget loads and shows recommended jobs
- Each job shows:
  - ✓ Job title
  - ✓ Match score (0-100%)
  - ✓ Recommendation level
  - ✓ Why it's a good match

---

### Scenario 3: Error Handling

**Test What Happens When:**

1. **Backend is offline**
   - Flask not running → Shows "Failed to load recommendations"
   - Spring Boot not running → Shows "Failed to load recommendations"
   - Expected: Error message with "Try Again" button

2. **Invalid ID passed**
   - offerId=999 (doesn't exist) → Empty list or error
   - candidateId=999 (doesn't exist) → Empty list or error

3. **Network error**
   - Disable internet → Shows error message
   - Expected: User can retry

---

## 🔍 Browser Developer Tools Testing

### Check Network Requests

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Click the widget or refresh**
4. **Watch for requests to:**
   - `/api/recommendations/offre/{id}/top-candidates`
   - `/api/recommendations/candidate/{id}/recommended-offres`

**Expected Response:**
```json
[
  {
    "id": 1,
    "candidatName": "John Doe",
    "scoreglobal": 81.25,
    "recommendationLevel": "Très recommandé",
    "sSkills": 0.85,
    "sExperience": 0.90,
    "sLocation": 0.70,
    "sDomain": 0.80
  },
  ...
]
```

---

## 🧩 Service Testing

Test the **RecommendationService** directly:

```typescript
// In component or test file
import { RecommendationService } from './services/recommendation.service';

constructor(private recService: RecommendationService) {}

testService() {
  // Test 1: Get top candidates
  this.recService.getTopCandidatesForOffer(1, 10).subscribe(
    candidates => console.log('✓ Got candidates:', candidates),
    error => console.error('✗ Error:', error)
  );

  // Test 2: Get recommended jobs
  this.recService.getRecommendedOffersForCandidate(1, 10).subscribe(
    offers => console.log('✓ Got offers:', offers),
    error => console.error('✗ Error:', error)
  );

  // Test 3: Single recommendation
  this.recService.getSingleRecommendation(1, 1).subscribe(
    rec => console.log('✓ Got recommendation:', rec),
    error => console.error('✗ Error:', error)
  );

  // Test 4: Health check
  this.recService.checkHealth().subscribe(
    health => console.log('✓ Service health:', health),
    error => console.error('✗ Service error:', error)
  );
}
```

---

## 📊 Integration Points

### Where to Add Recommendations

1. **Recruiter Dashboard**
   - Show top candidates for each active job posting
   - Location: `/recruiter-dashboard/rd-manage-jobs/`
   - Add widget above or below job details

2. **Job Details Page**
   - Show top 5-10 recommended candidates
   - When recruiter clicks on a job offer

3. **Applicants List**
   - Show match score next to each applicant
   - Rank applicants by recommendation score

4. **Candidate Profile**
   - Show recommended jobs for this candidate
   - Help candidates find matching opportunities

5. **Dashboard Analytics**
   - Show statistics: avg match score, distribution
   - Charts by recommendation level

---

## 🎨 Customizing the Widget

### Change Appearance

```typescript
// Make it more compact
<app-recommendation-widget
  [offerId]="job.id"
  [mode]="'candidates'"
  [limit]="5"  // Show only 5 instead of 10
></app-recommendation-widget>

// Create custom styles
:host {
  --primary-color: #667eea;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
}
```

### Extend with Custom Logic

```typescript
@Component({
  imports: [RecommendationWidgetComponent],
  template: `
    <app-recommendation-widget
      #recWidget
      [offerId]="offerId"
      [mode]="'candidates'"
    ></app-recommendation-widget>
  `
})
export class MyExtendedComponent {
  @ViewChild('recWidget') recWidget!: RecommendationWidgetComponent;

  ngAfterViewInit() {
    // Access widget data programmatically
    console.log(this.recWidget.recommendations);
  }

  onCandidateSelected(candidate: any) {
    // Handle candidate selection
    console.log('Selected:', candidate);
  }
}
```

---

## ✅ Testing Checklist

- [ ] Widget loads without errors
- [ ] Displays loading state while fetching
- [ ] Shows recommendations after loading
- [ ] All scores display correctly (0-100%)
- [ ] Recommendation levels show with correct colors
- [ ] Scores breakdown is visible and accurate
- [ ] Action buttons are clickable
- [ ] Error message shows if backend fails
- [ ] Refresh button works
- [ ] Responsive on mobile devices
- [ ] Network requests are made to correct endpoints
- [ ] Authorization headers are sent (token)
- [ ] Data persists when navigating away and back

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Widget shows "Loading..." forever | Check Spring Boot and Flask are running |
| Empty list | No recommendations generated yet, run batch processing |
| CORS error | Check Spring Boot has @CrossOrigin("*") |
| 401 Unauthorized | Check token in localStorage |
| 404 Not Found | Check job/candidate ID exists in database |
| Poor performance | Reduce `limit` parameter, check database indexes |

---

## 📝 Example: Full Integration

```typescript
// recruiter-dashboard/rd-manage-jobs/rd-manage-jobs.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecommendationWidgetComponent } from '../recommendation-widget/recommendation-widget.component';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-rd-manage-jobs',
  standalone: true,
  imports: [CommonModule, RecommendationWidgetComponent],
  template: `
    <div class="container">
      <h2>Manage Job Offers</h2>

      <div *ngFor="let job of jobs" class="job-card">
        <div class="job-header">
          <h3>{{ job.titre }}</h3>
          <span class="badge">{{ job.status }}</span>
        </div>

        <div class="job-content">
          <p>{{ job.description }}</p>
          <p><strong>Location:</strong> {{ job.localisation?.nomVille }}</p>
        </div>

        <!-- ✨ ADD RECOMMENDATIONS HERE ✨ -->
        <app-recommendation-widget
          [offerId]="job.id"
          [mode]="'candidates'"
          [limit]="5"
        ></app-recommendation-widget>

        <div class="job-actions">
          <button>Edit</button>
          <button>Delete</button>
          <button>View All Applications</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .job-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }

    .badge {
      background: #667eea;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
  `]
})
export class RdManageJobsComponent implements OnInit {
  jobs: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadJobs();
  }

  loadJobs() {
    // Load jobs from your API
    this.apiService.getOffers().subscribe(data => {
      this.jobs = data;
    });
  }
}
```

---

## 🚀 Next Steps

1. Copy `recommendation.service.ts` to `src/app/services/`
2. Copy `recommendation-widget.component.ts` to `src/app/recruiter-dashboard/`
3. Import widget in your component
4. Add `<app-recommendation-widget>` to template
5. Test in browser with DevTools open
6. Customize styles as needed

Happy testing! 🎉
