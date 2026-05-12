import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileUpdateService {
  private profilePictureUpdated = new Subject<string>();

  profilePictureUpdated$ = this.profilePictureUpdated.asObservable();

  notifyProfilePictureUpdate(newImageUrl: string): void {
    this.profilePictureUpdated.next(newImageUrl);
  }
}
