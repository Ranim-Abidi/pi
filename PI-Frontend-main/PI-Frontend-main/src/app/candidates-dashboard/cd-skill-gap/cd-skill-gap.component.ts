import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';

interface SkillMatch {
  skill: string;
  candidate_skill: string;
  confidence: number;
  weight: number;
}

interface MissingSkill {
  skill: string;
  weight: number;
  importance: string;
}

interface Recommendation {
  formation_id: number;
  score_match: number;
  raisons: string[];
  competences_couvertes: string[];
}

@Component({
  selector: 'app-cd-skill-gap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cd-skill-gap.component.html',
  styleUrls: ['./cd-skill-gap.component.scss']
})
export class CdSkillGapComponent implements OnInit {
  inputSkills: string = "Python, SQL, ML, pandas, Stats";
  selectedJob: string = "Data Scientist";
  careers: any = {};
  careerList: string[] = [];
  
  result: any = null;
  loading: boolean = false;
  error: string | null = null;

  importanceLabel: any = { 1: "Utile", 2: "Important", 3: "Essentiel" };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadCareers();
    // Pre-load a default analysis if needed or wait for user click
  }

  loadCareers(): void {
    this.apiService.getAvailableCareers().subscribe({
      next: (data) => {
        this.careers = data;
        this.careerList = Object.keys(data);
        if (!this.selectedJob && this.careerList.length > 0) {
          this.selectedJob = this.careerList[0];
        }
      },
      error: (err) => {
        console.error('Error loading careers:', err);
        this.error = "Impossible de charger la liste des métiers.";
      }
    });
  }

  analyze(): void {
    this.loading = true;
    this.error = null;
    
    const candidateSkills = this.inputSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    // We also need "formations_disponibles" if we want recommendations.
    // For now, let's assume we fetch them or pass an empty list if not available.
    // In a real scenario, we'd fetch all formations first.
    
    this.apiService.postData('/formations').subscribe({
      next: (formations) => {
        const payload = {
          candidat_competences: candidateSkills,
          target_job: this.selectedJob,
          formations_terminees_ids: [], // Could be fetched from user profile
          formations_disponibles: formations // Using real formations from DB
        };

        this.apiService.analyzeSkillGapML(payload).subscribe({
          next: (res) => {
            this.result = res;
            this.loading = false;
          },
          error: (err) => {
            console.error('Error analyzing gap:', err);
            this.error = "Une erreur est survenue lors de l'analyse.";
            this.loading = false;
          }
        });
      },
      error: (err) => {
        // Fallback if formations can't be loaded
        const payload = {
          candidat_competences: candidateSkills,
          target_job: this.selectedJob,
          formations_terminees_ids: [],
          formations_disponibles: []
        };
        this.apiService.analyzeSkillGapML(payload).subscribe({
          next: (res) => {
            this.result = res;
            this.loading = false;
          },
          error: (err) => {
            this.error = "Une erreur est survenue lors de l'analyse.";
            this.loading = false;
          }
        });
      }
    });
  }

  getImportanceColor(weight: number): any {
    switch(weight) {
      case 3: return { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1' };
      case 2: return { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' };
      default: return { bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97' };
    }
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#0F6E56';
    if (score >= 40) return '#854F0B';
    return '#A32D2D';
  }

  sendRecommendationPrompt(missing: string): void {
     // Triggering a chatbot or search if available
     console.log(`Recherche de formations pour combler : ${missing}`);
     // If there's a global method for this, we could call it
  }
}
