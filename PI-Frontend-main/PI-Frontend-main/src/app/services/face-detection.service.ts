
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
  faceDetected: boolean;
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    surprise: number;
    fear: number;
    neutral: number;
  };
  confidence: number;
  landmarks?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FaceDetectionService {

  private faceDetectionReady$ = new BehaviorSubject<boolean>(false);
  private emotionDetectionReady$ = new BehaviorSubject<boolean>(false);

  private detector: any;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationFrameId: number | null = null;
  private modelsLoaded = false;
  private modelsLoadingPromise: Promise<void> | null = null;


  constructor() {
    this.ensureFaceApiModelsLoaded()
      .then(() => {
        this.emotionDetectionReady$.next(true);
        console.log('Emotion detection library and models loaded');
      })
      .catch(error => {
        console.error('Error loading emotion detection library:', error);
      });
  }

  // Suppression de loadLibraries et du chargement dynamique de script, car face-api est importé via npm

  private ensureFaceApiModelsLoaded(): Promise<void> {
    if (this.modelsLoaded) {
      return Promise.resolve();
    }
    if (this.modelsLoadingPromise) {
      return this.modelsLoadingPromise;
    }
    this.modelsLoadingPromise = (async () => {
      if (!faceapi?.nets) {
        throw new Error('face-api not available');
      }
      // Public model host recommended by face-api examples.
      const modelUri = 'https://justadudewhohacks.github.io/face-api.js/models';
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUri);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelUri);
      await faceapi.nets.faceExpressionNet.loadFromUri(modelUri);
      this.modelsLoaded = true;
    })();
    return this.modelsLoadingPromise;
  }

  // Suppression de loadScript car inutile avec l'import npm

  /**
   * Attache les éléments déjà alimentés (webcam, fichier vidéo, etc.) sans ouvrir getUserMedia.
   */
  attachVideoElement(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): void {
    this.videoElement = videoElement;
    this.canvas = canvasElement;
  }

  /**
   * Initialize video stream and face detection
   */
  async initializeVideoStream(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    this.videoElement = videoElement;
    this.canvas = canvasElement;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });

      videoElement.srcObject = stream;

      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          resolve();
        };
      });
    } catch (error) {
      console.error('Error accessing webcam:', error);
      throw error;
    }
  }

  /**
   * Start continuous face and emotion detection
   */
  startDetection(callback: (result: FaceDetectionResult) => void): void {
    if (!this.videoElement) {
      console.error('Video element not initialized');
      return;
    }

    // Ensure models are loaded BEFORE starting the detection loop
    this.ensureFaceApiModelsLoaded().then(() => {
      const detectFrame = async () => {
        try {
          const predictions = await this.detectFacesAndEmotions();
          callback(predictions);
        } catch (error) {
          console.error('Error in face detection:', error);
        }

        this.animationFrameId = requestAnimationFrame(detectFrame);
      };

      detectFrame();
    }).catch(error => {
      console.error('Error loading models for face detection:', error);
    });
  }

  /**
   * Stop detection
   */
  stopDetection(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Detect faces and emotions
   */
  private async detectFacesAndEmotions(): Promise<FaceDetectionResult> {
    if (!this.videoElement) {
      return this.getEmptyResult();
    }

    try {
      // Using face-api.js for emotion detection
      // Models are guaranteed to be loaded before startDetection() starts the loop
      if (this.modelsLoaded) {
        const detections = await faceapi
          .detectAllFaces(this.videoElement)
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections.length > 0) {
          const detection = detections[0];
          const expressions = detection.expressions;

          // Convert face-api expressions to our format
          const emotions = {
            joy: (expressions.happy || 0) * 100,
            anger: (expressions.angry || 0) * 100,
            sadness: (expressions.sad || 0) * 100,
            surprise: (expressions.surprised || 0) * 100,
            fear: (expressions.fearful || 0) * 100,
            neutral: (expressions.neutral || 0) * 100
          };

          const confidence = detection.detection.score * 100;

          return {
            faceDetected: true,
            emotions: emotions,
            confidence: confidence,
            landmarks: detection.landmarks
          };
        }
      }

      return this.getEmptyResult();
    } catch (error) {
      console.error('Error in emotion detection:', error);
      return this.getEmptyResult();
    }
  }

  /**
   * Get empty result when no face is detected
   */
  private getEmptyResult(): FaceDetectionResult {
    return {
      faceDetected: false,
      emotions: {
        joy: 0,
        anger: 0,
        sadness: 0,
        surprise: 0,
        fear: 0,
        neutral: 0
      },
      confidence: 0
    };
  }

  /**
   * Take a screenshot of the current video frame
   */
  captureFrame(): string | null {
    if (!this.videoElement || !this.canvas) {
      return null;
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return null;

    this.canvas.width = this.videoElement.videoWidth;
    this.canvas.height = this.videoElement.videoHeight;

    ctx.drawImage(this.videoElement, 0, 0);
    return this.canvas.toDataURL('image/jpeg', 0.7);
  }

  /**
   * Observable for face detection readiness
   */
  getFaceDetectionReady(): Observable<boolean> {
    return this.faceDetectionReady$.asObservable();
  }

  /**
   * Observable for emotion detection readiness
   */
  getEmotionDetectionReady(): Observable<boolean> {
    return this.emotionDetectionReady$.asObservable();
  }

  /**
   * Release resources
   */
  release(): void {
    this.stopDetection();

    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = (this.videoElement.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }

    this.videoElement = null;
    this.canvas = null;
  }
}
