import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryDebugService {
  private cloudName = environment.cloudinary.cloudName;
  private uploadPreset = environment.cloudinary.uploadPreset;

  constructor(private http: HttpClient) {}

  /**
   * Get diagnostic information about Cloudinary setup
   */
  getDiagnostics(): any {
    return {
      cloudName: this.cloudName,
      uploadPreset: this.uploadPreset,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      timestamp: new Date()
    };
  }

  /**
   * Test Cloudinary upload with a simple blob
   */
  testUpload(): Observable<any> {
    console.log('Testing Cloudinary upload with diagnostics:', this.getDiagnostics());

    // Create a simple 1x1 transparent PNG for testing
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return new Observable(observer => {
      canvas.toBlob(blob => {
        if (!blob) {
          observer.error('Failed to create test image');
          return;
        }

        const file = new File([blob], 'test-image.png', { type: 'image/png' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', this.uploadPreset);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
        
        console.log('Sending test upload to:', uploadUrl);

        this.http.post(uploadUrl, formData).subscribe({
          next: response => {
            console.log('Test upload successful!', response);
            observer.next(response);
            observer.complete();
          },
          error: error => {
            console.error('Test upload failed!', error);
            observer.error(error);
          }
        });
      }, 'image/png');
    });
  }

  /**
   * Validate upload preset configuration
   */
  validateConfiguration(): { valid: boolean; message: string; details: any } {
    const diagnostics = this.getDiagnostics();
    
    if (!this.cloudName) {
      return {
        valid: false,
        message: 'Cloud name is not configured',
        details: diagnostics
      };
    }

    if (!this.uploadPreset) {
      return {
        valid: false,
        message: 'Upload preset is not configured',
        details: diagnostics
      };
    }

    if (this.uploadPreset === 'YOUR_UPLOAD_PRESET' || this.cloudName === 'YOUR_CLOUD_NAME') {
      return {
        valid: false,
        message: 'Cloudinary credentials appear to be placeholder values. Please update environment.ts with your actual Cloudinary credentials.',
        details: diagnostics
      };
    }

    return {
      valid: true,
      message: 'Configuration appears valid',
      details: diagnostics
    };
  }
}
