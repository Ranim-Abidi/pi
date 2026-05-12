import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface CandidateStats {
    candidatId: number;
    candidatName: string;
    email: string;
    totalApplications: number;
    acceptedApplications: number;
    rejectedApplications: number;
    pendingApplications: number;
    totalFormations: number;
    completedFormations: number;
    inProgressFormations: number;
    profileCompleteness: number;
    competencesCount: number;
    cvUploaded: boolean;
    profilePictureUploaded: boolean;
    messagesCount: number;
    savedJobsCount: number;
    viewsCount: number;
    applicationSuccessRate: number;
    formationCompletionRate: number;
}

@Injectable({
    providedIn: 'root'
})
export class CandidateStatsService {

    private readonly baseUrl = `${environment.apiUrl}/candidate-stats`;

    constructor(private http: HttpClient) { }

    /**
     * Get stats for a specific candidate
     */
    getCandidateStats(candidatId: number): Observable<CandidateStats> {
        return this.http.get<CandidateStats>(`${this.baseUrl}/${candidatId}`);
    }

    /**
     * Get stats for all candidates (Admin)
     */
    getAllCandidatesStats(): Observable<CandidateStats[]> {
        return this.http.get<CandidateStats[]>(`${this.baseUrl}/all`);
    }
}
