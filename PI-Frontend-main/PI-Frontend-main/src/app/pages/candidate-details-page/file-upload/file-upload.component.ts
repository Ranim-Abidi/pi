import { Component, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudinaryService } from '../../../services/cloudinary.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  providers: [CloudinaryService],
  template: `
    <div class="file-upload-container">
      <label for="file-input" class="upload-label">
        <span class="upload-icon">📁</span>
        <span>{{ label }}</span>
      </label>
      <input
        #fileInput
        type="file"
        id="file-input"
        [accept]="accept"
        (change)="onFileSelected($event)"
        (click)="$event.target.value = ''"
        class="file-input"
      />
      <div *ngIf="selectedFile" class="file-info">
        <p><strong>Selected:</strong> {{ selectedFile.name }}</p>
        <button (click)="uploadFile()" [disabled]="isUploading" class="upload-btn">
          {{ isUploading ? 'Uploading...' : 'Upload' }}
        </button>
        <button (click)="clearFile()" [disabled]="isUploading" class="cancel-btn">
          Cancel
        </button>
      </div>
      <div *ngIf="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <div *ngIf="uploadProgress > 0 && uploadProgress < 100" class="progress-bar">
        <div class="progress-fill" [style.width.%]="uploadProgress"></div>
      </div>
    </div>
  `,
  styles: [`
    .file-upload-container {
      margin: 15px 0;
    }

    .upload-label {
      display: inline-block;
      padding: 12px 20px;
      background-color: #667eea;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.3s;
    }

    .upload-label:hover {
      background-color: #5568d3;
    }

    .upload-icon {
      margin-right: 8px;
    }

    .file-input {
      display: none;
    }

    .file-info {
      margin-top: 15px;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .file-info p {
      margin: 0 0 10px 0;
      color: #333;
    }

    .upload-btn,
    .cancel-btn {
      padding: 8px 16px;
      margin-right: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: opacity 0.3s;
    }

    .upload-btn {
      background-color: #667eea;
      color: white;
    }

    .upload-btn:hover:not(:disabled) {
      opacity: 0.9;
    }

    .upload-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .cancel-btn {
      background-color: #999;
      color: white;
    }

    .cancel-btn:hover:not(:disabled) {
      opacity: 0.9;
    }

    .success-message {
      margin-top: 10px;
      padding: 10px;
      background-color: #d4edda;
      color: #155724;
      border-radius: 4px;
    }

    .error-message {
      margin-top: 10px;
      padding: 10px;
      background-color: #f8d7da;
      color: #721c24;
      border-radius: 4px;
    }

    .progress-bar {
      margin-top: 10px;
      width: 100%;
      height: 6px;
      background-color: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background-color: #667eea;
      transition: width 0.3s;
    }
  `]
})
export class FileUploadComponent {
  @Input() label = 'Upload File';
  @Input() accept = '.jpg,.jpeg,.png,.pdf'; // Accepts images and PDFs
  @Output() fileUploaded = new EventEmitter<any>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  successMessage = '';
  errorMessage = '';

  constructor(private cloudinaryService: CloudinaryService) {}

  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (this.selectedFile && this.selectedFile.size > maxSize) {
        this.errorMessage = 'File size must be less than 10MB';
        this.selectedFile = null;
        return;
      }
      
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file first';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.successMessage = '';

    this.cloudinaryService.uploadFile(this.selectedFile).subscribe({
      next: (response: any) => {
        this.uploadProgress = 100;
        this.isUploading = false;
        this.successMessage = `File uploaded successfully: ${response.public_id}`;
        
        // Emit the uploaded file data
        this.fileUploaded.emit({
          url: response.secure_url || response.url,
          publicId: response.public_id,
          fileName: this.selectedFile?.name,
          type: this.selectedFile?.type,
          resourceType: response.resource_type || (this.selectedFile?.type?.startsWith('image/') ? 'image' : 'raw')
        });

        // Clear after success
        setTimeout(() => {
          this.clearFile();
        }, 2000);
      },
      error: (error: any) => {
        this.isUploading = false;
        this.uploadProgress = 0;
        this.errorMessage = error.error?.error?.message || 'Upload failed. Please try again.';
        console.error('Upload error:', error);
      }
    });
  }

  clearFile(): void {
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.successMessage = '';
    this.errorMessage = '';
  }
}
