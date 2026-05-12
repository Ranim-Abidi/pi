# Cloudinary Setup Guide

## Step 1: Update Environment File

Edit `src/environments/environment.ts` and add your Cloudinary credentials:

```typescript
export const environment = {
  production: false,
  cloudinary: {
    cloudName: 'YOUR_CLOUD_NAME',      // Your Cloudinary cloud name
    uploadPreset: 'YOUR_UPLOAD_PRESET'  // Your upload preset
  }
};
```

## Step 2: Generate Upload Preset in Cloudinary

1. Go to your Cloudinary Dashboard
2. Navigate to **Settings** > **Upload**
3. Scroll to **Upload presets** section
4. Click **Create new upload preset**
5. Fill in:
   - **Name**: `upload` (or any name)
   - **Signing Mode**: Unsigned (for frontend uploads)
6. Click **Create**
7. Copy the preset name and paste it in `environment.ts`

## Step 3: Find Your Cloud Name

1. Go to Cloudinary Dashboard
2. Look for **Cloud name** at the top of the page (or in Account settings)
3. Copy it and paste in `environment.ts`

## Step 4: Make Sure HttpClient is Imported

In your `app.ts` or main.ts, ensure HttpClient is provided:

```typescript
import { HttpClientModule } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    HttpClientModule,
    // ... other providers
  ],
};
```

OR in your component:

```typescript
import { HttpClient } from '@angular/common/http';

// In imports array of standalone component
imports: [HttpClientModule, ...]
```

## Step 5: Add File Upload to Candidate Details Page

In `candidate-details-page.component.ts`, add this to your imports:

```typescript
import { FileUploadComponent } from './file-upload/file-upload.component';
```

Add to your component imports array:

```typescript
imports: [
  CommonModule,
  FormsModule,
  FileUploadComponent, // Add this
  // ... other imports
]
```

## Step 6: Use in Template

Add this to your `candidate-details-page.component.html`:

```html
<!-- Profile Picture Upload -->
<div class="form-group">
  <label>Profile Picture</label>
  <app-file-upload 
    label="Upload Profile Picture (JPG, PNG)"
    accept=".jpg,.jpeg,.png"
    (fileUploaded)="onProfilePictureUploaded($event)">
  </app-file-upload>
  <img *ngIf="profilePictureUrl" [src]="profilePictureUrl" style="max-width: 200px; margin-top: 10px;">
</div>

<!-- CV Upload -->
<div class="form-group">
  <label>Upload CV (PDF)</label>
  <app-file-upload 
    label="Upload CV (PDF)"
    accept=".pdf"
    (fileUploaded)="onCVUploaded($event)">
  </app-file-upload>
  <p *ngIf="cvUrl"><a [href]="cvUrl" target="_blank">📄 View CV</a></p>
</div>
```

## Step 7: Handle Upload Events in Component

Add these properties and methods to `candidate-details-page.component.ts`:

```typescript
profilePictureUrl: string = '';
cvUrl: string = '';

onProfilePictureUploaded(event: any): void {
  this.profilePictureUrl = event.url;
  // Save to database
  this.saveProfilePictureUrl(event.url);
}

onCVUploaded(event: any): void {
  this.cvUrl = event.url;
  // Save to database
  this.saveCVUrl(event.url);
}

saveProfilePictureUrl(url: string): void {
  // Make API call to save URL
  this.apiService.updateCandidate({
    profile_picture_url: url
  }).subscribe(
    () => console.log('Profile picture saved'),
    (error) => console.error('Error saving profile picture', error)
  );
}

saveCVUrl(url: string): void {
  // Make API call to save URL
  this.apiService.updateCandidate({
    cv_url: url
  }).subscribe(
    () => console.log('CV saved'),
    (error) => console.error('Error saving CV', error)
  );
}
```

## Troubleshooting

**Issue: "CORS error"**
- This is normal for client-side uploads. Cloudinary handles it automatically.

**Issue: "Upload fails"**
- Check your upload preset is set to "Unsigned"
- Verify cloud name and preset are correct in environment.ts

**Issue: "File not uploading"**
- Check browser console for errors
- Ensure file size is less than 10MB
- Try a different browser

## Security Notes

✅ DO:
- Keep credentials in environment files
- Add to `.gitignore`
- Use unsigned upload presets (safer for frontend)

❌ DON'T:
- Share API keys in code
- Commit environment.ts with real credentials
- Use Master key in frontend code
