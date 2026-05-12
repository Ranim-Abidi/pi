import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private cloudName = environment.cloudinary.cloudName;
  private uploadPreset = environment.cloudinary.uploadPreset;

  constructor(private http: HttpClient) {
    console.log('Cloudinary Service initialized with:', {
      cloudName: this.cloudName,
      uploadPreset: this.uploadPreset
    });
  }

  /**
   * Upload file (image or PDF) to Cloudinary
   * @param file - File to upload
   * @returns Observable with upload response
   */
  uploadFile(file: File): Observable<any> {
    const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    console.log('Uploading file:', file.name, 'to', uploadUrl, 'resourceType:', resourceType);

    return this.http.post(uploadUrl, formData).pipe(
      tap(response => {
        console.log('Upload successful:', response);
      }),
      catchError(error => {
        console.error('Upload error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Upload image to Cloudinary
   * @param file - Image file
   * @returns Observable with upload response
   */
  uploadImage(file: File): Observable<any> {
    return this.uploadFile(file);
  }

  /**
   * Upload PDF to Cloudinary
   * @param file - PDF file
   * @returns Observable with upload response
   */
  uploadPDF(file: File): Observable<any> {
    return this.uploadFile(file);
  }
}
