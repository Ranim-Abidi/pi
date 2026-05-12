import { Component, OnInit, Input } from '@angular/core';
import { RecommendationService } from '../../services/recommendation.service';

@Component({
  selector: 'app-recommendation-widget',
  standalone: false,
  templateUrl: './recommendation-widget.component.html',
  styleUrls: ['./recommendation-widget.component.scss']
})
export class RecommendationWidgetComponent implements OnInit {
  @Input() offerId: number | null = null;
  @Input() candidateId: number | null = null;
  @Input() mode: 'candidates' | 'offers' = 'candidates';
  @Input() limit: number = 5;

  recommendations: any[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private recommendationService: RecommendationService) {}

  ngOnInit(): void {
    if ((this.mode === 'candidates' && this.offerId) || (this.mode === 'offers' && this.candidateId)) {
      this.loadRecommendations();
    }
  }

  loadRecommendations(): void {
    this.isLoading = true;
    this.error = null;

    if (this.mode === 'candidates' && this.offerId) {
      this.recommendationService.getTopCandidatesForOffer(this.offerId, this.limit)
        .subscribe({
          next: (data: any[]) => {
            console.log('📊 Recommendations data received:', data);
            this.recommendations = data;
            this.isLoading = false;
          },
          error: (err: any) => {
            console.error('Error loading recommendations:', err);
            this.error = 'Failed to load recommendations. Please try again.';
            this.isLoading = false;
          }
        });
    } else if (this.mode === 'offers' && this.candidateId) {
      this.recommendationService.getRecommendedOffersForCandidate(this.candidateId, this.limit)
        .subscribe({
          next: (data: any[]) => {
            console.log('📊 Recommendations data received:', data);
            this.recommendations = data;
            this.isLoading = false;
          },
          error: (err: any) => {
            console.error('Error loading recommendations:', err);
            this.error = 'Failed to load job recommendations. Please try again.';
            this.isLoading = false;
          }
        });
    }
  }

  refreshRecommendations(): void {
    this.loadRecommendations();
  }

  generateRecommendations(): void {
    if (!this.offerId || this.mode !== 'candidates') {
      this.error = 'Cannot generate recommendations without offer ID';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.recommendationService.generateRecommendationsForOffer(this.offerId)
      .subscribe({
        next: (response: any) => {
          console.log('Recommendations generated successfully:', response);
          // After generating, load the recommendations
          this.loadRecommendations();
        },
        error: (err: any) => {
          console.error('Error generating recommendations:', err);
          this.isLoading = false;
          this.error = err?.error?.message || 'Failed to generate recommendations. Please try again.';
        }
      });
  }

  getLevelClass(level: string): string {
    return level.toLowerCase().replace(/\s+/g, '-');
  }
}
