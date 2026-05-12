import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from '../../common/navbar/navbar.component';
import { SubscribeComponent } from '../../common/subscribe/subscribe.component';
import { FooterComponent } from '../../common/footer/footer.component';
import { NgxScrollTopComponent } from 'ngx-scrolltop';
import { JobsSidebarComponent } from '../../common/jobs-sidebar/jobs-sidebar.component';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';

@Component({
    selector: 'app-candidates-page',
    standalone: false,
    templateUrl: './candidates-page.component.html',
    styleUrls: ['./candidates-page.component.scss']
})
export class CandidatesPageComponent {

    title = 'Candidates - Jove';
    candidates: any[] = [];
    isLoading: boolean = true;
    errorMessage: string = '';
 
    constructor(
        private titleService: Title,
        private apiService: ApiService
    ) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
        this.loadCandidates();
    }

    loadCandidates() {
        this.isLoading = true;
        this.errorMessage = '';
        
        // Check if token exists
        const token = localStorage.getItem('token');
        console.log('🔑 Token exists:', !!token);
        if (token) {
            console.log('🔑 Token:', token.substring(0, 20) + '...');
        }
        
        this.apiService.getCandidats().subscribe({
            next: (data) => {
                console.log('✅ Candidates loaded successfully:', data);
                if (data && data.length > 0) {
                    console.log('📋 First candidate data:', data[0]);
                    console.log('📷 Available fields:', Object.keys(data[0]));
                    console.log('📷 profilePictureUrl:', data[0].profilePictureUrl);
                    console.log('📷 Photo (if exists):', data[0].photo);
                    // Log all image-related fields
                    Object.keys(data[0]).forEach(key => {
                        if (key.toLowerCase().includes('photo') || key.toLowerCase().includes('image') || key.toLowerCase().includes('picture')) {
                            console.log(`📸 Found image field "${key}":`, data[0][key]);
                        }
                    });
                }
                this.candidates = data;
                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error loading candidates:', error);
                console.error('Error status:', error.status);
                console.error('Error message:', error.message);
                console.error('Error details:', error.error);
                this.errorMessage = `Failed to load candidates: ${error.status} ${error.statusText || 'Unknown error'}`;
                this.isLoading = false;
            }
        });
    }

    getProfileImageUrl(candidate: any): string {
        // The API returns profile_picture_url (snake_case), not profilePictureUrl
        const imageUrl = candidate.profile_picture_url || candidate.profilePictureUrl;
        
        if (imageUrl && imageUrl.trim() !== '') {
            console.log('✅ Using profile_picture_url:', imageUrl);
            return imageUrl;
        }
        
        console.log('❌ No profile_picture_url found, using placeholder');
        return 'images/candidates/candidate1.jpg';
    }

    onImageError(event: any): void {
        event.target.src = 'images/candidates/candidate1.jpg';
    }

}

