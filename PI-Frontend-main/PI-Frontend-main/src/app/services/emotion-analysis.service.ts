import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface EmotionAnalysisDTO {
  id: number;
  entretienId: number;
  status: string;
  totalFrames: number;
  processedFrames: number;
  averageJoy: number;
  averageAnger: number;
  averageSadness: number;
  averageSurprise: number;
  averageFear: number;
  averageNeutral: number;
  averageStressLevel: number;
  averageConfidence: number;
  averagePitchVariation: number;
  speakingRate: number;
  silenceDuration: number;
  dominantEmotion: string;
  engagementScore: number;
  overallAssessment: string;
  createdAt: string;
  completedAt: string;
}

export interface EmotionFrameDTO {
  id: number;
  frameNumber: number;
  timestampSeconds: number;
  joy: number;
  anger: number;
  sadness: number;
  surprise: number;
  fear: number;
  neutral: number;
  faceDetected: boolean;
  voiceStress: number;
  voiceConfidence: number;
  pitch: number;
  volumeLevel: number;
  notes: string;
  createdAt: string;
}

export interface ProcessEmotionFrameRequest {
  frameNumber: number;
  timestampSeconds: number;
  joy: number;
  anger: number;
  sadness: number;
  surprise: number;
  fear: number;
  neutral: number;
  faceDetected: boolean;
  voiceStress?: number;
  voiceConfidence?: number;
  pitch?: number;
  volumeLevel?: number;
  frameImage?: string;
  audioChunk?: string;
  notes?: string;
}

/** Réponse API Spring (EmotionAnalysisController) */
interface WrappedResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmotionAnalysisService {
  /** Aligné sur le back : /api/interviews/{id}/emotion-analysis */
  private readonly baseUrl = '/api/interviews';

  constructor(private http: HttpClient) {}

  private extractData<T>(body: WrappedResponse<T> | T): T {
    if (body && typeof body === 'object' && 'data' in (body as object)) {
      return (body as WrappedResponse<T>).data as T;
    }
    return body as T;
  }

  startEmotionAnalysis(entretienId: number): Observable<EmotionAnalysisDTO> {
    return this.http
      .post<WrappedResponse<EmotionAnalysisDTO>>(`${this.baseUrl}/${entretienId}/emotion-analysis/start`, {})
      .pipe(
        map((res) => this.extractData<EmotionAnalysisDTO>(res)),
        catchError((err) => throwError(() => err))
      );
  }

  processEmotionFrame(entretienId: number, request: ProcessEmotionFrameRequest): Observable<EmotionFrameDTO> {
    return this.http
      .post<WrappedResponse<EmotionFrameDTO>>(
        `${this.baseUrl}/${entretienId}/emotion-analysis/process-frame`,
        request
      )
      .pipe(
        map((res) => this.extractData<EmotionFrameDTO>(res)),
        catchError((err) => throwError(() => err))
      );
  }

  getEmotionAnalysis(entretienId: number): Observable<EmotionAnalysisDTO> {
    return this.http
      .get<WrappedResponse<EmotionAnalysisDTO>>(`${this.baseUrl}/${entretienId}/emotion-analysis`)
      .pipe(
        map((res) => this.extractData<EmotionAnalysisDTO>(res)),
        catchError((err) => throwError(() => err))
      );
  }

  getEmotionFrames(entretienId: number): Observable<EmotionFrameDTO[]> {
    return this.http
      .get<WrappedResponse<EmotionFrameDTO[]>>(`${this.baseUrl}/${entretienId}/emotion-analysis/frames`)
      .pipe(
        map((res) => this.extractData<EmotionFrameDTO[]>(res)),
        catchError((err) => throwError(() => err))
      );
  }

  completeEmotionAnalysis(entretienId: number): Observable<EmotionAnalysisDTO> {
    return this.http
      .post<WrappedResponse<EmotionAnalysisDTO>>(
        `${this.baseUrl}/${entretienId}/emotion-analysis/complete`,
        {}
      )
      .pipe(
        map((res) => this.extractData<EmotionAnalysisDTO>(res)),
        catchError((err) => throwError(() => err))
      );
  }
}
