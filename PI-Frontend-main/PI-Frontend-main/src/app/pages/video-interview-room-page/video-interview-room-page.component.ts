import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../api.service';
import { SharedModule } from '../../shared/shared.module';
import { EmotionDetectorComponent } from '../../shared/emotion-detector/emotion-detector.component';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

@Component({
  selector: 'app-video-interview-room-page',
  standalone: true,
  imports: [CommonModule, SharedModule, EmotionDetectorComponent],
  templateUrl: './video-interview-room-page.component.html',
  styleUrls: ['./video-interview-room-page.component.scss']
})
export class VideoInterviewRoomPageComponent implements OnInit, OnDestroy {
  @ViewChild('jitsiContainer', { static: false }) jitsiContainer?: ElementRef<HTMLDivElement>;

  entretienId = 0;
  entretienTitle = 'Entretien video';
  loading = true;
  errorMessage = '';
  meetingLink = '';

  emotionAnalysisEnabled = true;

  /** Flux getUserMedia pour l’analyse (démarré après connexion à la réunion Jitsi) */
  conferenceAnalysisStream: MediaStream | null = null;
  analysisMediaError = '';

  private jitsiApi: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id) || id <= 0) {
      this.errorMessage = 'ID entretien invalide.';
      this.loading = false;
      return;
    }

    this.entretienId = id;
    this.loadEntretien();
  }

  ngOnDestroy(): void {
    this.releaseConferenceAnalysisStream();
    if (this.jitsiApi && typeof this.jitsiApi.dispose === 'function') {
      this.jitsiApi.dispose();
    }
  }

  private async acquireConferenceAnalysisStream(): Promise<void> {
    if (this.conferenceAnalysisStream) {
      return;
    }
    this.analysisMediaError = '';
    try {
      this.conferenceAnalysisStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });
    } catch {
      this.analysisMediaError =
        'Impossible d’accéder à la caméra ou au micro pour l’analyse en direct. Vérifiez les permissions du navigateur.';
    }
  }

  private releaseConferenceAnalysisStream(): void {
    if (this.conferenceAnalysisStream) {
      this.conferenceAnalysisStream.getTracks().forEach((t) => t.stop());
      this.conferenceAnalysisStream = null;
    }
    this.analysisMediaError = '';
  }

  private loadEntretien(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.getEntretien(this.entretienId).subscribe({
      next: (entretien: any) => {
        const mode = String(entretien?.mode || entretien?.modeEntretien || '').toUpperCase();
        this.entretienTitle = String(entretien?.titre || 'Entretien video');
        this.meetingLink = String(
          entretien?.meetingLink || entretien?.videoUrl || entretien?.joinUrl || entretien?.lienEntretien || ''
        ).trim();

        if (mode !== 'VIDEO') {
          this.errorMessage = 'Cet entretien n est pas en mode video.';
          this.loading = false;
          return;
        }

        if (!this.meetingLink) {
          this.errorMessage = 'Le lien de reunion video est manquant. Contactez le recruteur.';
          this.loading = false;
          return;
        }

        const roomName = this.extractJitsiRoomName(this.meetingLink);
        if (!roomName) {
          this.errorMessage = 'Lien video invalide. Utilisez un lien Jitsi (meet.jit.si).';
          this.loading = false;
          return;
        }

        this.ensureJitsiScriptLoaded()
          .then(() => {
            this.loading = false;
            // Wait one tick so Angular can render the Jitsi container before mounting.
            setTimeout(() => this.initJitsi(roomName), 0);
          })
          .catch(() => {
            this.errorMessage = 'Impossible de charger la salle video pour le moment.';
            this.loading = false;
          });
      },
      error: () => {
        this.errorMessage = 'Impossible de charger cet entretien video.';
        this.loading = false;
      }
    });
  }

  private ensureJitsiScriptLoaded(): Promise<void> {
    if (window.JitsiMeetExternalAPI) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-jitsi="external-api"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-jitsi', 'external-api');
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }

  private initJitsi(roomName: string, attempt = 0): void {
    if (!this.jitsiContainer?.nativeElement || !window.JitsiMeetExternalAPI) {
      if (attempt < 20) {
        setTimeout(() => this.initJitsi(roomName, attempt + 1), 100);
        return;
      }
      this.errorMessage = 'Conteneur video indisponible.';
      return;
    }

    const token = localStorage.getItem('token');
    let displayName = 'Candidat';

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        displayName = payload?.name || payload?.nom || payload?.sub || displayName;
      } catch {
        // ignore malformed token
      }
    }

    this.jitsiApi = new window.JitsiMeetExternalAPI('meet.jit.si', {
      roomName,
      parentNode: this.jitsiContainer.nativeElement,
      width: '100%',
      height: '100%',
      userInfo: {
        displayName
      },
      configOverwrite: {
        prejoinPageEnabled: true,
        startWithAudioMuted: true
      },
      interfaceConfigOverwrite: {
        MOBILE_APP_PROMO: false,
        SHOW_JITSI_WATERMARK: false
      }
    });

    this.jitsiApi.on('videoConferenceJoined', () => {
      this.ngZone.run(() => void this.acquireConferenceAnalysisStream());
    });
    this.jitsiApi.on('readyToClose', () => {
      this.ngZone.run(() => this.releaseConferenceAnalysisStream());
    });
  }

  private extractJitsiRoomName(link: string): string | null {
    try {
      const url = new URL(link);
      const host = url.hostname.toLowerCase();
      if (host !== 'meet.jit.si' && host !== 'www.meet.jit.si') {
        return null;
      }
      const room = url.pathname.replace(/^\/+/, '').trim();
      return room || null;
    } catch {
      return null;
    }
  }

  openExternalMeeting(): void {
    if (!this.meetingLink) {
      return;
    }
    window.open(this.meetingLink, '_blank', 'noopener,noreferrer');
  }

  goBack(): void {
    this.router.navigate(['/candidate-entretiens']);
  }
}
