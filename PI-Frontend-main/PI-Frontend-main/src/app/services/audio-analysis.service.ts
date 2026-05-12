import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AudioAnalysisResult {
  pitch: number;
  volumeLevel: number;
  stress: number; // 0-100
  confidence: number; // 0-100
  speakingRate: number; // words per minute
  silenceDetected: boolean;
  silenceDuration: number; // seconds
}

@Injectable({
  providedIn: 'root'
})

export class AudioAnalysisService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamAudioSourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  private volumeThreshold = 0.02; // Silence threshold
  private silenceStart = 0;
  private totalSilence = 0;

  private pitchBuffer: number[] = [];
  private volumeBuffer: number[] = [];

  private audioReady$ = new BehaviorSubject<boolean>(false);

  // Map pour éviter de créer plusieurs MediaElementSourceNode pour le même élément
  private elementSourceNodeMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  constructor() {
    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API
   */
  private initializeAudioContext(): void {
    try {
      const audioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new audioContextClass();
      this.audioReady$.next(true);
    } catch (e) {
      console.error('Web Audio API is not supported in this browser.', e);
    }
  }

  /**
   * Initialize audio stream from video/media element
   */
  initializeAudioStream(mediaElement: HTMLMediaElement | MediaStream): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('AudioContext not initialized'));
        return;
      }

      try {
        // Déconnecte et supprime l'ancien MediaElementSourceNode si présent
        if (this.mediaStreamAudioSourceNode) {
          try {
            this.mediaStreamAudioSourceNode.disconnect();
          } catch {}
          this.mediaStreamAudioSourceNode = null;
        }

        let audioSource: AudioNode;

        if (mediaElement instanceof MediaStream) {
          console.log('[AudioAnalysisService] Initialisation avec MediaStream', mediaElement);
          audioSource = this.audioContext.createMediaStreamSource(mediaElement);
        } else {
          console.log('[AudioAnalysisService] Initialisation avec MediaElement', mediaElement);
          // Vérifie si un node existe déjà pour cet élément
          let existingNode = this.elementSourceNodeMap.get(mediaElement);
          if (!existingNode) {
            existingNode = this.audioContext.createMediaElementSource(mediaElement);
            this.elementSourceNodeMap.set(mediaElement, existingNode);
          }
          audioSource = existingNode;
        }

        this.mediaStreamAudioSourceNode = audioSource as any;

        // Create analyser
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 4096;

        audioSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start continuous audio analysis
   */
  startAnalysis(callback: (result: AudioAnalysisResult) => void): void {
    if (!this.analyser) {
      console.error('Analyser not initialized');
      return;
    }

    const analyzeFrame = () => {
      try {
        const result = this.analyzeAudioFrame();
        callback(result);
      } catch (error) {
        console.error('Error in audio analysis:', error);
      }

      this.animationFrameId = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();
  }

  /**
   * Stop audio analysis
   */
  stopAnalysis(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Analyze current audio frame
   */
  private analyzeAudioFrame(): AudioAnalysisResult {
    if (!this.analyser) {
      return this.getEmptyAnalysisResult();
    }

    // Get time domain data (actual audio waveform)
    const timeDomainData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeDomainData);

    // Get frequency data for pitch detection
    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate RMS (volume level) from time domain data
    const rms = this.calculateRMS(timeDomainData);
    this.volumeBuffer.push(rms);
    if (this.volumeBuffer.length > 200) {
      this.volumeBuffer.shift();
    }

    // Detect pitch from frequency data
    const pitch = this.detectPitch(frequencyData);
    this.pitchBuffer.push(pitch);
    if (this.pitchBuffer.length > 200) {
      this.pitchBuffer.shift();
    }

    // Analyze silence
    const silenceDetected = rms < this.volumeThreshold;
    if (silenceDetected) {
      if (this.silenceStart === 0) {
        this.silenceStart = Date.now();
      }
    } else {
      if (this.silenceStart > 0) {
        this.totalSilence += (Date.now() - this.silenceStart) / 1000;
        this.silenceStart = 0;
      }
    }

    // Calculate stress level (inverse of pitch stability + volume consistency)
    const stressLevel = this.calculateStressLevel();

    // Calculate confidence (based on consistent volume and pitch)
    const confidence = this.calculateConfidence();

    // Estimate speaking rate (simplified)
    const speakingRate = this.estimateSpeakingRate();

    return {
      pitch: pitch,
      volumeLevel: rms * 100,
      stress: stressLevel,
      confidence: confidence,
      speakingRate: speakingRate,
      silenceDetected: silenceDetected,
      silenceDuration: this.totalSilence
    };
  }

  /**
   * Calculate RMS (Root Mean Square) for volume
   */
  private calculateRMS(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Detect pitch using spectral analysis (improved)
   */
  private detectPitch(frequencyData: Uint8Array): number {
    // Find peaks in the frequency spectrum
    let maxValue = 0;
    let maxIndex = 0;

    // Start from index 5 to skip DC and very low frequencies
    for (let i = 5; i < Math.min(frequencyData.length, 500); i++) {
      // Look for local maxima (peaks)
      if (frequencyData[i] > maxValue && 
          frequencyData[i] > frequencyData[i - 1] && 
          frequencyData[i] > frequencyData[i + 1]) {
        maxValue = frequencyData[i];
        maxIndex = i;
      }
    }

    // If no significant peak found, return 0
    if (maxValue < 30) {
      return 0;
    }

    // Convert bin index to frequency
    const nyquistFrequency = (this.audioContext?.sampleRate || 44100) / 2;
    const frequency = (maxIndex / frequencyData.length) * nyquistFrequency;

    // Human voice typically 80-250Hz (men) to 160-300Hz (women)
    // Filter out unrealistic frequencies
    if (frequency < 50 || frequency > 400) {
      return 0;
    }

    return frequency;
  }

  /**
   * Calculate stress level based on voice characteristics
   * High stress = high pitch variation + inconsistent volume
   */
  private calculateStressLevel(): number {
    if (this.pitchBuffer.length < 5 || this.volumeBuffer.length < 5) {
      return 0;
    }

    // Only use recent samples for responsiveness
    const recentPitch = this.pitchBuffer.slice(-50);
    const recentVolume = this.volumeBuffer.slice(-50);

    // Calculate pitch variance (if pitch > 0, meaning voice is present)
    const activePitches = recentPitch.filter(p => p > 20); // Filter out non-voice
    if (activePitches.length < 3) return 0; // Not enough voice data

    const avgPitch = activePitches.reduce((a, b) => a + b) / activePitches.length;
    const pitchVariance = activePitches.reduce((sum, p) => sum + Math.pow(p - avgPitch, 2), 0) / activePitches.length;
    const pitchStdDev = Math.sqrt(pitchVariance);

    // Normalize pitch std dev (higher variation = more stress)
    // Average human pitch variation ~20Hz, stress increases variation
    const pitchStressScore = Math.min(100, (pitchStdDev / 30) * 100);

    // Calculate volume inconsistency
    const avgVolume = recentVolume.reduce((a, b) => a + b) / recentVolume.length;
    const volumeVariance = recentVolume.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / recentVolume.length;
    const volumeStdDev = Math.sqrt(volumeVariance);

    // Normalize volume std dev (higher variance = less stable = more stress)
    const volumeStressScore = Math.min(100, (volumeStdDev / avgVolume) * 50);

    // Combined stress (weighted average)
    return (pitchStressScore * 0.5 + volumeStressScore * 0.5);
  }

  /**
   * Calculate confidence based on voice consistency
   */
  private calculateConfidence(): number {
    if (this.volumeBuffer.length < 5) {
      return 0;
    }

    // Use recent samples only
    const recentVolume = this.volumeBuffer.slice(-50);
    const avgVolume = recentVolume.reduce((a, b) => a + b) / recentVolume.length;

    // If no voice detected, confidence is 0
    if (avgVolume < 0.01) {
      return 0;
    }

    // Calculate coefficient of variation (CV) for volume stability
    const volumeVariance = recentVolume.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / recentVolume.length;
    const volumeStdDev = Math.sqrt(volumeVariance);
    const coefficientOfVariation = (volumeStdDev / avgVolume) * 100;

    // Lower CV = more stable = higher confidence
    const stabilityScore = Math.max(0, 100 - coefficientOfVariation * 2);

    // Also check for consistent pitch when speaking
    const recentPitch = this.pitchBuffer.slice(-50).filter(p => p > 20);
    let pitchConsistencyScore = 50; // Default medium

    if (recentPitch.length >= 3) {
      const avgPitch = recentPitch.reduce((a, b) => a + b) / recentPitch.length;
      const pitchVariance = recentPitch.reduce((sum, p) => sum + Math.pow(p - avgPitch, 2), 0) / recentPitch.length;
      const pitchStdDev = Math.sqrt(pitchVariance);
      // Lower pitch variation = more confident speaker
      pitchConsistencyScore = Math.max(0, 100 - (pitchStdDev / 30) * 100);
    }

    // Combine stability and pitch consistency
    return (stabilityScore * 0.6 + pitchConsistencyScore * 0.4);
  }

  /**
   * Calculate average volume
   */
  private calculateVolumeMean(): number {
    if (this.volumeBuffer.length === 0) return 0;
    return this.volumeBuffer.reduce((a, b) => a + b) / this.volumeBuffer.length;
  }

  /**
   * Estimate speaking rate (simplified - based on volume changes)
   */
  private estimateSpeakingRate(): number {
    // Count syllable-like peaks (volume spikes that indicate speech)
    const peaks = this.countVolumePeaks();
    
    // More conservative estimate: ~1 syllable per peak, ~2-3 syllables per word
    // So speakingRate = peaks / 2.5 * 60 frames/sec / buffer size
    const speakingRate = Math.max(0, peaks * 8); // Calibrated for typical speech

    return Math.min(300, speakingRate);
  }

  /**
   * Count volume peaks in the buffer (represent syllables/speech units)
   */
  private countVolumePeaks(): number {
    if (this.volumeBuffer.length < 5) return 0;

    // Use recent data only for responsiveness
    const recentVolume = this.volumeBuffer.slice(-100);
    const avgVolume = recentVolume.reduce((a, b) => a + b) / recentVolume.length;
    const threshold = avgVolume * 1.2; // Peak must be 20% above average

    let peaks = 0;
    for (let i = 1; i < recentVolume.length - 1; i++) {
      if (
        recentVolume[i] > threshold &&
        recentVolume[i] > recentVolume[i - 1] &&
        recentVolume[i] > recentVolume[i + 1]
      ) {
        peaks++;
      }
    }
    return peaks;
  }

  /**
   * Get empty analysis result
   */
  private getEmptyAnalysisResult(): AudioAnalysisResult {
    return {
      pitch: 0,
      volumeLevel: 0,
      stress: 0,
      confidence: 0,
      speakingRate: 0,
      silenceDetected: false,
      silenceDuration: 0
    };
  }

  /**
   * Get audio readiness observable
   */
  getAudioReady(): Observable<boolean> {
    return this.audioReady$.asObservable();
  }

  /**
   * Reset analysis buffers
   */
  resetBuffers(): void {
    this.pitchBuffer = [];
    this.volumeBuffer = [];
    this.totalSilence = 0;
    this.silenceStart = 0;
  }

  /**
   * Release resources
   */
  release(): void {
    this.stopAnalysis();
    this.resetBuffers();

    if (this.mediaStreamAudioSourceNode) {
      this.mediaStreamAudioSourceNode.disconnect();
    }

    if (this.analyser) {
      this.analyser.disconnect();
    }
  }
}
