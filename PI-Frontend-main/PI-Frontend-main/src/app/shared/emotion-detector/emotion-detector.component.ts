import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FaceDetectionService, FaceDetectionResult } from '../../services/face-detection.service';
import { AudioAnalysisService, AudioAnalysisResult } from '../../services/audio-analysis.service';
import {
  EmotionAnalysisDTO,
  EmotionAnalysisService,
  ProcessEmotionFrameRequest
} from '../../services/emotion-analysis.service';

/**
 * Analyse en direct à partir d’un MediaStream (caméra + micro).
 * Le flux doit être fourni par le parent (ex. page Jitsi après connexion à la réunion).
 */
@Component({
  selector: 'app-emotion-detector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emotion-detector.component.html',
  styleUrls: ['./emotion-detector.component.scss']
})
export class EmotionDetectorComponent implements AfterViewInit, OnDestroy {
  @Input() entretienId = 0;
  /** Flux navigateur (vidéo + audio) — même appareils physiques que la visioconférence */
  @Input({ required: true }) mediaStream!: MediaStream;

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  isAnalyzing = false;
  isInitializing = false;

  framesProcessed = 0;
  faceDetected = false;

  currentEmotions: FaceDetectionResult['emotions'] | null = null;
  currentVoice: AudioAnalysisResult | null = null;

  lastFace: FaceDetectionResult | null = null;
  lastAudio: AudioAnalysisResult | null = null;

  serverAnalysis: EmotionAnalysisDTO | null = null;

  backendState: 'off' | 'starting' | 'live' | 'error' = 'off';
  backendErrorMessage = '';
  private sessionStarted = false;
  private uploadTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private uploadFrameNumber = 0;

  private readonly uploadIntervalMs = 1600;
  private readonly pollIntervalMs = 3000;

  private analysisStarted = false;

  constructor(
    private faceDetectionService: FaceDetectionService,
    private audioAnalysisService: AudioAnalysisService,
    private emotionAnalysisService: EmotionAnalysisService
  ) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.initializeAnalysis(), 0);
  }

  ngOnDestroy(): void {
    this.clearTimers();
    if (this.entretienId > 0 && this.sessionStarted) {
      this.emotionAnalysisService.completeEmotionAnalysis(this.entretienId).subscribe({
        next: (data) => {
          this.serverAnalysis = data;
        },
        error: () => {}
      });
    }
    this.stopAnalysis();
  }

  private clearTimers(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async initializeAnalysis(): Promise<void> {
    if (this.analysisStarted) {
      return;
    }
    if (!this.mediaStream || !this.videoElement || !this.canvasElement) {
      this.backendErrorMessage = 'Flux caméra/micro indisponible.';
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    this.isInitializing = true;
    this.backendErrorMessage = '';
    this.analysisStarted = true;

    try {
      video.srcObject = this.mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      this.faceDetectionService.attachVideoElement(video, canvas);
      await this.audioAnalysisService.initializeAudioStream(this.mediaStream);

      this.faceDetectionService.startDetection((result: FaceDetectionResult) => {
        this.lastFace = result;
        this.faceDetected = result.faceDetected;
        this.currentEmotions = result.emotions;
        if (result.faceDetected) {
          this.framesProcessed += 1;
        }
      });

      this.audioAnalysisService.startAnalysis((result: AudioAnalysisResult) => {
        this.lastAudio = result;
        this.currentVoice = result;
      });

      this.isAnalyzing = true;
      this.isInitializing = false;

      if (this.entretienId > 0) {
        this.startBackendSession();
      } else {
        this.backendState = 'off';
      }
    } catch (error) {
      console.error(error);
      this.isInitializing = false;
      this.isAnalyzing = false;
      this.backendState = 'error';
      this.backendErrorMessage = 'Impossible de lire le flux caméra/micro.';
      this.analysisStarted = false;
    }
  }

  private startBackendSession(): void {
    this.backendState = 'starting';
    this.emotionAnalysisService.startEmotionAnalysis(this.entretienId).subscribe({
      next: (data) => {
        this.serverAnalysis = data;
        this.sessionStarted = true;
        this.backendState = 'live';
        this.scheduleBackendSync();
        this.refreshServerAggregates();
      },
      error: (err) => {
        this.backendState = 'error';
        this.sessionStarted = false;
        this.backendErrorMessage =
          err?.error?.message || err?.message || 'Connexion à l’API émotion (start) impossible.';
      }
    });
  }

  private scheduleBackendSync(): void {
    this.clearTimers();
    this.uploadTimer = setInterval(() => this.pushFrameToBackend(), this.uploadIntervalMs);
    this.pollTimer = setInterval(() => this.refreshServerAggregates(), this.pollIntervalMs);
  }

  private pushFrameToBackend(): void {
    if (!this.entretienId || !this.sessionStarted || this.backendState !== 'live') {
      return;
    }
    const face = this.lastFace;
    const audio = this.lastAudio;
    const v = this.videoElement?.nativeElement;
    this.uploadFrameNumber += 1;

    const req: ProcessEmotionFrameRequest = {
      frameNumber: this.uploadFrameNumber,
      timestampSeconds: v?.currentTime ?? 0,
      joy: face?.emotions.joy ?? 0,
      anger: face?.emotions.anger ?? 0,
      sadness: face?.emotions.sadness ?? 0,
      surprise: face?.emotions.surprise ?? 0,
      fear: face?.emotions.fear ?? 0,
      neutral: face?.emotions.neutral ?? 0,
      faceDetected: face?.faceDetected ?? false,
      voiceStress: audio?.stress,
      voiceConfidence: audio?.confidence,
      pitch: audio?.pitch,
      volumeLevel: audio?.volumeLevel
    };

    this.emotionAnalysisService.processEmotionFrame(this.entretienId, req).subscribe({
      error: (err) => {
        this.backendErrorMessage = err?.error?.message || err?.message || 'Envoi frame refusé par le serveur.';
      }
    });
  }

  private refreshServerAggregates(): void {
    if (!this.entretienId || !this.sessionStarted) {
      return;
    }
    this.emotionAnalysisService.getEmotionAnalysis(this.entretienId).subscribe({
      next: (data) => {
        this.serverAnalysis = data;
      },
      error: () => {}
    });
  }

  public stopAnalysis(): void {
    this.clearTimers();
    this.faceDetectionService.stopDetection();
    this.audioAnalysisService.stopAnalysis();
    this.isAnalyzing = false;
  }

  emotionLabel(key: string): string {
    const map: Record<string, string> = {
      joy: 'Joie',
      anger: 'Colère',
      sadness: 'Tristesse',
      surprise: 'Surprise',
      fear: 'Peur',
      neutral: 'Neutre',
      happy: 'Joie',
      neutral_emotion: 'Neutre'
    };
    return map[key] || key;
  }

  serverDominantLabel(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const v = value.toLowerCase();
    const map: Record<string, string> = {
      joy: 'Joie',
      anger: 'Colère',
      sadness: 'Tristesse',
      surprise: 'Surprise',
      fear: 'Peur',
      neutral: 'Neutre'
    };
    return map[v] || value;
  }

  trackClass(key: string): string {
    return 'fill-' + key;
  }
}
