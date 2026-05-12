import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { jwtDecode } from 'jwt-decode';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { CloudinaryService } from '../../services/cloudinary.service';
import { CloudinaryDebugService } from '../../services/cloudinary-debug.service';
import { SharedModule } from '../../shared/shared.module';
import { GoogleMapsModule } from '@angular/google-maps';

@Component({
    selector: 'app-candidate-details-page',
    standalone: true,
    imports: [SharedModule, FormsModule, CommonModule, RouterLink, FileUploadComponent, GoogleMapsModule],
    templateUrl: './candidate-details-page.component.html',
    styleUrls: ['./candidate-details-page.component.scss']
})
export class CandidateDetailsPageComponent implements OnInit {

    title = 'Candidate Details - Jove';
    
    // Current user info
    currentUserName = '';
    userEmail = '';
    userRole = '';
    isEditingAbout = false;
    isEditingEducation = false;
    isEditingBackground = false;
    isEditingPassion = false;
    
    // Contact information
    contactData: any = {
        prenom: ''
    };
    
    // Candidate form data
    candidateData: any = {
        id: null,
        cv: '',
        description: '',
        lien_portfolio: '',
        niveau_etude: '',
        competences: [],
        telephone: '',
        email: ''
    };

    // Education data
    educationList: any[] = [
        { niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' }
    ];

    // Background and expertise data
    backgroundList: any[] = [
        { titre: '', company: '', startDate: '', endDate: '' }
    ];

    // Passion and future goals
    passionAndGoals = '';

    // Localisation form data
    localisationData: any = {
        latitude: '',
        longitude: '',
        pays: '',
        ville: ''
    };

    // File upload data
    profilePictureUrl = '';
    cvUrl = '';

    // Google Maps properties
    mapZoom = 10;
    mapCenter: google.maps.LatLngLiteral = { lat: 36.8065, lng: 10.1615 }; // Default center (Tunis)
    markerPosition: google.maps.LatLngLiteral | null = null;

    isLoading = false;
    isSaving = false;
    successMessage = '';
    errorMessage = '';
    geocodeTimer: any; // Timer for debouncing geocode calls
    isUploadingProfilePicture = false;
    cloudinaryConfigValid = false;
    cloudinaryConfigMessage = '';
    isEducationFormSubmitted = false;
    isBackgroundFormSubmitted = false;
    isContactFormSubmitted = false;
    isDescriptionFormSubmitted = false;
    isPassionFormSubmitted = false;
    isDescriptionSaved = false;
    isContactInfoSaved = false;
    isPassionSaved = false;
    isEditingCompetences = false;
    newCompetence = '';
    
    // For viewing other candidates' profiles
    viewingCandidateId: number | null = null;
    isViewingOtherCandidate: boolean = false;
 
    constructor(
        private titleService: Title,
        private apiService: ApiService,
        private cloudinaryService: CloudinaryService,
        private cloudinaryDebugService: CloudinaryDebugService,
        private http: HttpClient,
        private activatedRoute: ActivatedRoute
    ) {}
    
    ngOnInit() {
        this.titleService.setTitle(this.title);
        
        // Validate Cloudinary configuration
        const configValidation = this.cloudinaryDebugService.validateConfiguration();
        this.cloudinaryConfigValid = configValidation.valid;
        this.cloudinaryConfigMessage = configValidation.message;
        if (!configValidation.valid) {
            console.warn('Cloudinary Configuration Warning:', configValidation);
        } else {
            console.log('Cloudinary Configuration Valid:', configValidation.details);
        }
        
        // Get current user info from localStorage
        const userName = localStorage.getItem('userName');
        this.currentUserName = userName || 'Candidat';
        this.userEmail = this.resolveCurrentUserEmail();
        this.userRole = localStorage.getItem('userRole') || 'CANDIDAT';
        
        // Check if viewing another candidate's profile
        this.activatedRoute.params.subscribe(params => {
            if (params['id']) {
                this.viewingCandidateId = params['id'];
                this.isViewingOtherCandidate = true;
                console.log('👤 Viewing candidate with ID:', this.viewingCandidateId);
                this.loadOtherCandidateData(this.viewingCandidateId!);
            } else {
                // Load current user's data
                this.isViewingOtherCandidate = false;
                this.loadCandidateData();
            }
        });
    }

    loadCandidateData() {
        this.isLoading = true;
        const userName = localStorage.getItem('userName');
        const userEmail = this.resolveCurrentUserEmail();
        
        // If no usable email, stop loading
        if (!userEmail) {
            this.errorMessage = 'Email utilisateur introuvable. Reconnectez-vous puis réessayez.';
            this.isLoading = false;
            return;
        }
        
        // Try to load candidate data from API
        this.apiService.getCandidateByEmail(userEmail).subscribe(
            (data: any) => {
                if (data) {
                    // Merge response data with form
                    this.candidateData = {
                        ...this.candidateData,
                        ...data
                    };
                    
                    // Explicitly ensure critical fields are set from response
                    if (data.id) {
                        this.candidateData.id = data.id;
                    }
                    if (data.email) {
                        this.candidateData.email = data.email;
                    }
                    // IMPORTANT: Explicitly set description from API response
                    if (data.description) {
                        this.candidateData.description = data.description;
                        this.isDescriptionSaved = true;
                    }
                    
                    // Load profile picture URL from database
                    if (data.profile_picture_url) {
                        this.profilePictureUrl = data.profile_picture_url;
                    }
                    
                    // Load CV URL from database
                    if (data.cv_url) {
                        this.cvUrl = data.cv_url;
                    }
                    
                    console.log('Loaded candidate ID:', this.candidateData.id, 'Full data:', data);
                    
                    // Update current username with actual nom from database
                    if (data.nom) {
                        this.currentUserName = data.nom;
                    }
                    
                    // Load contact data (prenom and telephone)
                    if (data.prenom) {
                        this.contactData.prenom = data.prenom;
                    }
                    if (data.telephone) {
                        this.candidateData.telephone = data.telephone;
                    }
                    if (data.prenom || data.telephone) {
                        this.isContactInfoSaved = true;
                    }
                    
                    // Parse education data from concatenated string
                    // Parse education data from concatenated string with labels
                    if (data.niveauEtude && data.niveauEtude.includes('niveau:')) {
                        // Split by " ;; " to get individual education entries
                        const educationEntries = data.niveauEtude.split(' ;; ');
                        this.educationList = educationEntries.map((edu: string) => {
                            // Extract values using regex for labeled format
                            const niveauMatch = edu.match(/niveau:\s*([^,]*)/);
                            const domaineMatch = edu.match(/domaine:\s*([^,]*)/);
                            const institutionMatch = edu.match(/institution:\s*([^,]*)/);
                            const debutMatch = edu.match(/debut:\s*([^,]*)/);
                            const finMatch = edu.match(/fin:\s*([^,;]*)/);
                            
                            return {
                                niveauEtude: (niveauMatch?.[1] || '').trim(),
                                domain: (domaineMatch?.[1] || '').trim(),
                                institution: (institutionMatch?.[1] || '').trim(),
                                startDate: (debutMatch?.[1] || '').trim(),
                                endDate: (finMatch?.[1] || '').trim()
                            };
                        });
                    } else if (data.niveauEtude && data.niveauEtude.includes(' / ')) {
                        // OLD FORMAT: Split by " / " for backward compatibility with old data
                        const educationEntries = data.niveauEtude.split(' ;; ');
                        this.educationList = educationEntries.map((edu: string) => {
                            const parts = edu.split(' / ');
                            return {
                                niveauEtude: (parts[0] || '').trim(),
                                domain: (parts[1] || '').trim(),
                                institution: (parts[2] || '').trim(),
                                startDate: (parts[3] || '').trim().split('-')[0],
                                endDate: (parts[3] || '').trim().split('-')[1]
                            };
                        });
                    } else if (data.niveauEtude) {
                        // Single education entry without separators
                        this.educationList = [{ 
                            niveauEtude: data.niveauEtude, 
                            domain: '', 
                            institution: '', 
                            startDate: '', 
                            endDate: '' 
                        }];
                    } else {
                        this.educationList = [{ niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' }];
                    }

                    // Parse background data from concatenated string
                    if (data.backgroundExpertise && data.backgroundExpertise.includes('titre:')) {
                        // New labeled format
                        const backgroundEntries = data.backgroundExpertise.split(' ;; ');
                        this.backgroundList = backgroundEntries.map((bg: string) => {
                            const titreMatch = bg.match(/titre:\s*([^,]*)/);
                            const entrepriseMatch = bg.match(/entreprise:\s*([^,]*)/);
                            const debutMatch = bg.match(/debut:\s*([^,]*)/);
                            const finMatch = bg.match(/fin:\s*(.*)$/);
                            
                            return {
                                titre: (titreMatch?.[1] || '').trim(),
                                company: (entrepriseMatch?.[1] || '').trim(),
                                startDate: (debutMatch?.[1] || '').trim(),
                                endDate: (finMatch?.[1] || '').trim()
                            };
                        });
                    } else if (data.backgroundExpertise && data.backgroundExpertise.includes(' / ')) {
                        // Old format - backward compatibility
                        const backgroundEntries = data.backgroundExpertise.split(' ;; ');
                        this.backgroundList = backgroundEntries.map((bg: string) => {
                            const parts = bg.split(' / ');
                            return {
                                titre: (parts[0] || '').trim(),
                                company: (parts[1] || '').trim(),
                                startDate: (parts[2] || '').trim().split('-')[0],
                                endDate: (parts[2] || '').trim().split('-')[1]
                            };
                        });
                    } else if (data.backgroundExpertise) {
                        // Single background entry
                        this.backgroundList = [{ 
                            titre: data.backgroundExpertise, 
                            company: '', 
                            startDate: '', 
                            endDate: '' 
                        }];
                    } else {
                        this.backgroundList = [{ titre: '', company: '', startDate: '', endDate: '' }];
                    }

                    // Load passion and goals
                    if (data.passionAndGoals) {
                        this.passionAndGoals = data.passionAndGoals;
                        this.isPassionSaved = true;
                    }
                    
                    // Load localisation data if available
                    if (data.localisation_id) {
                        this.apiService.getLocalisation(data.localisation_id).subscribe({
                            next: (locData: any) => {
                                this.localisationData = locData;
                                
                                // Update map center if coordinates are available
                                if (locData.latitude && locData.longitude) {
                                    this.mapCenter = { lat: locData.latitude, lng: locData.longitude };
                                    this.markerPosition = { lat: locData.latitude, lng: locData.longitude };
                                }
                                
                                this.isLoading = false;
                            },
                            error: () => {
                                this.isLoading = false;
                            }
                        });
                    } else {
                        this.isLoading = false;
                    }
                }
            },
            (err) => {
                // If 404, candidate doesn't exist - create an empty one first
                if (err.status === 404) {
                    this.successMessage = 'Profil candidat non trouvé. Création d\'un nouveau profil...';
                    this.candidateData.email = userEmail; // Set email for new candidate
                    
                    // Create a minimal candidate profile with just email and name
                    const minimalCandidate = {
                        email: userEmail,
                        nom: this.currentUserName || userName || userEmail.split('@')[0],
                        prenom: '',
                        description: '',
                        telephone: '',
                        cv: '',
                        lienPortfolio: '',
                        niveauEtude: '',
                        competences: []
                    };
                    
                    this.apiService.createCandidate(minimalCandidate).subscribe({
                        next: (response: any) => {
                            // Now we have an ID to work with
                            if (response.id) {
                                this.candidateData.id = response.id;
                                this.candidateData.email = response.email;
                                console.log('Created new candidate with ID:', this.candidateData.id);
                                
                                // Merge the full response into candidateData
                                this.candidateData = {
                                    ...this.candidateData,
                                    ...response
                                };
                                
                                this.successMessage = 'Profil candidat créé. Vous pouvez maintenant éditer vos informations.';
                                this.isLoading = false;
                                setTimeout(() => this.successMessage = '', 4000);
                            }
                        },
                        error: (createErr) => {
                            console.error('Error creating candidate:', createErr);
                            console.error('Error status:', createErr.status);
                            console.error('Error message:', createErr.message);
                            console.error('Error error:', createErr.error);
                            let errorMsg = 'Erreur lors de la création du profil candidat';
                            if (createErr.status === 0) {
                                errorMsg = 'Impossible de se connecter au serveur. Vérifiez la configuration de l\'API (environment.apiUrl) et que le backend est joignable.';
                            } else if (createErr.error?.message) {
                                errorMsg = createErr.error.message;
                            }
                            this.errorMessage = errorMsg;
                            this.isLoading = false;
                        }
                    });
                } else {
                    this.errorMessage = 'Erreur lors du chargement du profil candidat.';
                    this.isLoading = false;
                    console.error('Error loading candidate data:', err);
                }
            }
        );
    }

    private resolveCurrentUserEmail(): string {
        const candidateEmail = String(this.candidateData?.email || '').trim();
        if (candidateEmail.includes('@')) {
            return candidateEmail;
        }

        const storedEmail = String(localStorage.getItem('userEmail') || '').trim();
        if (storedEmail.includes('@')) {
            return storedEmail;
        }

        const userName = String(localStorage.getItem('userName') || '').trim();
        if (userName.includes('@')) {
            return userName;
        }

        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded: any = jwtDecode(token);
                const tokenEmail = String(decoded?.email || decoded?.sub || '').trim();
                if (tokenEmail.includes('@')) {
                    return tokenEmail;
                }
            }
        } catch {
            // Ignore decode errors and fallback to empty email
        }

        return '';
    }

    private ensureCandidateId(onReady: () => void): void {
        if (this.candidateData?.id) {
            onReady();
            return;
        }

        const userEmail = this.resolveCurrentUserEmail();
        if (!userEmail) {
            this.errorMessage = 'Impossible de sauvegarder: email utilisateur introuvable. Reconnectez-vous.';
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';

        this.apiService.getCandidateByEmail(userEmail).subscribe({
            next: (data: any) => {
                if (data?.id) {
                    this.candidateData = { ...this.candidateData, ...data, id: data.id, email: data.email || userEmail };
                    this.isSaving = false;
                    onReady();
                    return;
                }

                this.isSaving = false;
                this.errorMessage = 'Profil trouvé mais ID invalide. Rechargez la page.';
            },
            error: (err) => {
                if (err?.status !== 404) {
                    this.isSaving = false;
                    this.errorMessage = 'Erreur lors de la récupération du profil candidat.';
                    return;
                }

                const minimalCandidate = {
                    email: userEmail,
                    nom: this.currentUserName || userEmail.split('@')[0],
                    prenom: '',
                    description: this.candidateData.description || '',
                    telephone: this.candidateData.telephone || '',
                    cv: '',
                    lienPortfolio: '',
                    niveauEtude: '',
                    competences: []
                };

                this.apiService.createCandidate(minimalCandidate).subscribe({
                    next: (created: any) => {
                        if (created?.id) {
                            this.candidateData = { ...this.candidateData, ...created, id: created.id, email: created.email || userEmail };
                            this.isSaving = false;
                            onReady();
                            return;
                        }

                        this.isSaving = false;
                        this.errorMessage = 'Création du profil échouée: ID manquant dans la réponse.';
                    },
                    error: () => {
                        this.isSaving = false;
                        this.errorMessage = 'Erreur lors de la création automatique du profil candidat.';
                    }
                });
            }
        });
    }

    loadOtherCandidateData(candidateId: number) {
        if (!candidateId) {
            this.errorMessage = 'Candidate ID is required';
            this.isLoading = false;
            return;
        }

        this.isLoading = true;
        console.log('Loading other candidate data for ID:', candidateId);

        // Load candidate data by ID from API
        this.apiService.getCandidat(candidateId).subscribe(
            (data: any) => {
                if (data) {
                    // Merge response data with form
                    this.candidateData = {
                        ...this.candidateData,
                        ...data
                    };
                    
                    // Explicitly ensure critical fields are set from response
                    if (data.id) {
                        this.candidateData.id = data.id;
                    }
                    if (data.email) {
                        this.candidateData.email = data.email;
                    }
                    if (data.description) {
                        this.candidateData.description = data.description;
                        this.isDescriptionSaved = true;
                    }
                    
                    // Load profile picture URL from database
                    if (data.profile_picture_url) {
                        this.profilePictureUrl = data.profile_picture_url;
                    }
                    
                    // Load CV URL from database
                    if (data.cv_url) {
                        this.cvUrl = data.cv_url;
                    }
                    
                    console.log('Loaded other candidate ID:', this.candidateData.id, 'Full data:', data);
                    
                    // Update displayed name with candidate's nom
                    if (data.nom) {
                        this.currentUserName = data.nom;
                    }
                    
                    // Load contact data (prenom and telephone)
                    if (data.prenom) {
                        this.contactData.prenom = data.prenom;
                    }
                    if (data.telephone) {
                        this.candidateData.telephone = data.telephone;
                    }
                    if (data.prenom || data.telephone) {
                        this.isContactInfoSaved = true;
                    }
                    
                    // Parse education data from concatenated string with labels
                    if (data.niveauEtude && data.niveauEtude.includes('niveau:')) {
                        // Split by " ;; " to get individual education entries
                        const educationEntries = data.niveauEtude.split(' ;; ');
                        this.educationList = educationEntries.map((edu: string) => {
                            // Extract values using regex for labeled format
                            const niveauMatch = edu.match(/niveau:\s*([^,]*)/);
                            const domaineMatch = edu.match(/domaine:\s*([^,]*)/);
                            const institutionMatch = edu.match(/institution:\s*([^,]*)/);
                            const debutMatch = edu.match(/debut:\s*([^,]*)/);
                            const finMatch = edu.match(/fin:\s*([^,;]*)/);
                            
                            return {
                                niveauEtude: (niveauMatch?.[1] || '').trim(),
                                domain: (domaineMatch?.[1] || '').trim(),
                                institution: (institutionMatch?.[1] || '').trim(),
                                startDate: (debutMatch?.[1] || '').trim(),
                                endDate: (finMatch?.[1] || '').trim()
                            };
                        });
                    } else if (data.niveauEtude && data.niveauEtude.includes(' / ')) {
                        // OLD FORMAT: Split by " / " for backward compatibility with old data
                        const educationEntries = data.niveauEtude.split(' ;; ');
                        this.educationList = educationEntries.map((edu: string) => {
                            const parts = edu.split(' / ');
                            return {
                                niveauEtude: (parts[0] || '').trim(),
                                domain: (parts[1] || '').trim(),
                                institution: (parts[2] || '').trim(),
                                startDate: (parts[3] || '').trim().split('-')[0],
                                endDate: (parts[3] || '').trim().split('-')[1]
                            };
                        });
                    } else if (data.niveauEtude) {
                        // Single education entry without separators
                        this.educationList = [{ 
                            niveauEtude: data.niveauEtude, 
                            domain: '', 
                            institution: '', 
                            startDate: '', 
                            endDate: '' 
                        }];
                    } else {
                        this.educationList = [{ niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' }];
                    }

                    // Parse background data from concatenated string
                    if (data.backgroundExpertise && data.backgroundExpertise.includes('titre:')) {
                        // New labeled format
                        const backgroundEntries = data.backgroundExpertise.split(' ;; ');
                        this.backgroundList = backgroundEntries.map((bg: string) => {
                            const titreMatch = bg.match(/titre:\s*([^,]*)/);
                            const entrepriseMatch = bg.match(/entreprise:\s*([^,]*)/);
                            const debutMatch = bg.match(/debut:\s*([^,]*)/);
                            const finMatch = bg.match(/fin:\s*(.*)$/);
                            
                            return {
                                titre: (titreMatch?.[1] || '').trim(),
                                company: (entrepriseMatch?.[1] || '').trim(),
                                startDate: (debutMatch?.[1] || '').trim(),
                                endDate: (finMatch?.[1] || '').trim()
                            };
                        });
                    } else if (data.backgroundExpertise && data.backgroundExpertise.includes(' / ')) {
                        // Old format - backward compatibility
                        const backgroundEntries = data.backgroundExpertise.split(' ;; ');
                        this.backgroundList = backgroundEntries.map((bg: string) => {
                            const parts = bg.split(' / ');
                            return {
                                titre: (parts[0] || '').trim(),
                                company: (parts[1] || '').trim(),
                                startDate: (parts[2] || '').trim().split('-')[0],
                                endDate: (parts[2] || '').trim().split('-')[1]
                            };
                        });
                    } else if (data.backgroundExpertise) {
                        // Single background entry
                        this.backgroundList = [{ 
                            titre: data.backgroundExpertise, 
                            company: '', 
                            startDate: '', 
                            endDate: '' 
                        }];
                    } else {
                        this.backgroundList = [{ titre: '', company: '', startDate: '', endDate: '' }];
                    }

                    // Load passion and goals
                    if (data.passionAndGoals) {
                        this.passionAndGoals = data.passionAndGoals;
                        this.isPassionSaved = true;
                    }
                    
                    // Load localisation data if available
                    if (data.localisation_id) {
                        this.apiService.getLocalisation(data.localisation_id).subscribe({
                            next: (locData: any) => {
                                this.localisationData = locData;
                                
                                // Update map center if coordinates are available
                                if (locData.latitude && locData.longitude) {
                                    this.mapCenter = { lat: locData.latitude, lng: locData.longitude };
                                    this.markerPosition = { lat: locData.latitude, lng: locData.longitude };
                                }
                                
                                this.isLoading = false;
                            },
                            error: () => {
                                this.isLoading = false;
                            }
                        });
                    } else {
                        this.isLoading = false;
                    }
                }
            },
            (err) => {
                this.errorMessage = 'Erreur lors du chargement du profil candidat.';
                this.isLoading = false;
                console.error('Error loading other candidate data:', err);
            }
        );
    }

    saveCandidateProfile() {
        if (!this.validateForm()) {
            this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        // First save localisation if it has data
        let localisationId = this.candidateData.localisation_id;
        
        if (this.localisationData.latitude && this.localisationData.longitude) {
            // Create/update localisation first
            const localisationPayload = {
                pays: this.localisationData.pays,
                ville: this.localisationData.ville,
                latitude: this.localisationData.latitude,
                longitude: this.localisationData.longitude
            };
            
            const saveLocalisationObs = localisationId 
                ? this.apiService.updateLocalisation(localisationId, localisationPayload)
                : this.apiService.createLocalisation(localisationPayload);

            saveLocalisationObs.subscribe({
                next: (locResponse: any) => {
                    localisationId = locResponse.id || localisationId;
                    this.saveCandidateToApi(localisationId);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la sauvegarde de la localisation: ${error.message || error.statusText}`;
                    console.error('Localisation save error:', error);
                }
            });
        } else {
            this.saveCandidateToApi(localisationId);
        }
    }

    private saveCandidateToApi(localisationId?: number) {
        // Build payload for the backend - store all data as concatenated strings
        const candidatePayload: any = {
            nom: this.currentUserName || this.candidateData.email?.split('@')[0] || 'Candidat',
            prenom: this.contactData.prenom || '',
            email: this.candidateData.email,
            telephone: this.candidateData.telephone || '',
            description: this.candidateData.description || '',
            cv: this.candidateData.cv || '',
            lienPortfolio: this.candidateData.lien_portfolio || '',
            niveauEtude: this.candidateData.niveau_etude || '',
            passionAndGoals: this.passionAndGoals || '',
            competences: [] // Send empty array
        };

        // Concatenate ALL education entries into ONE string with labels
        if (this.educationList && this.educationList.length > 0) {
            const hasEducationData = this.educationList.some((edu: any) => 
                edu.niveauEtude || edu.domain || edu.institution || edu.startDate || edu.endDate
            );
            if (hasEducationData) {
                const educationStrings = this.educationList.map((edu: any) => {
                    return `niveau: ${edu.niveauEtude || ''}, domaine: ${edu.domain || ''}, institution: ${edu.institution || ''}, debut: ${edu.startDate || ''}, fin: ${edu.endDate || ''}`;
                });
                // Store all educations concatenated in niveauEtude field
                candidatePayload.niveauEtude = educationStrings.join(' ;; ');
            }
        }

        // Concatenate ALL background entries into ONE string with labels
        if (this.backgroundList && this.backgroundList.length > 0) {
            const hasBackgroundData = this.backgroundList.some((bg: any) => 
                bg.titre || bg.company || bg.startDate || bg.endDate
            );
            if (hasBackgroundData) {
                const backgroundStrings = this.backgroundList.map((bg: any) => {
                    return `titre: ${bg.titre || ''}, entreprise: ${bg.company || ''}, debut: ${bg.startDate || ''}, fin: ${bg.endDate || ''}`;
                });
                // Store all backgrounds concatenated in backgroundExpertise field
                candidatePayload.backgroundExpertise = backgroundStrings.join(' ;; ');
            }
        }

        // Only add localisation ID if it exists
        if (localisationId) {
            candidatePayload.localisation_id = localisationId;
        }

        console.log('Saving candidate payload:', candidatePayload);
        console.log('Using ID for update:', this.candidateData.id);

        const saveObs = this.candidateData.id
            ? this.apiService.updateCandidate(this.candidateData.id, candidatePayload)
            : this.apiService.createCandidate(candidatePayload);

        saveObs.subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.successMessage = 'Profil candidat sauvegardé avec succès!';
                // Set ID in case it's a new candidate
                if (response.id && !this.candidateData.id) {
                    this.candidateData.id = response.id;
                }
                if (response.localisation_id) {
                    this.candidateData.localisation_id = response.localisation_id;
                }
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                console.error('Save error:', error);
                this.errorMessage = `Erreur lors de la sauvegarde: ${error.message || error.statusText}`;
            }
        });
    }

    // Education management
    addEducation() {
        this.educationList.push({ niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' });
    }

    removeEducation(index: number) {
        this.educationList.splice(index, 1);
    }

    // Background management
    addBackground() {
        this.backgroundList.push({ titre: '', company: '', startDate: '', endDate: '' });
    }

    removeBackground(index: number) {
        this.backgroundList.splice(index, 1);
    }

    private validateForm(): boolean {
        // All fields are optional - allow saving without location data
        return true;
    }

    // Map click handler
    onMapClick(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            
            // Update marker position
            this.markerPosition = { lat, lng };
            
            // Update form fields
            this.localisationData.latitude = Math.round(lat * 10000) / 10000;
            this.localisationData.longitude = Math.round(lng * 10000) / 10000;
            
            // Update map center if you want the map to follow
            this.mapCenter = { lat, lng };
        }
    }

    // Geocode location based on country and city
    geocodeLocation() {
        if (!this.localisationData.pays && !this.localisationData.ville) {
            return;
        }

        // Build the search query
        const searchQuery = `${this.localisationData.ville ? this.localisationData.ville + ',' : ''} ${this.localisationData.pays}`;
        
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: searchQuery.trim() }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                const location = results[0].geometry.location;
                const lat = location.lat();
                const lng = location.lng();

                // Update map center
                this.mapCenter = { lat, lng };
                
                // Update marker position
                this.markerPosition = { lat, lng };
                
                // Update form fields with coordinates
                this.localisationData.latitude = Math.round(lat * 10000) / 10000;
                this.localisationData.longitude = Math.round(lng * 10000) / 10000;
            }
        });
    }

    // Watch for changes in pays or ville
    onPaysCityChange() {
        // Clear the previous timer
        if (this.geocodeTimer) {
            clearTimeout(this.geocodeTimer);
        }
        
        // Set a new timer to geocode after user stops typing (500ms delay)
        this.geocodeTimer = setTimeout(() => {
            this.geocodeLocation();
        }, 500);
    }

    // Save description only (for quick saves when editing description)
    saveDescriptionOnly() {
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';

            const descriptionPayload = {
                description: this.candidateData.description || ''
            };

            this.apiService.updateCandidate(this.candidateData.id, descriptionPayload).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.isDescriptionSaved = true;
                    this.successMessage = 'Description sauvegardée avec succès!';
                    this.isEditingAbout = false;
                    setTimeout(() => {
                        this.successMessage = '';
                    }, 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la sauvegarde de la description: ${error.message || error.statusText}`;
                    console.error('Description save error:', error);
                }
            });
        });
    }

    savePassionAndGoals() {
        console.log('savePassionAndGoals called - candidateData.id:', this.candidateData.id);
        
        if (!this.candidateData.id) {
            this.errorMessage = 'Erreur: Candidat ID non trouvé. Veuillez d\'abord créer votre profil complet.';
            console.error('Cannot save - no ID:', this.candidateData);
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const passionPayload = {
            passionAndGoals: this.passionAndGoals || ''
        };

        console.log('Saving passion and goals:', passionPayload, 'for ID:', this.candidateData.id);

        this.apiService.updateCandidate(this.candidateData.id, passionPayload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.isPassionSaved = true;
                this.successMessage = 'Passions et objectifs sauvegardés avec succès!';
                this.isEditingPassion = false;
                // Clear success message after 3 seconds
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la sauvegarde des passions: ${error.message || error.statusText}`;
                console.error('Passion save error:', error);
            }
        });
    }

    deleteDescription() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer votre description?')) {
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const descriptionPayload = {
            description: ''
        };

        this.apiService.updateCandidate(this.candidateData.id, descriptionPayload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.isDescriptionSaved = false;
                this.candidateData.description = '';
                this.successMessage = 'Description supprimée avec succès!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la suppression de la description: ${error.message || error.statusText}`;
                console.error('Description delete error:', error);
            }
        });
    }

    deleteAllEducation() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer toute votre éducation?')) {
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const educationPayload = {
            niveauEtude: ''
        };

        this.apiService.updateCandidate(this.candidateData.id, educationPayload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.educationList = [{ niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' }];
                this.successMessage = 'Éducation supprimée avec succès!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la suppression de l'éducation: ${error.message || error.statusText}`;
                console.error('Education delete error:', error);
            }
        });
    }

    deleteAllBackground() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer tout votre historique professionnel?')) {
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const backgroundPayload = {
            backgroundExpertise: ''
        };

        this.apiService.updateCandidate(this.candidateData.id, backgroundPayload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.backgroundList = [{ titre: '', company: '', startDate: '', endDate: '' }];
                this.successMessage = 'Historique professionnel supprimé avec succès!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la suppression de l'historique professionnel: ${error.message || error.statusText}`;
                console.error('Background delete error:', error);
            }
        });
    }

    deletePassionAndGoals() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer vos passions et objectifs futurs?')) {
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const passionPayload = {
            passionAndGoals: ''
        };

        this.apiService.updateCandidate(this.candidateData.id, passionPayload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.isPassionSaved = false;
                this.passionAndGoals = '';
                this.successMessage = 'Passions et objectifs supprimés avec succès!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la suppression des passions: ${error.message || error.statusText}`;
                console.error('Passion delete error:', error);
            }
        });
    }

    // Validation methods
    isDescriptionValid(): boolean {
        const value = (this.candidateData.description || '').trim();
        return value.length > 0 && value.length <= 60;
    }

    onDescriptionChange() {
        if ((this.candidateData.description || '').length > 60) {
            this.candidateData.description = (this.candidateData.description || '').substring(0, 60);
        }
    }

    isPrenomValid(): boolean {
        const value = (this.contactData.prenom || '').trim();
        return value.length > 0 && value.length <= 20;
    }

    onPrenomChange() {
        if ((this.contactData.prenom || '').length > 20) {
            this.contactData.prenom = (this.contactData.prenom || '').substring(0, 20);
        }
    }

    isTelephoneValid(): boolean {
        const value = (this.candidateData.telephone || '').trim();
        if (value.length === 0) {
            return false; // Telephone is required
        }
        // Allow only digits and special characters: +, -, space, (, )
        const phoneRegex = /^[0-9+\-\s()]*$/;
        return phoneRegex.test(value);
    }

    onTelephoneChange() {
        // Remove any invalid characters
        if (this.candidateData.telephone) {
            this.candidateData.telephone = this.candidateData.telephone.replace(/[^0-9+\-\s()]/g, '');
        }
    }

    isPassionValid(): boolean {
        const value = (this.passionAndGoals || '').trim();
        return value.length > 0 && value.length <= 200;
    }

    onPassionChange() {
        if ((this.passionAndGoals || '').length > 200) {
            this.passionAndGoals = (this.passionAndGoals || '').substring(0, 200);
        }
    }

    // Education validation methods
    isEducationYearsValid(edu: any): boolean {
        if (!edu.startDate || !edu.endDate) {
            return true; // Valid if not both filled
        }
        return Number(edu.endDate) >= Number(edu.startDate);
    }

    onEducationFieldChange(edu: any, field: string) {
        if (field === 'niveauEtude' && (edu.niveauEtude || '').length > 20) {
            edu.niveauEtude = (edu.niveauEtude || '').substring(0, 20);
        } else if (field === 'domain' && (edu.domain || '').length > 20) {
            edu.domain = (edu.domain || '').substring(0, 20);
        } else if (field === 'institution' && (edu.institution || '').length > 20) {
            edu.institution = (edu.institution || '').substring(0, 20);
        }
    }

    onEducationYearChange(edu: any) {
        // Allow only digits
        if (edu.startDate) {
            edu.startDate = String(edu.startDate).replace(/[^0-9]/g, '');
        }
        if (edu.endDate) {
            edu.endDate = String(edu.endDate).replace(/[^0-9]/g, '');
        }
    }

    isEducationListValid(): boolean {
        // Check if there's at least one education with valid data
        return this.educationList.every((edu: any) => {
            // Check if entry is completely empty (new entry not started)
            const isEmpty = !edu.niveauEtude && !edu.domain && !edu.institution && !edu.startDate && !edu.endDate;
            if (isEmpty) {
                return true; // Allow completely empty entries
            }

            // If ANY field has data, ALL fields must be valid
            if (!edu.niveauEtude || edu.niveauEtude.trim().length === 0 || edu.niveauEtude.length > 20) {
                return false;
            }
            if (!edu.domain || edu.domain.trim().length === 0 || edu.domain.length > 20) {
                return false;
            }
            if (!edu.institution || edu.institution.trim().length === 0 || edu.institution.length > 20) {
                return false;
            }
            // Both years must be filled and valid
            if (!edu.startDate || !edu.endDate) {
                return false;
            }
            // endDate must be >= startDate
            if (!this.isEducationYearsValid(edu)) {
                return false;
            }
            return true;
        });
    }

    getEducationValidationError(): string {
        // Find the first error in the education list
        for (let i = 0; i < this.educationList.length; i++) {
            const edu = this.educationList[i];
            
            // Skip completely empty entries (new entries not started)
            const isEmpty = !edu.niveauEtude && !edu.domain && !edu.institution && !edu.startDate && !edu.endDate;
            if (isEmpty) {
                continue;
            }

            // If ANY field has data, validate all fields
            if (!edu.niveauEtude || edu.niveauEtude.trim().length === 0) {
                return `Éducation ${i + 1}: Niveau d'Étude est requis`;
            }
            if (edu.niveauEtude.length > 20) {
                return `Éducation ${i + 1}: Niveau d'Étude dépasse 20 caractères`;
            }
            if (!edu.domain || edu.domain.trim().length === 0) {
                return `Éducation ${i + 1}: Domaine d'Étude est requis`;
            }
            if (edu.domain.length > 20) {
                return `Éducation ${i + 1}: Domaine d'Étude dépasse 20 caractères`;
            }
            if (!edu.institution || edu.institution.trim().length === 0) {
                return `Éducation ${i + 1}: Institution / Université est requis`;
            }
            if (edu.institution.length > 20) {
                return `Éducation ${i + 1}: Institution dépasse 20 caractères`;
            }
            if (!edu.startDate) {
                return `Éducation ${i + 1}: Année de Début est requis`;
            }
            if (!edu.endDate) {
                return `Éducation ${i + 1}: Année de Fin est requis`;
            }
            if (!this.isEducationYearsValid(edu)) {
                return `Éducation ${i + 1}: L'année de fin doit être supérieure ou égale à l'année de début`;
            }
        }
        return '';
    }

    // Background validation methods
    isBackgroundYearsValid(bg: any): boolean {
        if (!bg.startDate || !bg.endDate) {
            return true; // Valid if not both filled
        }
        return Number(bg.endDate) >= Number(bg.startDate);
    }

    onBackgroundFieldChange(bg: any, field: string) {
        if (field === 'titre' && (bg.titre || '').length > 20) {
            bg.titre = (bg.titre || '').substring(0, 20);
        } else if (field === 'company' && (bg.company || '').length > 20) {
            bg.company = (bg.company || '').substring(0, 20);
        }
    }

    onBackgroundYearChange(bg: any) {
        // Allow only digits
        if (bg.startDate) {
            bg.startDate = String(bg.startDate).replace(/[^0-9]/g, '');
        }
        if (bg.endDate) {
            bg.endDate = String(bg.endDate).replace(/[^0-9]/g, '');
        }
    }

    isBackgroundListValid(): boolean {
        // Check if all background entries have valid data
        return this.backgroundList.every((bg: any) => {
            // Check if entry is completely empty (new entry not started)
            const isEmpty = !bg.titre && !bg.company && !bg.startDate && !bg.endDate;
            if (isEmpty) {
                return true; // Allow completely empty entries
            }

            // If ANY field has data, ALL fields must be valid
            if (!bg.titre || bg.titre.trim().length === 0 || (bg.titre || '').length > 20) {
                return false;
            }
            if (!bg.company || bg.company.trim().length === 0 || (bg.company || '').length > 20) {
                return false;
            }
            // Both years must be filled and valid
            if (!bg.startDate || !bg.endDate) {
                return false;
            }
            // If both years are filled, endDate must be >= startDate
            if (bg.startDate && bg.endDate && !this.isBackgroundYearsValid(bg)) {
                return false;
            }
            return true;
        });
    }

    getBackgroundValidationError(): string {
        // Find the first error in the background list
        for (let i = 0; i < this.backgroundList.length; i++) {
            const bg = this.backgroundList[i];
            
            // Skip completely empty entries (new entries not started)
            const isEmpty = !bg.titre && !bg.company && !bg.startDate && !bg.endDate;
            if (isEmpty) {
                continue;
            }

            // If ANY field has data, validate all fields
            if (!bg.titre || bg.titre.trim().length === 0) {
                return `Expérience ${i + 1}: Titre du Poste est requis`;
            }
            if ((bg.titre || '').length > 20) {
                return `Expérience ${i + 1}: Titre du Poste dépasse 20 caractères`;
            }
            if (!bg.company || bg.company.trim().length === 0) {
                return `Expérience ${i + 1}: Entreprise est requis`;
            }
            if ((bg.company || '').length > 20) {
                return `Expérience ${i + 1}: Entreprise dépasse 20 caractères`;
            }
            if (!bg.startDate) {
                return `Expérience ${i + 1}: Année de Début est requis`;
            }
            if (!bg.endDate) {
                return `Expérience ${i + 1}: Année de Fin est requis`;
            }
            if (bg.startDate && bg.endDate && !this.isBackgroundYearsValid(bg)) {
                return `Expérience ${i + 1}: L'année de fin doit être supérieure ou égale à l'année de début`;
            }
        }
        return '';
    }

    saveContactInfo() {
        console.log('saveContactInfo called - candidateData.id:', this.candidateData.id);
        
        if (!this.candidateData.id) {
            this.errorMessage = 'Erreur: Candidat ID non trouvé. Veuillez d\'abord créer votre profil complet.';
            console.error('Cannot save - no ID:', this.candidateData);
            return;
        }

        // Validate before saving
        if (!this.isPrenomValid()) {
            this.errorMessage = 'Le prénom ne doit pas dépasser 20 caractères.';
            return;
        }

        if (!this.isTelephoneValid()) {
            this.errorMessage = 'Le téléphone doit contenir uniquement des chiffres et caractères spéciaux (+, -, espaces).';
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const contactPayload = {
            prenom: this.contactData.prenom || '',
            telephone: this.candidateData.telephone || ''
        };

        console.log('Saving contact info:', contactPayload, 'for ID:', this.candidateData.id);

        this.apiService.updateCandidate(this.candidateData.id, contactPayload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.isContactInfoSaved = true;
                this.successMessage = 'Informations de contact sauvegardées avec succès!';
                // Clear success message after 3 seconds
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la sauvegarde des informations: ${error.message || error.statusText}`;
                console.error('Contact info save error:', error);
            }
        });
    }

    deleteContactInfo() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer vos informations de contact?')) {
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const contactPayload = {
            prenom: '',
            telephone: ''
        };

        this.apiService.updateCandidate(this.candidateData.id, contactPayload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.isContactInfoSaved = false;
                this.contactData.prenom = '';
                this.candidateData.telephone = '';
                this.successMessage = 'Informations de contact supprimées avec succès!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la suppression des informations: ${error.message || error.statusText}`;
                console.error('Contact info delete error:', error);
            }
        });
    }

    saveLocalisationInfo() {
        console.log('saveLocalisationInfo called - candidateData.id:', this.candidateData.id);
        console.log('Current localisation_id:', this.candidateData.localisation_id);
        
        if (!this.candidateData.id) {
            this.errorMessage = 'Erreur: Candidat ID non trouvé. Veuillez d\'abord créer votre profil complet.';
            console.error('Cannot save - no ID:', this.candidateData);
            return;
        }

        if (!this.localisationData.latitude || !this.localisationData.longitude) {
            this.errorMessage = 'Erreur: Veuillez fournir les coordonnées (latitude et longitude).';
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const localisationPayload = {
            pays: this.localisationData.pays || '',
            ville: this.localisationData.ville || '',
            latitude: this.localisationData.latitude,
            longitude: this.localisationData.longitude
        };

        console.log('Saving localisation:', localisationPayload);

        const localisationId = this.candidateData.localisation_id;
        console.log('Localisation ID to use:', localisationId, 'Will', localisationId ? 'UPDATE' : 'CREATE');

        const saveLocalisationObs = localisationId
            ? this.apiService.updateLocalisation(localisationId, localisationPayload)
            : this.apiService.createLocalisation(localisationPayload);

        saveLocalisationObs.subscribe({
            next: (response: any) => {
                // If we created a new localisation, update the candidate with the ID
                if (!localisationId && response.id) {
                    console.log('Created new localisation with ID:', response.id);
                    const candidatePayload = {
                        localisation_id: response.id
                    };
                    this.apiService.updateCandidate(this.candidateData.id, candidatePayload).subscribe({
                        next: () => {
                            this.candidateData.localisation_id = response.id;
                            this.localisationData.id = response.id;
                            console.log('Updated candidate with localisation_id:', response.id);
                            this.isSaving = false;
                            this.successMessage = 'Localisation sauvegardée avec succès!';
                            setTimeout(() => {
                                this.successMessage = '';
                            }, 3000);
                        },
                        error: (error) => {
                            this.isSaving = false;
                            this.errorMessage = `Erreur: ${error.message || error.statusText}`;
                        }
                    });
                } else {
                    console.log('Updated existing localisation');
                    this.isSaving = false;
                    this.successMessage = 'Localisation sauvegardée avec succès!';
                    setTimeout(() => {
                        this.successMessage = '';
                    }, 3000);
                }
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la sauvegarde de la localisation: ${error.message || error.statusText}`;
                console.error('Localisation save error:', error);
            }
        });
    }

    /**
     * Delete localisation and clear from candidate
     */
    deleteLocalisationInfo() {
        const localisationId = this.candidateData.localisation_id;
        
        if (!localisationId) {
            this.errorMessage = 'Aucune localisation à supprimer.';
            return;
        }

        // Confirm deletion
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette localisation?')) {
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        // Delete localisation from backend
        this.apiService.deleteLocalisation(localisationId).subscribe({
            next: () => {
                console.log('Localisation deleted successfully');
                
                // Clear localisation_id from candidate in database
                const candidatePayload = {
                    localisation_id: null
                };
                this.apiService.updateCandidate(this.candidateData.id, candidatePayload).subscribe({
                    next: () => {
                        // Clear local data
                        this.candidateData.localisation_id = null;
                        this.localisationData = {
                            latitude: '',
                            longitude: '',
                            pays: '',
                            ville: ''
                        };
                        this.markerPosition = null;
                        
                        this.isSaving = false;
                        this.successMessage = 'Localisation supprimée avec succès!';
                        setTimeout(() => {
                            this.successMessage = '';
                        }, 3000);
                    },
                    error: (error) => {
                        this.isSaving = false;
                        this.errorMessage = `Erreur: ${error.message || error.statusText}`;
                    }
                });
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la suppression de la localisation: ${error.message || error.statusText}`;
                console.error('Localisation delete error:', error);
            }
        });
    }

    /**
     * Handle profile picture upload
     */
    onProfilePictureUploaded(event: any): void {
        this.profilePictureUrl = event.url;
        this.saveProfilePictureUrl(event.url);
    }

    /**
     * Trigger profile picture file upload by clicking the file input
     */
    onProfilePictureSelected(event: any): void {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            this.uploadProfilePictureToCloudinary(file);
        }
    }

    /**
     * Upload profile picture to Cloudinary
     */
    uploadProfilePictureToCloudinary(file: File): void {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.errorMessage = 'Please select a valid image file';
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.errorMessage = 'File size must be less than 10MB';
            return;
        }

        this.isUploadingProfilePicture = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.cloudinaryService.uploadFile(file).subscribe({
            next: (response: any) => {
                this.isUploadingProfilePicture = false;
                if (response && response.secure_url) {
                    this.profilePictureUrl = response.secure_url;
                    this.successMessage = 'Profile picture uploaded successfully!';
                    this.saveProfilePictureUrl(response.secure_url);
                    
                    // Clear success message after 3 seconds
                    setTimeout(() => {
                        this.successMessage = '';
                    }, 3000);
                } else {
                    this.errorMessage = 'Upload response invalid. Missing secure_url.';
                }
            },
            error: (error: any) => {
                this.isUploadingProfilePicture = false;
                console.error('Upload error details:', error);
                
                // Try to extract more detailed error message
                let errorMsg = 'Upload failed. Please try again.';
                
                if (error.status === 401) {
                    errorMsg = 'Upload preset authentication failed. Check your Cloudinary credentials.';
                } else if (error.status === 400) {
                    errorMsg = 'Invalid upload parameters. Check file format and size.';
                } else if (error.status === 403) {
                    errorMsg = 'Upload forbidden. Check your upload preset configuration.';
                } else if (error.error && error.error.error) {
                    errorMsg = `Upload error: ${error.error.error.message || error.error.error}`;
                } else if (error.message) {
                    errorMsg = `Upload failed: ${error.message}`;
                }
                
                this.errorMessage = errorMsg;
                console.error('Final error message:', errorMsg);
            }
        });
    }

    /**
     * Handle CV upload
     */
    onCVUploaded(event: any): void {
        this.cvUrl = event.url;
        this.saveCVUrl(event.url);
    }

    /**
     * Save profile picture URL to database
     */
    saveProfilePictureUrl(url: string): void {
        if (!this.candidateData.id) {
            this.errorMessage = 'Candidate ID not found';
            return;
        }

        this.isSaving = true;
        const profilePayload = {
            profile_picture_url: url
        };

        this.apiService.updateCandidate(this.candidateData.id, profilePayload).subscribe({
            next: () => {
                this.isSaving = false;
                this.successMessage = 'Profile picture saved successfully!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Error saving profile picture: ${error.message || error.statusText}`;
                console.error('Profile picture save error:', error);
            }
        });
    }

    /**
     * Save CV URL to database
     */
    saveCVUrl(url: string): void {
        if (!this.candidateData.id) {
            this.errorMessage = 'Candidate ID not found';
            return;
        }

        this.isSaving = true;
        const cvPayload = {
            cv_url: url
        };

        this.apiService.updateCandidate(this.candidateData.id, cvPayload).subscribe({
            next: () => {
                this.isSaving = false;
                this.successMessage = 'CV saved successfully!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Error saving CV: ${error.message || error.statusText}`;
                console.error('CV save error:', error);
            }
        });
    }

    /**
     * Download CV file directly from Cloudinary
     */
    downloadCV(): void {
        if (!this.cvUrl) {
            this.errorMessage = 'No CV available to download';
            return;
        }

        try {
            // Add download parameter to Cloudinary URL
            let downloadUrl = this.cvUrl;
            
            // If it's a Cloudinary URL, ensure it has the attachment parameter
            if (downloadUrl.includes('res.cloudinary.com')) {
                // Add fl_attachment parameter to force download
                if (downloadUrl.includes('?')) {
                    downloadUrl += '&fl_attachment';
                } else {
                    downloadUrl += '?fl_attachment';
                }
            }
            
            // Create a hidden link and click it to download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `cv_${this.candidateData.id || 'download'}.pdf`;
            link.setAttribute('target', '_blank');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.successMessage = 'CV download started!';
            setTimeout(() => {
                this.successMessage = '';
            }, 3000);
        } catch (error) {
            console.error('Download error:', error);
            this.errorMessage = 'Could not download CV. Opening in new window...';
            // Fallback: open in new window
            window.open(this.cvUrl, '_blank');
        }
    }

    /**
     * Add a new competence skill
     */
    addCompetence(): void {
        if (this.newCompetence.trim() === '') {
            this.errorMessage = 'Please enter a skill name';
            return;
        }

        // Check if competence already exists
        if (this.candidateData.competences.includes(this.newCompetence.trim())) {
            this.errorMessage = 'This skill already exists';
            return;
        }

        this.candidateData.competences.push(this.newCompetence.trim());
        this.newCompetence = '';
        this.errorMessage = '';
        this.successMessage = 'Skill added successfully!';
        setTimeout(() => {
            this.successMessage = '';
        }, 2000);
    }

    /**
     * Remove a competence skill
     */
    removeCompetence(index: number): void {
        this.candidateData.competences.splice(index, 1);
        this.successMessage = 'Skill removed successfully!';
        setTimeout(() => {
            this.successMessage = '';
        }, 2000);
    }

    /**
     * Save competences to the backend
     */
    saveCompetences(): void {
        if (!this.candidateData.id) {
            this.errorMessage = 'Please save your profile first before adding skills';
            return;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const payload = {
            competences: this.candidateData.competences
        };

        this.apiService.updateCandidateCompetences(this.candidateData.id, payload).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.successMessage = 'Skills saved successfully!';
                this.isEditingCompetences = false;
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error: any) => {
                this.isSaving = false;
                console.error('Error saving competences:', error);
                this.errorMessage = `Error saving skills: ${error.error?.message || error.message || 'Unknown error'}`;
            }
        });
    }
}
