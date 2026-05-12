import { Component, OnInit } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { ApiService } from '../../api.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { ProfileUpdateService } from '../../services/profile-update.service';

@Component({
    selector: 'app-cd-profile',
    standalone: false,
    templateUrl: './cd-profile.component.html',
    styleUrls: ['./cd-profile.component.scss']
})
export class CdProfileComponent implements OnInit {
    currentUserName = 'Candidat';
    candidateData: any = {
        id: null,
        cv: '',
        description: '',
        lien_portfolio: '',
        niveau_etude: '',
        competences: [],
        telephone: '',
        email: '',
        profile_picture_url: '',
        localisation_id: null,
        nom: ''
    };
    localisationData: any = {
        id: null,
        latitude: '',
        longitude: '',
        pays: '',
        ville: ''
    };
    isViewingOtherCandidate = false;
    isEditingAbout = false;
    isEditingEducation = false;
    isEditingBackground = false;
    isEditingPassion = false;
    isEditingCompetences = false;
    isDescriptionFormSubmitted = false;
    isEducationFormSubmitted = false;
    isBackgroundFormSubmitted = false;
    isPassionFormSubmitted = false;
    isContactFormSubmitted = false;
    isDescriptionSaved = false;
    isContactInfoSaved = false;
    isPassionSaved = false;
    passionAndGoals = '';
    newCompetence = '';
    availableCompetences: any[] = [];
    selectedCompetence: string = '';
    contactData: any = {
        prenom: ''
    };
    educationList: any[] = [
        { niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' }
    ];
    backgroundList: any[] = [
        { titre: '', company: '', startDate: '', endDate: '' }
    ];
    profilePictureUrl = '';
    defaultProfilePictureUrl = '/images/candidates/candidate1.jpg';
    cvUrl = '';
    mapZoom = 10;
    mapCenter = { lat: 36.8065, lng: 10.1615 };
    markerPosition: any = { lat: 36.8065, lng: 10.1615 };
    isLoading = false;
    isSaving = false;
    successMessage = '';
    errorMessage = '';
    geocodeTimer: any;
    isUploadingProfilePicture = false;
    
    // Education level options
    niveauEtudeOptions: string[] = [
        'Baccalauréat',
        'Licence',
        'Master',
        'Doctorat',
        'Diplôme Universitaire',
        'BTS',
        'DUT',
        'Certificat'
    ];
    
    // Study domain options
    domaineEtudeOptions: string[] = [
        'Informatique',
        'Ingénierie',
        'Génie Civil',
        'Commerce',
        'Gestion',
        'Marketing',
        'Ressources Humaines',
        'Finance',
        'Comptabilité',
        'Droit',
        'Médecine',
        'Sciences',
        'Mathématiques',
        'Langues',
        'Arts',
        'Design',
        'Architecture',
        'Agriculture',
        'Environnement',
        'Électronique'
    ];
    
    // Job title options
    titrePosteOptions: string[] = [
        'Développeur',
        'Développeur Senior',
        'Développeur Full Stack',
        'Développeur Frontend',
        'Développeur Backend',
        'Ingénieur Logiciel',
        'Ingénieur Senior',
        'Responsable Technique',
        'Architecte Logiciel',
        'Chef de Projet',
        'Product Manager',
        'Data Scientist',
        'Data Engineer',
        'Designer UX/UI',
        'Designer Graphique',
        'Consultant',
        'Consultant Senior',
        'Responsable RH',
        'Responsable QA',
        'Testeur Automatisé'
    ];
    
    // Year options for education and background
    yearOptions: number[] = this.generateYearOptions();

    // Country and City options
    countryOptions: string[] = [
        'Tunisie',
        'Maroc',
        'Algérie',
        'Égypte',
        'Libye',
        'Mauritanie',
        'Soudan',
        'France',
        'Belgique',
        'Suisse',
        'Canada',
        'États-Unis',
        'Royaume-Uni',
        'Allemagne',
        'Italie',
        'Espagne',
        'Pays-Bas',
        'Portugal',
        'Australie',
        'Nouvelle-Zélande'
    ];

    citiesByCountry: { [key: string]: string[] } = {
        'Tunisie': ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Gafsa', 'Médenine', 'Tataouine', 'Bizerte', 'Hammamet', 'Djerba'],
        'Maroc': ['Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Agadir', 'Tanger', 'Tétouan', 'Meknes', 'Oujda', 'Safi'],
        'Algérie': ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif', 'Sidi Bel Abbès', 'Béjaïa', 'Tlemcen', 'Tiaret'],
        'Égypte': ['Le Caire', 'Alexandrie', 'Giza', 'Louxor', 'Assouan', 'Mansoura', 'Tanta', 'Zagazig', 'Qena', 'Suez'],
        'Libye': ['Tripoli', 'Benghazi', 'Misrata', 'Tobrouk', 'Derna', 'Zliten', 'Sorman', 'Zawiya', 'Sabratha', 'Ghadamès'],
        'Mauritanie': ['Nouakchott', 'Nouadhibou', 'Kiffa', 'Rosso', 'Kaédi', 'Tidjikja', 'Atar', 'Chinguetti', 'Akjoujt', 'Bogué'],
        'Soudan': ['Khartoum', 'Omdourman', 'Port-Soudan', 'Kassala', 'Al-Ubayyid', 'Wadi Madani', 'Atbara', 'Gedaref', 'Nyala', 'El Daein'],
        'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
        'Belgique': ['Bruxelles', 'Anvers', 'Gand', 'Charleroi', 'Liège', 'Louvain', 'Mons', 'Tournai', 'Namur', 'Hasselt'],
        'Suisse': ['Zurich', 'Genève', 'Bâle', 'Berne', 'Lausanne', 'Lucerne', 'Saint-Gall', 'Neuchâtel', 'Winterthur', 'Lugano'],
        'Canada': ['Toronto', 'Montréal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Québec', 'Hamilton', 'Kitchener'],
        'États-Unis': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphie', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
        'Royaume-Uni': ['Londres', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield', 'Bristol', 'Edinburgh', 'Liverpool', 'Newcastle'],
        'Allemagne': ['Berlin', 'Munich', 'Francfort', 'Cologne', 'Hambourg', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
        'Italie': ['Rome', 'Milan', 'Naples', 'Turin', 'Palerme', 'Gênes', 'Bologne', 'Florence', 'Bari', 'Catane'],
        'Espagne': ['Madrid', 'Barcelone', 'Valence', 'Séville', 'Saragosse', 'Malaga', 'Murcie', 'Palma', 'Bilbao', 'Cordoue'],
        'Pays-Bas': ['Amsterdam', 'Rotterdam', 'La Haye', 'Utrecht', 'Eindhoven', 'Groningue', 'Arnhem', 'Alkmaar', 'Leyde', 'Nimègue'],
        'Portugal': ['Lisbonne', 'Porto', 'Covilhã', 'Braga', 'Funchal', 'Évora', 'Covilhã', 'Aveiro', 'Viseu', 'Guarda'],
        'Australie': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaïde', 'Hobart', 'Canberra', 'Gold Coast', 'Newcastle', 'Wollongong'],
        'Nouvelle-Zélande': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Lower Hutt', 'Dunedin', 'Palmerston North', 'Rotorua', 'Napier']
    };

    // Get cities for selected country
    getCitiesByCountry(): string[] {
        if (!this.localisationData.pays || !this.citiesByCountry[this.localisationData.pays]) {
            return [];
        }
        return this.citiesByCountry[this.localisationData.pays];
    }

    // City coordinates mapping
    coordinatesByCity: { [key: string]: { [key: string]: { lat: number; lng: number } } } = {
        'Tunisie': {
            'Tunis': { lat: 36.8065, lng: 10.1615 },
            'Sfax': { lat: 34.7405, lng: 10.7603 },
            'Sousse': { lat: 35.8256, lng: 10.6369 },
            'Kairouan': { lat: 35.6713, lng: 10.1056 },
            'Gafsa': { lat: 34.4261, lng: 8.7818 },
            'Médenine': { lat: 33.3539, lng: 10.5043 },
            'Tataouine': { lat: 32.9289, lng: 10.4518 },
            'Bizerte': { lat: 37.2744, lng: 9.8739 },
            'Hammamet': { lat: 36.4023, lng: 10.6141 },
            'Djerba': { lat: 33.8869, lng: 10.9369 }
        },
        'Maroc': {
            'Casablanca': { lat: 33.5731, lng: -7.5898 },
            'Rabat': { lat: 34.0209, lng: -6.8416 },
            'Fès': { lat: 34.0333, lng: -5.0033 },
            'Marrakech': { lat: 31.6295, lng: -8.0088 },
            'Agadir': { lat: 30.4278, lng: -9.5881 },
            'Tanger': { lat: 35.7595, lng: -5.8340 },
            'Tétouan': { lat: 35.5997, lng: -5.3671 },
            'Meknes': { lat: 33.8869, lng: -5.5491 },
            'Oujda': { lat: 34.6841, lng: -1.9073 },
            'Safi': { lat: 32.2993, lng: -8.7603 }
        },
        'Algérie': {
            'Alger': { lat: 36.7538, lng: 3.0588 },
            'Oran': { lat: 35.6979, lng: -0.6348 },
            'Constantine': { lat: 36.3619, lng: 6.6135 },
            'Annaba': { lat: 36.9000, lng: 7.7600 },
            'Blida': { lat: 36.4766, lng: 2.8255 },
            'Sétif': { lat: 36.1903, lng: 5.4078 },
            'Sidi Bel Abbès': { lat: 35.1900, lng: -0.6411 },
            'Béjaïa': { lat: 36.7538, lng: 5.0747 },
            'Tlemcen': { lat: 35.2937, lng: -1.3144 },
            'Tiaret': { lat: 35.3738, lng: 1.3213 }
        },
        'Égypte': {
            'Le Caire': { lat: 30.0444, lng: 31.2357 },
            'Alexandrie': { lat: 31.2001, lng: 29.9187 },
            'Giza': { lat: 30.0131, lng: 31.2089 },
            'Louxor': { lat: 25.6872, lng: 32.6396 },
            'Assouan': { lat: 24.0889, lng: 32.8998 },
            'Mansoura': { lat: 31.0461, lng: 31.3706 },
            'Tanta': { lat: 30.7865, lng: 31.0004 },
            'Zagazig': { lat: 30.5836, lng: 31.5029 },
            'Qena': { lat: 26.1644, lng: 33.6357 },
            'Suez': { lat: 29.9668, lng: 32.5498 }
        },
        'France': {
            'Paris': { lat: 48.8566, lng: 2.3522 },
            'Marseille': { lat: 43.2965, lng: 5.3698 },
            'Lyon': { lat: 45.7640, lng: 4.8357 },
            'Toulouse': { lat: 43.6047, lng: 1.4442 },
            'Nice': { lat: 43.7102, lng: 7.2620 },
            'Nantes': { lat: 47.2184, lng: -1.5536 },
            'Strasbourg': { lat: 48.5734, lng: 7.7521 },
            'Montpellier': { lat: 43.6108, lng: 3.8767 },
            'Bordeaux': { lat: 44.8378, lng: -0.5792 },
            'Lille': { lat: 50.6292, lng: 3.0573 }
        },
        'Belgique': {
            'Bruxelles': { lat: 50.8503, lng: 4.3517 },
            'Anvers': { lat: 51.2194, lng: 4.4025 },
            'Gand': { lat: 51.0538, lng: 3.7196 },
            'Charleroi': { lat: 50.4095, lng: 4.4347 },
            'Liège': { lat: 50.6325, lng: 5.5700 },
            'Louvain': { lat: 50.8798, lng: 4.7005 },
            'Mons': { lat: 50.4501, lng: 3.9552 },
            'Tournai': { lat: 50.6059, lng: 3.3884 },
            'Namur': { lat: 50.4656, lng: 4.8683 },
            'Hasselt': { lat: 50.9313, lng: 5.3381 }
        },
        'Suisse': {
            'Zurich': { lat: 47.3769, lng: 8.5472 },
            'Genève': { lat: 46.1959, lng: 6.1423 },
            'Bâle': { lat: 47.5596, lng: 7.5886 },
            'Berne': { lat: 46.9479, lng: 7.4474 },
            'Lausanne': { lat: 46.5197, lng: 6.6323 },
            'Lucerne': { lat: 47.0502, lng: 8.3093 },
            'Saint-Gall': { lat: 47.4235, lng: 9.3768 },
            'Neuchâtel': { lat: 46.9907, lng: 6.9217 },
            'Winterthur': { lat: 47.5004, lng: 8.7267 },
            'Lugano': { lat: 46.0051, lng: 8.9511 }
        },
        'Canada': {
            'Toronto': { lat: 43.6629, lng: -79.3957 },
            'Montréal': { lat: 45.5017, lng: -73.5673 },
            'Vancouver': { lat: 49.2827, lng: -123.1207 },
            'Calgary': { lat: 51.0447, lng: -114.0719 },
            'Edmonton': { lat: 53.5461, lng: -113.4938 },
            'Ottawa': { lat: 45.4215, lng: -75.6972 },
            'Winnipeg': { lat: 49.8951, lng: -97.1384 },
            'Québec': { lat: 46.8139, lng: -71.2080 },
            'Hamilton': { lat: 43.2557, lng: -79.8711 },
            'Kitchener': { lat: 43.4516, lng: -80.4925 }
        },
        'États-Unis': {
            'New York': { lat: 40.7128, lng: -74.0060 },
            'Los Angeles': { lat: 34.0522, lng: -118.2437 },
            'Chicago': { lat: 41.8781, lng: -87.6298 },
            'Houston': { lat: 29.7604, lng: -95.3698 },
            'Phoenix': { lat: 33.4484, lng: -112.0742 },
            'Philadelphie': { lat: 39.9526, lng: -75.1652 },
            'San Antonio': { lat: 29.4241, lng: -98.4936 },
            'San Diego': { lat: 32.7157, lng: -117.1611 },
            'Dallas': { lat: 32.7767, lng: -96.7970 },
            'San Jose': { lat: 37.3382, lng: -121.8863 }
        },
        'Royaume-Uni': {
            'Londres': { lat: 51.5074, lng: -0.1278 },
            'Manchester': { lat: 53.4808, lng: -2.2426 },
            'Birmingham': { lat: 52.5086, lng: -1.8853 },
            'Leeds': { lat: 53.8008, lng: -1.5491 },
            'Glasgow': { lat: 55.8642, lng: -4.2518 },
            'Sheffield': { lat: 53.3811, lng: -1.4701 },
            'Bristol': { lat: 51.4545, lng: -2.5879 },
            'Edinburgh': { lat: 55.9533, lng: -3.1883 },
            'Liverpool': { lat: 53.4084, lng: -2.9916 },
            'Newcastle': { lat: 54.9783, lng: -1.6178 }
        },
        'Allemagne': {
            'Berlin': { lat: 52.5200, lng: 13.4050 },
            'Munich': { lat: 48.1351, lng: 11.5820 },
            'Francfort': { lat: 50.1109, lng: 8.6821 },
            'Cologne': { lat: 50.9375, lng: 6.9603 },
            'Hambourg': { lat: 53.5511, lng: 9.9937 },
            'Stuttgart': { lat: 48.7758, lng: 9.1829 },
            'Düsseldorf': { lat: 51.2277, lng: 6.7735 },
            'Dortmund': { lat: 51.5136, lng: 7.4653 },
            'Essen': { lat: 51.4556, lng: 7.0116 },
            'Leipzig': { lat: 51.3397, lng: 12.3731 }
        },
        'Italie': {
            'Rome': { lat: 41.9028, lng: 12.4964 },
            'Milan': { lat: 45.4642, lng: 9.1900 },
            'Naples': { lat: 40.8518, lng: 14.2681 },
            'Turin': { lat: 45.0703, lng: 7.6869 },
            'Palerme': { lat: 38.1157, lng: 13.3615 },
            'Gênes': { lat: 44.4056, lng: 8.9463 },
            'Bologne': { lat: 44.4949, lng: 11.3426 },
            'Florence': { lat: 43.7696, lng: 11.2558 },
            'Bari': { lat: 41.1186, lng: 16.8723 },
            'Catane': { lat: 37.4979, lng: 15.0873 }
        },
        'Espagne': {
            'Madrid': { lat: 40.4168, lng: -3.7038 },
            'Barcelone': { lat: 41.3851, lng: 2.1734 },
            'Valence': { lat: 39.4699, lng: -0.3763 },
            'Séville': { lat: 37.3886, lng: -5.9823 },
            'Saragosse': { lat: 41.6488, lng: -0.8891 },
            'Malaga': { lat: 36.7213, lng: -4.4215 },
            'Murcie': { lat: 37.9922, lng: -1.1303 },
            'Palma': { lat: 39.5696, lng: 2.6502 },
            'Bilbao': { lat: 43.2630, lng: -2.9350 },
            'Cordoue': { lat: 37.8882, lng: -4.7794 }
        },
        'Pays-Bas': {
            'Amsterdam': { lat: 52.3676, lng: 4.9041 },
            'Rotterdam': { lat: 51.9225, lng: 4.4792 },
            'La Haye': { lat: 52.0705, lng: 4.3007 },
            'Utrecht': { lat: 52.0894, lng: 5.1104 },
            'Eindhoven': { lat: 51.4416, lng: 5.4697 },
            'Groningue': { lat: 53.2194, lng: 6.5665 },
            'Arnhem': { lat: 51.9851, lng: 5.8987 },
            'Alkmaar': { lat: 52.6343, lng: 4.7437 },
            'Leyde': { lat: 52.1601, lng: 4.4852 },
            'Nimègue': { lat: 51.8425, lng: 5.8520 }
        },
        'Portugal': {
            'Lisbonne': { lat: 38.7223, lng: -9.1393 },
            'Porto': { lat: 41.1579, lng: -8.6291 },
            'Covilhã': { lat: 40.2837, lng: -7.4987 },
            'Braga': { lat: 41.5454, lng: -8.4265 },
            'Funchal': { lat: 32.6532, lng: -17.0091 },
            'Évora': { lat: 38.2744, lng: -7.8987 },
            'Aveiro': { lat: 40.6386, lng: -8.6553 },
            'Viseu': { lat: 40.6630, lng: -7.2656 },
            'Guarda': { lat: 40.5356, lng: -7.2691 },
            'Faro': { lat: 37.0141, lng: -7.9304 }
        },
        'Australie': {
            'Sydney': { lat: -33.8688, lng: 151.2093 },
            'Melbourne': { lat: -37.8136, lng: 144.9631 },
            'Brisbane': { lat: -27.4698, lng: 153.0251 },
            'Perth': { lat: -31.9505, lng: 115.8605 },
            'Adelaïde': { lat: -34.9285, lng: 138.6007 },
            'Hobart': { lat: -42.8821, lng: 147.3272 },
            'Canberra': { lat: -35.2809, lng: 149.1300 },
            'Gold Coast': { lat: -28.0028, lng: 153.4314 },
            'Newcastle': { lat: -32.9283, lng: 151.7817 },
            'Wollongong': { lat: -34.4240, lng: 150.8931 }
        },
        'Nouvelle-Zélande': {
            'Auckland': { lat: -37.0082, lng: 174.7850 },
            'Wellington': { lat: -41.2865, lng: 174.7762 },
            'Christchurch': { lat: -43.5321, lng: 172.6362 },
            'Hamilton': { lat: -37.7870, lng: 175.2793 },
            'Tauranga': { lat: -37.7870, lng: 176.1693 },
            'Lower Hutt': { lat: -41.2033, lng: 174.9273 },
            'Dunedin': { lat: -45.8788, lng: 170.5028 },
            'Palmerston North': { lat: -40.3570, lng: 175.6112 },
            'Rotorua': { lat: -38.1368, lng: 176.2497 },
            'Napier': { lat: -39.4730, lng: 176.4129 }
        }
    };

    // Update map when city is selected
    updateMapToCity(): void {
        if (this.localisationData.pays && this.localisationData.ville) {
            const cityCoords = this.coordinatesByCity[this.localisationData.pays]?.[this.localisationData.ville];
            if (cityCoords) {
                this.mapCenter = { lat: cityCoords.lat, lng: cityCoords.lng };
                this.markerPosition = { lat: cityCoords.lat, lng: cityCoords.lng };
                this.localisationData.latitude = cityCoords.lat;
                this.localisationData.longitude = cityCoords.lng;
                this.mapZoom = 12;
            }
        }
    }

    constructor(
        private apiService: ApiService,
        private cloudinaryService: CloudinaryService,
        private profileUpdateService: ProfileUpdateService
    ) {}

    generateYearOptions(): number[] {
        const years: number[] = [];
        for (let year = 2026; year >= 1950; year--) {
            years.push(year);
        }
        return years;
    }

    ngOnInit() {
        const storedUserName = localStorage.getItem('userName');
        this.currentUserName = storedUserName || 'Candidat';
        this.loadAvailableCompetences();
        this.loadCandidateData();
    }

    get displayProfilePictureUrl(): string {
        return this.profilePictureUrl || this.candidateData.profile_picture_url || this.candidateData.profilePictureUrl || this.defaultProfilePictureUrl;
    }

    loadCandidateData(): void {
        this.isLoading = true;
        const userEmail = this.resolveCurrentUserEmail();

        if (!userEmail) {
            this.errorMessage = 'Email utilisateur introuvable. Reconnectez-vous puis réessayez.';
            this.isLoading = false;
            return;
        }

        this.apiService.getCandidateByEmail(userEmail).subscribe({
            next: (data: any) => {
                if (data) {
                    this.candidateData = { ...this.candidateData, ...data };
                    this.candidateData.id = data.id || this.candidateData.id;
                    this.candidateData.email = data.email || userEmail;
                    this.candidateData.description = data.description || '';
                    this.profilePictureUrl = data.profile_picture_url || '';
                    this.cvUrl = data.cv_url || '';
                    this.currentUserName = data.nom || this.currentUserName;
                    this.contactData.prenom = data.prenom || '';
                    this.candidateData.telephone = data.telephone || '';
                    this.isContactInfoSaved = !!(data.prenom || data.telephone);
                    this.passionAndGoals = data.passionAndGoals || '';
                    this.isPassionSaved = !!this.passionAndGoals;
                    this.educationList = this.parseEducationString(data.niveauEtude);
                    this.backgroundList = this.parseBackgroundString(data.backgroundExpertise);

                    if (data.localisation_id) {
                        this.apiService.getLocalisation(data.localisation_id).subscribe({
                            next: (locData: any) => {
                                if (locData) {
                                    this.localisationData = { ...this.localisationData, ...locData };
                                    if (locData.latitude && locData.longitude) {
                                        this.mapCenter = { lat: locData.latitude, lng: locData.longitude };
                                        this.markerPosition = { lat: locData.latitude, lng: locData.longitude };
                                    }
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
                    return;
                }
                this.isLoading = false;
            },
            error: (err) => {
                if (err?.status === 404) {
                    const minimalCandidate = {
                        email: userEmail,
                        nom: this.currentUserName || userEmail.split('@')[0],
                        prenom: '',
                        description: '',
                        telephone: '',
                        cv: '',
                        lien_portfolio: '',
                        niveauEtude: '',
                        competences: []
                    };
                    this.apiService.createCandidate(minimalCandidate).subscribe({
                        next: (response: any) => {
                            if (response?.id) {
                                this.candidateData = { ...this.candidateData, ...response, email: userEmail };
                                this.currentUserName = response.nom || this.currentUserName;
                                this.isLoading = false;
                            }
                        },
                        error: (createErr) => {
                            this.errorMessage = createErr?.error?.message || 'Erreur lors de la création du profil candidat.';
                            this.isLoading = false;
                        }
                    });
                    return;
                }
                this.errorMessage = 'Erreur lors du chargement des données du candidat.';
                this.isLoading = false;
            }
        });
    }

    private resolveCurrentUserEmail(): string {
        const storedEmail = String(localStorage.getItem('userEmail') || '').trim();
        if (storedEmail.includes('@')) {
            return storedEmail;
        }

        const userName = String(localStorage.getItem('userName') || '').trim();
        if (userName.includes('@')) {
            return userName;
        }

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                const tokenEmail = String(decoded?.email || decoded?.sub || '').trim();
                if (tokenEmail.includes('@')) {
                    return tokenEmail;
                }
            } catch {
                // ignore invalid token
            }
        }
        return '';
    }

    loadAvailableCompetences(): void {
        this.apiService.getAllCompetences().subscribe({
            next: (data: any) => {
                if (Array.isArray(data)) {
                    this.availableCompetences = data;
                } else if (Array.isArray(data.data)) {
                    this.availableCompetences = data.data;
                }
            },
            error: (err) => {
                console.error('Error loading competences:', err);
                this.availableCompetences = [];
            }
        });
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
                    lien_portfolio: '',
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

    onProfilePictureSelected(event: any): void {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file: File = files[0];
            this.uploadProfilePictureToCloudinary(file);
        }
    }

    uploadProfilePictureToCloudinary(file: File): void {
        if (!file.type.startsWith('image/')) {
            this.errorMessage = 'Please select a valid image file';
            return;
        }
        const maxSize = 10 * 1024 * 1024;
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
                    this.saveProfilePictureUrl(response.secure_url);
                    this.successMessage = 'Profile picture uploaded successfully!';
                    setTimeout(() => this.successMessage = '', 3000);
                } else {
                    this.errorMessage = 'Upload response invalid. Missing secure_url.';
                }
            },
            error: (error: any) => {
                this.isUploadingProfilePicture = false;
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
            }
        });
    }

    onCVUploaded(event: any): void {
        if (event?.url) {
            this.cvUrl = event.url;
            this.saveCVUrl(event.url);
        }
    }

    saveProfilePictureUrl(url: string): void {
        this.ensureCandidateId(() => {
            if (!this.candidateData.id) {
                this.errorMessage = 'Candidate ID not found';
                return;
            }
            this.isSaving = true;
            this.apiService.updateCandidate(this.candidateData.id, { profile_picture_url: url }).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.profileUpdateService.notifyProfilePictureUpdate(url);
                    this.successMessage = 'Profile picture saved successfully!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Error saving profile picture: ${error.message || error.statusText}`;
                }
            });
        });
    }

    saveCVUrl(url: string): void {
        this.ensureCandidateId(() => {
            if (!this.candidateData.id) {
                this.errorMessage = 'Candidate ID not found';
                return;
            }
            this.isSaving = true;
            this.apiService.updateCandidate(this.candidateData.id, { cv_url: url }).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.successMessage = 'CV saved successfully!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Error saving CV: ${error.message || error.statusText}`;
                }
            });
        });
    }

    saveDescriptionOnly(): void {
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            const descriptionPayload = { description: this.candidateData.description || '' };
            this.apiService.updateCandidate(this.candidateData.id, descriptionPayload).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.isDescriptionSaved = true;
                    this.successMessage = 'Description sauvegardée avec succès!';
                    this.isEditingAbout = false;
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la sauvegarde de la description: ${error.message || error.statusText}`;
                }
            });
        });
    }

    savePassionAndGoals(): void {
        if (!this.isPassionValid()) {
            this.errorMessage = 'Veuillez renseigner vos passions et objectifs (max 200 caractères).';
            return;
        }
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            const passionPayload = { passionAndGoals: this.passionAndGoals || '' };
            this.apiService.updateCandidate(this.candidateData.id, passionPayload).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.isPassionSaved = true;
                    this.successMessage = 'Passions et objectifs sauvegardés avec succès!';
                    this.isEditingPassion = false;
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la sauvegarde des passions: ${error.message || error.statusText}`;
                }
            });
        });
    }

    deleteDescription(): void {
        if (!confirm('Êtes-vous sûr de vouloir supprimer votre description?')) {
            return;
        }
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            this.apiService.updateCandidate(this.candidateData.id, { description: '' }).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.isDescriptionSaved = false;
                    this.candidateData.description = '';
                    this.successMessage = 'Description supprimée avec succès!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la suppression de la description: ${error.message || error.statusText}`;
                }
            });
        });
    }

    deleteAllEducation(): void {
        if (!confirm('Êtes-vous sûr de vouloir supprimer toute votre éducation?')) {
            return;
        }
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            this.apiService.updateCandidate(this.candidateData.id, { niveauEtude: '' }).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.educationList = [{ niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' }];
                    this.successMessage = 'Éducation supprimée avec succès!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la suppression de l'éducation: ${error.message || error.statusText}`;
                }
            });
        });
    }

    deleteAllBackground(): void {
        if (!confirm('Êtes-vous sûr de vouloir supprimer tout votre historique professionnel?')) {
            return;
        }
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            this.apiService.updateCandidate(this.candidateData.id, { backgroundExpertise: '' }).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.backgroundList = [{ titre: '', company: '', startDate: '', endDate: '' }];
                    this.successMessage = 'Historique professionnel supprimé avec succès!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la suppression de l'historique professionnel: ${error.message || error.statusText}`;
                }
            });
        });
    }

    deletePassionAndGoals(): void {
        if (!confirm('Êtes-vous sûr de vouloir supprimer vos passions et objectifs futurs?')) {
            return;
        }
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            this.apiService.updateCandidate(this.candidateData.id, { passionAndGoals: '' }).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.isPassionSaved = false;
                    this.passionAndGoals = '';
                    this.successMessage = 'Passions et objectifs supprimés avec succès!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la suppression des passions: ${error.message || error.statusText}`;
                }
            });
        });
    }

    isDescriptionValid(): boolean {
        const value = (this.candidateData.description || '').trim();
        return value.length > 0 && value.length <= 1000;
    }

    onDescriptionChange(): void {
        if ((this.candidateData.description || '').length > 1000) {
            this.candidateData.description = (this.candidateData.description || '').substring(0, 1000);
        }
    }

    isPrenomValid(): boolean {
        const value = (this.contactData.prenom || '').trim();
        return value.length > 0 && value.length <= 20;
    }

    onPrenomChange(): void {
        if ((this.contactData.prenom || '').length > 20) {
            this.contactData.prenom = (this.contactData.prenom || '').substring(0, 20);
        }
        this.isContactInfoSaved = false;
    }

    isTelephoneValid(): boolean {
        const value = (this.candidateData.telephone || '').trim();
        if (value.length === 0) {
            return false;
        }
        const phoneRegex = /^[0-9+\-\s()]*$/;
        return phoneRegex.test(value);
    }

    onTelephoneChange(): void {
        if (this.candidateData.telephone) {
            this.candidateData.telephone = this.candidateData.telephone.replace(/[^0-9+\-\s()]/g, '');
        }
        this.isContactInfoSaved = false;
    }

    saveContactInfo(): void {
        if (!this.isPrenomValid()) {
            this.errorMessage = 'Le prénom ne doit pas dépasser 20 caractères.';
            return;
        }
        if (!this.isTelephoneValid()) {
            this.errorMessage = 'Le téléphone doit contenir uniquement des chiffres et caractères spéciaux (+, -, espaces).';
            return;
        }
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            const contactPayload = {
                prenom: this.contactData.prenom || '',
                telephone: this.candidateData.telephone || ''
            };
            this.apiService.updateCandidate(this.candidateData.id, contactPayload).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.isContactInfoSaved = true;
                    this.successMessage = 'Informations de contact sauvegardées avec succès!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la sauvegarde des informations: ${error.message || error.statusText}`;
                }
            });
        });
    }

    deleteContactInfo(): void {
        if (!confirm('Êtes-vous sûr de vouloir supprimer vos informations de contact?')) {
            return;
        }
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            const contactPayload = {
                prenom: '',
                telephone: ''
            };
            this.apiService.updateCandidate(this.candidateData.id, contactPayload).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.isContactInfoSaved = false;
                    this.contactData.prenom = '';
                    this.candidateData.telephone = '';
                    this.successMessage = 'Informations de contact supprimées avec succès!';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la suppression des informations: ${error.message || error.statusText}`;
                }
            });
        });
    }

    onPaysCityChange(): void {
        if (this.geocodeTimer) {
            clearTimeout(this.geocodeTimer);
        }
        this.geocodeTimer = setTimeout(() => {
            // Optional: place geocoding logic here if needed
        }, 500);
    }

    saveLocalisationInfo(): void {
        if (!this.candidateData.id) {
            this.errorMessage = 'Erreur: Candidat ID non trouvé. Veuillez d\'abord créer votre profil complet.';
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
        const localisationId = this.candidateData.localisation_id;
        const saveLocalisationObs = localisationId
            ? this.apiService.updateLocalisation(localisationId, localisationPayload)
            : this.apiService.createLocalisation(localisationPayload);
        saveLocalisationObs.subscribe({
            next: (response: any) => {
                if (!localisationId && response?.id) {
                    this.apiService.updateCandidate(this.candidateData.id, { localisation_id: response.id }).subscribe({
                        next: () => {
                            this.candidateData.localisation_id = response.id;
                            this.localisationData.id = response.id;
                            this.isSaving = false;
                            this.successMessage = 'Localisation sauvegardée avec succès!';
                            setTimeout(() => this.successMessage = '', 3000);
                        },
                        error: (error) => {
                            this.isSaving = false;
                            this.errorMessage = `Erreur: ${error.message || error.statusText}`;
                        }
                    });
                } else {
                    this.isSaving = false;
                    this.successMessage = 'Localisation sauvegardée avec succès!';
                    setTimeout(() => this.successMessage = '', 3000);
                }
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la sauvegarde de la localisation: ${error.message || error.statusText}`;
            }
        });
    }

    deleteLocalisationInfo(): void {
        const localisationId = this.candidateData.localisation_id;
        if (!localisationId) {
            this.errorMessage = 'Aucune localisation à supprimer.';
            return;
        }
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette localisation?')) {
            return;
        }
        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';
        this.apiService.deleteLocalisation(localisationId).subscribe({
            next: () => {
                this.apiService.updateCandidate(this.candidateData.id, { localisation_id: null }).subscribe({
                    next: () => {
                        this.candidateData.localisation_id = null;
                        this.localisationData = { id: null, latitude: '', longitude: '', pays: '', ville: '' };
                        this.markerPosition = null;
                        this.isSaving = false;
                        this.successMessage = 'Localisation supprimée avec succès!';
                        setTimeout(() => this.successMessage = '', 3000);
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
            }
        });
    }

    saveCandidateProfile(): void {
        if (!this.candidateData.id) {
            this.errorMessage = 'Candidat introuvable. Veuillez actualiser pour créer un profil.';
            return;
        }
        const payload: any = {
            description: this.candidateData.description || '',
            passionAndGoals: this.passionAndGoals || '',
            niveauEtude: this.serializeEducation(this.educationList),
            backgroundExpertise: this.serializeBackground(this.backgroundList),
            prenom: this.contactData.prenom || '',
            telephone: this.candidateData.telephone || ''
        };
        this.isSaving = true;
        this.errorMessage = '';
        this.successMessage = '';
        this.apiService.updateCandidate(this.candidateData.id, payload).subscribe({
            next: () => {
                this.isSaving = false;
                this.successMessage = 'Profil candidat sauvegardé avec succès!';
                this.isEditingEducation = false;
                this.isEditingBackground = false;
                setTimeout(() => this.successMessage = '', 3000);
            },
            error: (error) => {
                this.isSaving = false;
                this.errorMessage = `Erreur lors de la sauvegarde du profil: ${error.message || error.statusText}`;
            }
        });
    }

    private parseEducationString(niveauEtude: string): any[] {
        if (!niveauEtude) {
            return [{ niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' }];
        }
        if (niveauEtude.includes('niveau:')) {
            return niveauEtude.split(' ;; ').map((edu: string) => {
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
        }
        if (niveauEtude.includes(' / ')) {
            return niveauEtude.split(' ;; ').map((edu: string) => {
                const parts = edu.split(' / ');
                return {
                    niveauEtude: (parts[0] || '').trim(),
                    domain: (parts[1] || '').trim(),
                    institution: (parts[2] || '').trim(),
                    startDate: (parts[3] || '').trim().split('-')[0],
                    endDate: (parts[3] || '').trim().split('-')[1]
                };
            });
        }
        return [{ niveauEtude: niveauEtude, domain: '', institution: '', startDate: '', endDate: '' }];
    }

    private parseBackgroundString(backgroundExpertise: string): any[] {
        if (!backgroundExpertise) {
            return [{ titre: '', company: '', startDate: '', endDate: '' }];
        }
        if (backgroundExpertise.includes('titre:')) {
            return backgroundExpertise.split(' ;; ').map((bg: string) => {
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
        }
        if (backgroundExpertise.includes(' / ')) {
            return backgroundExpertise.split(' ;; ').map((bg: string) => {
                const parts = bg.split(' / ');
                return {
                    titre: (parts[0] || '').trim(),
                    company: (parts[1] || '').trim(),
                    startDate: (parts[2] || '').trim().split('-')[0],
                    endDate: (parts[2] || '').trim().split('-')[1]
                };
            });
        }
        return [{ titre: backgroundExpertise, company: '', startDate: '', endDate: '' }];
    }

    private serializeEducation(list: any[]): string {
        const entries = list
            .filter((edu) => edu.niveauEtude || edu.domain || edu.institution || edu.startDate || edu.endDate)
            .map((edu) => {
                return `niveau:${edu.niveauEtude || ''}, domaine:${edu.domain || ''}, institution:${edu.institution || ''}, debut:${edu.startDate || ''}, fin:${edu.endDate || ''}`;
            });
        return entries.join(' ;; ');
    }

    private serializeBackground(list: any[]): string {
        const entries = list
            .filter((bg) => bg.titre || bg.company || bg.startDate || bg.endDate)
            .map((bg) => {
                return `titre:${bg.titre || ''}, entreprise:${bg.company || ''}, debut:${bg.startDate || ''}, fin:${bg.endDate || ''}`;
            });
        return entries.join(' ;; ');
    }

    onEducationFieldChange(edu: any, field: string): void {
        if (field === 'niveauEtude' && (edu.niveauEtude || '').length > 20) {
            edu.niveauEtude = (edu.niveauEtude || '').substring(0, 20);
        } else if (field === 'domain' && (edu.domain || '').length > 20) {
            edu.domain = (edu.domain || '').substring(0, 20);
        } else if (field === 'institution' && (edu.institution || '').length > 20) {
            edu.institution = (edu.institution || '').substring(0, 20);
        }
    }

    onEducationYearChange(edu: any): void {
        if (edu.startDate) {
            edu.startDate = String(edu.startDate).replace(/[^0-9]/g, '');
        }
        if (edu.endDate) {
            edu.endDate = String(edu.endDate).replace(/[^0-9]/g, '');
        }
    }

    isEducationYearsValid(edu: any): boolean {
        if (!edu.startDate || !edu.endDate) {
            return true;
        }
        return Number(edu.endDate) >= Number(edu.startDate);
    }

    isEducationListValid(): boolean {
        return this.educationList.every((edu: any) => {
            const isEmpty = !edu.niveauEtude && !edu.domain && !edu.institution && !edu.startDate && !edu.endDate;
            if (isEmpty) {
                return true;
            }
            if (!edu.niveauEtude || edu.niveauEtude.trim().length === 0 || edu.niveauEtude.length > 20) {
                return false;
            }
            if (!edu.domain || edu.domain.trim().length === 0 || edu.domain.length > 20) {
                return false;
            }
            if (!edu.institution || edu.institution.trim().length === 0 || edu.institution.length > 20) {
                return false;
            }
            if (!edu.startDate || !edu.endDate) {
                return false;
            }
            return this.isEducationYearsValid(edu);
        });
    }

    getEducationValidationError(): string {
        for (let i = 0; i < this.educationList.length; i++) {
            const edu = this.educationList[i];
            const isEmpty = !edu.niveauEtude && !edu.domain && !edu.institution && !edu.startDate && !edu.endDate;
            if (isEmpty) {
                continue;
            }
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

    addEducation(): void {
        this.educationList.push({ niveauEtude: '', domain: '', institution: '', startDate: '', endDate: '' });
        this.isEducationFormSubmitted = false;
    }

    removeEducation(index: number): void {
        if (this.educationList.length > 1) {
            this.educationList.splice(index, 1);
        }
    }

    onBackgroundFieldChange(bg: any, field: string): void {
        if (field === 'titre' && (bg.titre || '').length > 20) {
            bg.titre = (bg.titre || '').substring(0, 20);
        } else if (field === 'company' && (bg.company || '').length > 20) {
            bg.company = (bg.company || '').substring(0, 20);
        }
    }

    onBackgroundYearChange(bg: any): void {
        if (bg.startDate) {
            bg.startDate = String(bg.startDate).replace(/[^0-9]/g, '');
        }
        if (bg.endDate) {
            bg.endDate = String(bg.endDate).replace(/[^0-9]/g, '');
        }
    }

    isBackgroundYearsValid(bg: any): boolean {
        if (!bg.startDate || !bg.endDate) {
            return true;
        }
        return Number(bg.endDate) >= Number(bg.startDate);
    }

    isBackgroundListValid(): boolean {
        return this.backgroundList.every((bg: any) => {
            const isEmpty = !bg.titre && !bg.company && !bg.startDate && !bg.endDate;
            if (isEmpty) {
                return true;
            }
            if (!bg.titre || bg.titre.trim().length === 0 || bg.titre.length > 30) {
                return false;
            }
            if (!bg.company || bg.company.trim().length === 0 || bg.company.length > 20) {
                return false;
            }
            if (!bg.startDate || !bg.endDate) {
                return false;
            }
            return this.isBackgroundYearsValid(bg);
        });
    }

    getBackgroundValidationError(): string {
        for (let i = 0; i < this.backgroundList.length; i++) {
            const bg = this.backgroundList[i];
            const isEmpty = !bg.titre && !bg.company && !bg.startDate && !bg.endDate;
            if (isEmpty) {
                continue;
            }
            if (!bg.titre || bg.titre.trim().length === 0) {
                return `Expérience ${i + 1}: Titre du Poste est requis`;
            }
            if (bg.titre.length > 30) {
                return `Expérience ${i + 1}: Titre du Poste dépasse 30 caractères`;
            }
            if (!bg.company || bg.company.trim().length === 0) {
                return `Expérience ${i + 1}: Entreprise est requis`;
            }
            if (bg.company.length > 20) {
                return `Expérience ${i + 1}: Entreprise dépasse 20 caractères`;
            }
            if (!bg.startDate) {
                return `Expérience ${i + 1}: Année de Début est requis`;
            }
            if (!bg.endDate) {
                return `Expérience ${i + 1}: Année de Fin est requis`;
            }
            if (!this.isBackgroundYearsValid(bg)) {
                return `Expérience ${i + 1}: L'année de fin doit être supérieure ou égale à l'année de début`;
            }
        }
        return '';
    }

    addBackground(): void {
        this.backgroundList.push({ titre: '', company: '', startDate: '', endDate: '' });
        this.isBackgroundFormSubmitted = false;
    }

    removeBackground(index: number): void {
        if (this.backgroundList.length > 1) {
            this.backgroundList.splice(index, 1);
        }
    }

    isPassionValid(): boolean {
        const value = (this.passionAndGoals || '').trim();
        return value.length > 0 && value.length <= 200;
    }

    onPassionChange(): void {
        if ((this.passionAndGoals || '').length > 200) {
            this.passionAndGoals = (this.passionAndGoals || '').substring(0, 200);
        }
    }

    saveCandidateProfileGeneric(): void {
        this.saveCandidateProfile();
    }

    onMapClick(event: any): void {
        const coords = event?.latLng;
        if (coords) {
            const lat = coords.lat();
            const lng = coords.lng();
            this.markerPosition = { lat, lng };
            this.localisationData.latitude = lat;
            this.localisationData.longitude = lng;
            this.mapCenter = { lat, lng };
        }
    }

    downloadCV(): void {
        if (this.cvUrl) {
            window.open(this.cvUrl, '_blank');
        }
    }

    addCompetence(): void {
        if (this.selectedCompetence && this.selectedCompetence.trim().length > 0) {
            if (!this.candidateData.competences) {
                this.candidateData.competences = [];
            }
            // Check if competence is not already added
            if (!this.candidateData.competences.includes(this.selectedCompetence.trim())) {
                this.candidateData.competences.push(this.selectedCompetence.trim());
            }
            this.selectedCompetence = '';
        }
    }

    removeCompetence(index: number): void {
        if (index >= 0 && index < this.candidateData.competences.length) {
            this.candidateData.competences.splice(index, 1);
        }
    }

    saveCompetences(): void {
        this.ensureCandidateId(() => {
            this.isSaving = true;
            this.errorMessage = '';
            this.successMessage = '';
            const competencesPayload = { competences: this.candidateData.competences || [] };
            this.apiService.updateCandidateCompetences(this.candidateData.id, competencesPayload).subscribe({
                next: () => {
                    this.isSaving = false;
                    this.successMessage = 'Compétences sauvegardées avec succès!';
                    this.isEditingCompetences = false;
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = `Erreur lors de la sauvegarde des compétences: ${error.message || error.statusText}`;
                }
            });
        });
    }
}


