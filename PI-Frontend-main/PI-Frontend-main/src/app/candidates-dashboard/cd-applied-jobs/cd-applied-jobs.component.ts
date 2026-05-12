import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../api.service';

@Component({
    selector: 'app-cd-applied-jobs',
    standalone: false,
    templateUrl: './cd-applied-jobs.component.html',
    styleUrls: ['./cd-applied-jobs.component.scss']
})
export class CdAppliedJobsComponent implements OnInit {

    candidatures: any[] = [];
    isLoading = true;
    errorMessage = '';
    
    showCreateModal = false;
    showEditModal = false;
    showViewModal = false;
    isCreating = false;
    isUpdating = false;
    
    editSelectedCVName: string = '';
    editSelectedLMName: string = '';
    editSkillInput: string = '';
    
    tauxReussite: number = 0;
    tempsReponse: number = 0;
    scoreEmployabilite: number = 0;
    
    candidaturesCeMois: number = 0;
    entretiensObtenus: number = 0;
    vuesRecruteurs: number = 0;
    
    newCandidature = {
        offreId: null as number | null,
        poste: '',
        entreprise: '',
        nomComplet: '',
        email: '',
        telephone: '',
        formations: [] as { diplome: string; institution: string; annee: string }[],
        newFormation: { diplome: '', institution: '', annee: '' },
        experiences: [] as { poste: string; entreprise: string; periode: string; description: string }[],
        newExperience: { poste: '', entreprise: '', periode: '', description: '' },
        competences: [] as string[],
        skillInput: '',
        cv: null as File | null,
        cvName: '',
        lettreMotivation: '',
        dateDisponibilite: '',
        preavis: '',
        acceptContact: false,
        acceptRGPD: false
    };
    
    editingCandidature: any = null;
    viewingCandidature: any = null;
    
    createErrors: any = {
        nomComplet: '',
        email: '',
        telephone: '',
        competences: '',
        cv: '',
        acceptRGPD: ''
    };
    
    touchedFields: any = {
        nomComplet: false,
        email: false,
        telephone: false,
        competences: false,
        cv: false,
        acceptRGPD: false
    };
    
    editErrors = {
        entreprise: '',
        poste: ''
    };
    
    stats = {
        total: 0,
        enAttente: 0,
        acceptees: 0,
        refusees: 0
    };
    
    alertes: any[] = [];
    isNewCandidate: boolean = false;
    
    message: string = '';
    messageType: string = '';
    
    showCVModal: boolean = false;
    showLettreModal: boolean = false;
    showAnalyseModal: boolean = false;
    
    cvUrl: string = '';
    cvName: string = '';
    cvDate: string = '';
    
    lettreData = {
        entreprise: '',
        poste: '',
        message: ''
    };
    lettreGeneree: string = '';
    
    scoreProfil: number = 0;
    profil = {
        competences: false,
        experience: false,
        cv: false
    };
    
    showViewer: boolean = false;
    conseils: string[] = [];
    
    newsletterEmail: string = '';
    isSubscribing: boolean = false;
    nombreCandidatsActifs: number = 12453;
    offresNouvelles: number = 347;
    
    searchEntreprise: string = '';
showArchives: boolean = false;
archivesCount: number = 0;


    // Fonctionnalités avancées - Variables
niveau: string = 'Débutant';
pointsTotal: number = 0;
niveauProgress: number = 0;
niveauSuivant: string = '';
pointsPourNiveauSuivant: number = 0;
badges: any[] = [];

matchScores: any[] = [];
radarData: any[] = [];
competencesUtilisateur: string[] = [];

tempsMoyenReponse: number = 8;
tauxReussiteCalcule: number = 0;
candidaturesParMois: any[] = [];

predictionData: any = null;

relancesData: any[] = [];

assistantMessages: { role: string; content: string }[] = [];
assistantInput: string = '';
isAssistantTyping: boolean = false;

timelineItems: any[] = [];

// Variables pour les modales avancées
showGamificationModal: boolean = false;
showSmartMatchModal: boolean = false;
showRadarModal: boolean = false;
showStatsModal: boolean = false;
showPredictionModal: boolean = false;
showRelancesModal: boolean = false;
showAssistantModal: boolean = false;
showTimelineModal: boolean = false;


// ==================== TAGS ====================
availableTags = ['Prioritaire', 'Remote', 'Startup', 'Stage', 'Tech', 'Finance', 'Urgent'];
candidatureTags: { [id: number]: string[] } = {};
activeTagFilter: string[] = [];
showTagMenu: number | null = null;

// ==================== NOTES ====================
candidatureNotes: { [id: number]: string } = {};
showNoteModal: number | null = null;
currentNote: string = '';

// ==================== RAPPELS ====================
rappels: any[] = [];

// ==================== DOUBLONS ====================
doublons: any[] = [];
showDoublonsModal: boolean = false;


navigateToDocuments(): void {
    this.showAssistantModal = false;
    this.router.navigate(['/candidates-dashboard/documents']);
}

@ViewChild('chatMessages') chatMessages!: ElementRef;

    constructor(private apiService: ApiService, private router: Router, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.loadData();
        this.handleLinkedOfferFormOpen();
    }

    private handleLinkedOfferFormOpen(): void {
        this.route.queryParamMap.subscribe((params) => {
            if (params.get('openForm') !== '1') {
                return;
            }

            const rawOffreId = Number(params.get('offreId'));
            const offreId = Number.isFinite(rawOffreId) && rawOffreId > 0 ? rawOffreId : null;
            const offreTitre = params.get('offreTitre') || '';
            const entreprise = params.get('entreprise') || '';

            this.openCreateModal({ offreId, offreTitre, entreprise });
        });
    }

    
   // ==================== VALIDATION ====================

validateEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

validateTelephone(telephone: string): boolean {
    // Accepte: +216 55 555 555 / +21655555555 / 55555555 / 55 555 555
    return /^(\+216[\s]?)?[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{3}$/.test(telephone.trim());
}

validateNomComplet(nom: string): string {
    if (!nom || nom.trim() === '')
        return 'Le nom complet est obligatoire';
    if (nom.trim().length < 2)
        return 'Le nom doit contenir au moins 2 caractères';
    if (nom.trim().length > 100)
        return 'Le nom ne peut pas dépasser 100 caractères';
    if (/\d/.test(nom))
        return 'Le nom ne doit pas contenir de chiffres';
    if (!/^[a-zA-ZÀ-ÿ\s'\-]+$/.test(nom.trim()))
        return 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes';
    if (/\s{2,}/.test(nom))
        return 'Le nom ne doit pas contenir plusieurs espaces consécutifs';
    const parts = nom.trim().split(/\s+/);
    if (parts.length < 2)
        return 'Veuillez entrer votre prénom et nom';
    return '';
}

validateField(field: string, value: any): void {
    switch (field) {
        case 'nomComplet':
            this.createErrors.nomComplet = this.validateNomComplet(value);
            break;

        case 'email':
            if (!value || value.trim() === '') {
                this.createErrors.email = "L'email est obligatoire";
            } else if (!this.validateEmail(value)) {
                this.createErrors.email = 'Format invalide — ex: prenom.nom@domaine.com';
            } else {
                this.createErrors.email = '';
            }
            break;

        case 'telephone':
            if (value && value.trim() !== '') {
                if (!this.validateTelephone(value)) {
                    this.createErrors.telephone =
                        'Format invalide — ex: +216 55 555 555 ou 55555555';
                } else {
                    this.createErrors.telephone = '';
                }
            } else {
                this.createErrors.telephone = '';
            }
            break;

        case 'competences':
            this.createErrors.competences =
                this.newCandidature.competences.length === 0
                    ? 'Ajoutez au moins une compétence'
                    : '';
            break;

        case 'cv':
            this.createErrors.cv =
                !this.newCandidature.cv && !this.cvUrl ? 'Le CV est obligatoire' : '';
            break;

        case 'acceptRGPD':
            this.createErrors.acceptRGPD = !value
                ? 'Vous devez accepter les conditions RGPD'
                : '';
            break;
    }
}

validateAllFields(): boolean {
    const errors: string[] = [];

    // Nom complet
    const nomError = this.validateNomComplet(this.newCandidature.nomComplet);
    this.createErrors.nomComplet = nomError;
    this.touchedFields.nomComplet = true;
    if (nomError) errors.push(nomError);

    // Email
    if (!this.newCandidature.email || this.newCandidature.email.trim() === '') {
        this.createErrors.email = "L'email est obligatoire";
        this.touchedFields.email = true;
        errors.push("L'email est obligatoire");
    } else if (!this.validateEmail(this.newCandidature.email)) {
        this.createErrors.email = 'Format email invalide — ex: prenom.nom@domaine.com';
        this.touchedFields.email = true;
        errors.push('Format email invalide');
    } else {
        this.createErrors.email = '';
    }

    // Téléphone (optionnel)
    if (this.newCandidature.telephone?.trim()) {
        if (!this.validateTelephone(this.newCandidature.telephone)) {
            this.createErrors.telephone =
                'Format invalide — ex: +216 55 555 555 ou 55555555';
            this.touchedFields.telephone = true;
            errors.push('Format téléphone invalide');
        } else {
            this.createErrors.telephone = '';
        }
    }

    // Compétences
    if (this.newCandidature.competences.length === 0) {
        this.createErrors.competences = 'Ajoutez au moins une compétence';
        this.touchedFields.competences = true;
        errors.push('Au moins une compétence requise');
    } else {
        this.createErrors.competences = '';
    }

    // CV
    if (!this.newCandidature.cv && !this.cvUrl) {
        this.createErrors.cv = 'Le CV est obligatoire';
        this.touchedFields.cv = true;
        errors.push('CV obligatoire');
    } else {
        this.createErrors.cv = '';
    }

    // RGPD
    if (!this.newCandidature.acceptRGPD) {
        this.createErrors.acceptRGPD = 'Vous devez accepter les conditions RGPD';
        this.touchedFields.acceptRGPD = true;
        errors.push('Acceptation RGPD obligatoire');
    } else {
        this.createErrors.acceptRGPD = '';
    }

    // Date de disponibilité
    if (this.newCandidature.dateDisponibilite) {
        const selected = new Date(this.newCandidature.dateDisponibilite);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) {
            errors.push('La date de disponibilité doit être dans le futur');
        }
    }

    if (errors.length > 0) {
        this.showProfessionalAlert(errors);
    }

    return errors.length === 0;
}

showProfessionalAlert(errors: string[]): void {
    // Créer un modal d'alerte personnalisé
    const modalHtml = `
        <div class="custom-alert-overlay" id="customAlertOverlay">
            <div class="custom-alert-modal">
                <div class="alert-header">
                    <div class="alert-icon">
                        <i class="ri-error-warning-line"></i>
                    </div>
                    <h3>Formulaire incomplet</h3>
                </div>
                <div class="alert-body">
                    <p>Veuillez corriger les erreurs suivantes :</p>
                    <ul class="error-list">
                        ${errors.map(error => `<li><i class="ri-close-circle-line"></i> ${error}</li>`).join('')}
                    </ul>
                </div>
                <div class="alert-footer">
                    <button class="btn-primary" onclick="document.getElementById('customAlertOverlay').remove()">
                        <i class="ri-check-line"></i> Compris
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Supprimer l'ancienne alerte si elle existe
    const existingAlert = document.getElementById('customAlertOverlay');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Ajouter la nouvelle alerte
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Ajouter les styles si pas déjà présents
    this.addAlertStyles();
    
    // Fermer au clic sur l'overlay
    setTimeout(() => {
        const overlay = document.getElementById('customAlertOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        }
    }, 100);
}

// Ajouter les styles CSS pour l'alerte
addAlertStyles(): void {
    if (document.getElementById('customAlertStyles')) return;
    
    const styles = `
        <style id="customAlertStyles">
            .custom-alert-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .custom-alert-modal {
                background: white;
                border-radius: 24px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                animation: slideUp 0.3s ease;
                overflow: hidden;
            }
            
            .alert-header {
                background: linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%);
                padding: 24px;
                text-align: center;
                color: white;
            }
            
            .alert-icon {
                width: 64px;
                height: 64px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
            }
            
            .alert-icon i {
                font-size: 32px;
            }
            
            .alert-header h3 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }
            
            .alert-body {
                padding: 24px;
            }
            
            .alert-body p {
                color: #374151;
                margin-bottom: 16px;
                font-weight: 500;
            }
            
            .error-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .error-list li {
                padding: 10px 12px;
                margin-bottom: 8px;
                background: #FEF2F2;
                border-left: 3px solid #EF4444;
                border-radius: 8px;
                color: #DC2626;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
            }
            
            .error-list li i {
                font-size: 18px;
            }
            
            .alert-footer {
                padding: 16px 24px 24px;
                border-top: 1px solid #E5E7EB;
            }
            
            .btn-primary {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(30px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

    markFieldTouched(field: string): void {
        this.touchedFields[field] = true;
    }

    showError(field: string): boolean {
        return this.touchedFields[field] && !!this.createErrors[field];
    }

    // ==================== GESTION FORMATION ====================
    addFormation(): void {
        if (this.newCandidature.newFormation.diplome && this.newCandidature.newFormation.institution) {
            this.newCandidature.formations.push({ ...this.newCandidature.newFormation });
            this.newCandidature.newFormation = { diplome: '', institution: '', annee: '' };
        }
    }

    removeFormation(index: number): void {
        this.newCandidature.formations.splice(index, 1);
    }

    // ==================== GESTION EXPÉRIENCE ====================
    addExperience(): void {
        if (this.newCandidature.newExperience.poste && this.newCandidature.newExperience.entreprise) {
            this.newCandidature.experiences.push({ ...this.newCandidature.newExperience });
            this.newCandidature.newExperience = { poste: '', entreprise: '', periode: '', description: '' };
        }
    }

    removeExperience(index: number): void {
        this.newCandidature.experiences.splice(index, 1);
    }

    // ==================== GESTION COMPÉTENCES ====================
    addSkill(): void {
        if (this.newCandidature.skillInput && this.newCandidature.skillInput.trim()) {
            const skill = this.newCandidature.skillInput.trim();
            if (!this.newCandidature.competences.includes(skill)) {
                this.newCandidature.competences.push(skill);
                this.newCandidature.skillInput = '';
                this.validateField('competences', null);
            } else {
                alert('Cette compétence est déjà ajoutée');
            }
        }
    }
    
    removeSkill(index: number): void {
        this.newCandidature.competences.splice(index, 1);
        this.validateField('competences', null);
    }
    
    // ==================== GESTION CV ====================
    onCVFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Le fichier ne doit pas dépasser 5 Mo');
                return;
            }
            this.newCandidature.cv = file;
            this.newCandidature.cvName = file.name;
            this.validateField('cv', null);
        }
    }
    
    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Le fichier ne doit pas dépasser 5 Mo');
                return;
            }
            this.editSelectedCVName = file.name;
        }
    }
    
    onLMFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Le fichier ne doit pas dépasser 5 Mo');
                return;
            }
            this.editSelectedLMName = file.name;
        }
    }
    
    onEditFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Le fichier ne doit pas dépasser 5 Mo');
                return;
            }
            this.editSelectedCVName = file.name;
        }
    }
    
    onEditLMFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Le fichier ne doit pas dépasser 5 Mo');
                return;
            }
            this.editSelectedLMName = file.name;
        }
    }

    // ==================== CHARGEMENT DES DONNÉES ====================
    
    loadData(): void {
    this.isLoading = true;
    
    this.apiService.getMesCandidatures().subscribe({
        next: (data) => {
            console.log('📊 Données reçues:', data);
            this.candidatures = Array.isArray(data) ? data : (data ? [data] : []);
            this.isLoading = false;
            this.calculateStats();
            this.calculerStatsPersonnelles();
            this.chargerAlertes();
             this.chargerPrediction();
            this.chargerDonneesLocales();
            this.calculerRappels();
            this.detecterDoublons();
            // ==================== AJOUTE CES APPELS ICI ====================
            this.chargerGamification();
            this.chargerSmartMatch();
            this.chargerRadar();
            this.chargerStatistiquesAvancees();
            this.chargerPrediction();
            this.chargerRelances();
            this.chargerTimeline();
                 //ARCHIVAGE

            this.archivesCount = this.getCandidaturesArchivees().length; // ← ajouter
            console.log('Toutes candidatures:', this.candidatures);
            console.log('Archive field sample:', this.candidatures[0]?.archive);
console.log('Archivées count:', this.candidatures.filter(c => c.archive == 1).length);
console.log('Archive values:', this.candidatures.map(c => ({ id: c.id, archive: c.archive })));
            // ===============================================================
        },
        error: (err) => {
            console.error('Erreur chargement:', err);
            this.errorMessage = 'Erreur de chargement';
            this.isLoading = false;
        }
    });

    this.apiService.getStatsCandidatures().subscribe({
        next: (data) => {
            if (data) this.stats = data;
        },
        error: () => {}
    });
}

    calculateStats(): void {
    this.apiService.getStatsCandidatures().subscribe({
        next: (data) => {
            if (data) {
                this.stats = data;
                this.candidaturesCeMois = data.candidaturesCeMois || 0;
                this.entretiensObtenus = data.entretiens || 0;
            }
        },
        error: () => {}
    });
}

    
    // ==================== CREATE ====================

openCreateModal(prefill?: { offreId?: number | null; offreTitre?: string; entreprise?: string }): void {
    this.newCandidature = {
        offreId: prefill?.offreId ?? null,
        poste: prefill?.offreTitre || '',
        entreprise: prefill?.entreprise || '',
        nomComplet: '',
        email: '',
        telephone: '',
        formations: [],
        newFormation: { diplome: '', institution: '', annee: '' },
        experiences: [],
        newExperience: { poste: '', entreprise: '', periode: '', description: '' },
        competences: [],
        skillInput: '',
        cv: null,
        cvName: '',
        lettreMotivation: '',
        dateDisponibilite: '',
        preavis: '',
        acceptContact: false,
        acceptRGPD: false
    };
    
    this.createErrors = { nomComplet: '', email: '', telephone: '', competences: '', cv: '', acceptRGPD: '' };
    this.touchedFields = { nomComplet: false, email: false, telephone: false, competences: false, cv: false, acceptRGPD: false };
    
    this.showCreateModal = true;
}

closeCreateModal(): void {
    this.showCreateModal = false;
}

// createCandidature

createCandidature(): void {
    // 1. Validation des champs
    this.markFieldTouched('nomComplet');
    this.markFieldTouched('competences');
    this.markFieldTouched('cv');
    this.markFieldTouched('acceptRGPD');
    if (this.newCandidature.email) this.markFieldTouched('email');
    if (this.newCandidature.telephone) this.markFieldTouched('telephone');
    
    if (!this.validateAllFields()) {
        const firstError = document.querySelector('.is-invalid');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    this.isCreating = true;
    

    
    const dataToSend = {
        offreId: this.newCandidature.offreId,
        poste: this.newCandidature.poste,
        entreprise: this.newCandidature.entreprise,
        nomComplet: this.newCandidature.nomComplet,
        email: this.newCandidature.email,
        telephone: this.newCandidature.telephone,
        formation: this.newCandidature.formations.map(f => 
            `${f.diplome} - ${f.institution}${f.annee ? ' (' + f.annee + ')' : ''}`
        ).join('\n'),
        experience: this.newCandidature.experiences.map(e => 
            `${e.poste} chez ${e.entreprise}${e.periode ? ' (' + e.periode + ')' : ''}\n${e.description}`
        ).join('\n\n'),
        competences: this.newCandidature.competences.join(', '),
        lettreMotivation: this.newCandidature.lettreMotivation,
        dateDisponibilite: this.newCandidature.dateDisponibilite,
        preavis: this.newCandidature.preavis,
        acceptContact: this.newCandidature.acceptContact,
        acceptRGPD: this.newCandidature.acceptRGPD
    };
    
    console.log('📤 Envoi candidature:', dataToSend);
    
    this.apiService.creerCandidature(dataToSend).subscribe({
        next: (response) => {
            console.log('✅ Succès:', response);
            this.closeCreateModal();
            this.loadData();
            this.isCreating = false;
            this.showMessage('✅ Candidature envoyée avec succès !', 'success');
        },
        error: (err) => {
            console.error('❌ Erreur:', err);
            console.error('Status:', err.status);
            console.error('Response body:', err.error);
            
            // Afficher le message d'erreur détaillé
            let errorMsg = 'Erreur lors de l\'envoi de la candidature';
            if (err.error && typeof err.error === 'object') {
                const errors = Object.values(err.error).join('\n');
                if (errors) errorMsg = errors;
            } else if (err.error && typeof err.error === 'string') {
                errorMsg = err.error;
            }
            
            this.showMessage(`❌ ${errorMsg}`, 'error');
            this.isCreating = false;
        }
    });
}

getPreavisLabel(preavis: string): string {
    switch(preavis) {
        case 'IMMEDIAT': return 'Immédiat';
        case '1_MOIS': return '1 mois';
        case '2_MOIS': return '2 mois';
        case '3_MOIS': return '3 mois';
        default: return preavis || 'Non spécifié';
    }
}

    // ==================== VISUALISATION ====================
    
    viewCandidature(candidature: any): void {
        this.viewingCandidature = { ...candidature };
        this.showViewModal = true;
    }

    closeViewModal(): void {
        this.showViewModal = false;
        this.viewingCandidature = null;
    }

    // ==================== UPDATE ====================

    openEditModal(candidature: any): void {
        console.log('📝 Ouverture modification pour:', candidature);
        
        this.editingCandidature = { 
            id: candidature.id,
            nomComplet: candidature.nomComplet || '',
            email: candidature.email || '',
            telephone: candidature.telephone || '',
            formation: candidature.formation || '',
            experience: candidature.experience || '',
            competences: candidature.competences || '',
            lettreMotivation: candidature.lettreMotivation || candidature.lettreGeneree || '',
            dateDisponibilite: candidature.dateDisponibilite || '',
            preavis: candidature.preavis || '',
            statut: candidature.statut || '',
            dateEnvoi: candidature.dateEnvoi || '',
            acceptContact: candidature.acceptContact || false,
            acceptRGPD: candidature.acceptRGPD || false
        };
        
        console.log('📝 Données chargées dans le modal:', this.editingCandidature);
        this.editSkillInput = '';
        this.showEditModal = true;
    }

    closeEditModal(): void {
        this.showEditModal = false;
        this.editingCandidature = null;
        this.editSkillInput = '';
    }

    getSkillsArray(competences: string): string[] {
        if (!competences) return [];
        return competences.split(',').map(s => s.trim()).filter(s => s);
    }

    addSkillToEdit(): void {
        if (this.editSkillInput && this.editSkillInput.trim()) {
            const currentSkills = this.getSkillsArray(this.editingCandidature.competences);
            const newSkill = this.editSkillInput.trim();
            
            if (!currentSkills.includes(newSkill)) {
                currentSkills.push(newSkill);
                this.editingCandidature.competences = currentSkills.join(', ');
                this.editSkillInput = '';
            } else {
                alert('Cette compétence est déjà ajoutée');
            }
        }
    }

    removeSkillFromEdit(index: number): void {
        const currentSkills = this.getSkillsArray(this.editingCandidature.competences);
        currentSkills.splice(index, 1);
        this.editingCandidature.competences = currentSkills.join(', ');
    }

    updateCandidature(): void {
        console.log('=== DÉBUT MODIFICATION ===');
        console.log('Données avant envoi:', JSON.stringify(this.editingCandidature, null, 2));
        
        if (!this.editingCandidature) {
            console.error('❌ editingCandidature est null');
            this.showMessage('❌ Aucune candidature à modifier', 'error');
            return;
        }
        
        if (!this.editingCandidature.id) {
            console.error('❌ ID manquant');
            this.showMessage('❌ ID de candidature manquant', 'error');
            return;
        }
        
        this.isUpdating = true;
        
        const dataToSend = {
            nomComplet: this.editingCandidature.nomComplet || '',
            email: this.editingCandidature.email || '',
            telephone: this.editingCandidature.telephone || '',
            formation: this.editingCandidature.formation || '',
            experience: this.editingCandidature.experience || '',
            competences: this.editingCandidature.competences || '',
            lettreMotivation: this.editingCandidature.lettreMotivation || '',
            dateDisponibilite: this.editingCandidature.dateDisponibilite || '',
            preavis: this.editingCandidature.preavis || '',
            acceptContact: this.editingCandidature.acceptContact || false,
            acceptRGPD: this.editingCandidature.acceptRGPD || false
        };
        
        console.log('📤 Données envoyées:', JSON.stringify(dataToSend, null, 2));
        
        this.apiService.modifierCandidature(this.editingCandidature.id, dataToSend).subscribe({
            next: (response) => {
                console.log('✅ Réponse succès:', response);
                this.showMessage('✅ Candidature modifiée avec succès !', 'success');
                this.loadData();
                this.closeEditModal();
                this.isUpdating = false;
            },
            error: (err) => {
                console.error('❌ Erreur détaillée:', err);
                console.error('Status:', err.status);
                console.error('Body:', err.error);
                this.showMessage('❌ Erreur lors de la modification: ' + (err.error?.message || err.message || 'Erreur inconnue'), 'error');
                this.isUpdating = false;
            }
        });
    }

    // ==================== DELETE ====================
    
    deleteCandidature(id: number): void {
        if (confirm('Voulez-vous vraiment supprimer cette candidature ?')) {
            this.apiService.supprimerCandidature(id).subscribe({
                next: () => {
                    this.loadData();
                    this.showMessage('✅ Candidature supprimée', 'success');
                },
                error: (err) => console.error('Erreur:', err)
            });
        }
    }

    // ==================== UTILITAIRES ====================
    
    formatDate(date: string): string {
        if (!date) return 'Non spécifiée';
        try {
            return new Date(date).toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch {
            return date;
        }
    }

    getStatusClass(statut: string): string {
        switch(statut) {
            case 'EN_ATTENTE': return 'pending';
            case 'ACCEPTEE': return 'accepted';
            case 'REFUSEE': return 'rejected';
            default: return '';
        }
    }

    getStatusLabel(statut: string): string {
        switch(statut) {
            case 'EN_ATTENTE': return 'En attente';
            case 'ACCEPTEE': return 'Acceptée';
            case 'REFUSEE': return 'Refusée';
            default: return statut;
        }
    }

    refresh(): void {
        console.log('🔄 Rafraîchissement manuel');
        this.loadData();
    }

    calculerStatsPersonnelles(): void {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        this.candidaturesCeMois = this.candidatures.filter(c => {
            const date = new Date(c.dateEnvoi);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;
        
        this.entretiensObtenus = this.candidatures.filter(c => c.statut === 'ENTRETIEN').length;
        this.vuesRecruteurs = Math.floor(Math.random() * 50) + 10;
    }

    chargerAlertes(): void {
    this.apiService.getAlertesCandidatures().subscribe({
        next: (data) => {
            this.alertes = data;
            this.isNewCandidate = this.alertes.some(a => a.action === 'offres');
        },
        error: () => {}
    });
}

    profilIncomplet(): boolean {
        return false;
    }

    actionAlerte(alerte: any): void {
        switch(alerte.action) {
            case 'relancer':
                alert('Conseils : Relancez les recruteurs par email après 2 semaines.');
                break;
            case 'entretien':
                alert('Préparez-vous : Renseignez-vous sur l\'entreprise.');
                break;
            case 'offres':
                this.router.navigate(['/candidates-dashboard/bookmarks']);
                break;
            case 'profil':
                this.router.navigate(['/candidates-dashboard/my-profile']);
                break;
            case 'cv':
                alert('Conseils : Mettez en avant vos réalisations quantifiables.');
                break;
        }
    }

    showMessage(msg: string, type: string): void {
        this.message = msg;
        this.messageType = type;
        setTimeout(() => {
            this.message = '';
        }, 3000);
    }

    openCVModal(): void {
        this.loadCVData();
        this.showCVModal = true;
    }

    closeCVModal(): void {
        this.showCVModal = false;
    }

    loadCVData(): void {
        this.cvUrl = localStorage.getItem('cvUrl') || '';
        this.cvName = localStorage.getItem('cvName') || '';
        this.cvDate = localStorage.getItem('cvDate') || new Date().toLocaleDateString();
    }

    openFileSelector(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx';
        input.onchange = (event: any) => this.handleFileSelect(event);
        input.click();
    }

    handleFileSelect(event: any): void {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Le fichier ne doit pas dépasser 5 Mo');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
            localStorage.setItem('cvUrl', e.target.result);
            localStorage.setItem('cvName', file.name);
            localStorage.setItem('cvDate', new Date().toLocaleDateString());
            this.loadCVData();
            this.showMessage('CV téléchargé avec succès !', 'success');
            this.closeCVModal();
            setTimeout(() => this.openCVModal(), 100);
        };
        reader.readAsDataURL(file);
    }

    telechargerCV(): void {
        if (this.cvUrl) {
            const link = document.createElement('a');
            link.href = this.cvUrl;
            link.download = this.cvName || 'mon-cv.pdf';
            link.click();
        }
    }

    uploadNewCV(): void {
        this.openFileSelector();
    }

    supprimerCV(): void {
        if (confirm('Voulez-vous vraiment supprimer votre CV ?')) {
            localStorage.removeItem('cvUrl');
            localStorage.removeItem('cvName');
            localStorage.removeItem('cvDate');
            this.loadCVData();
            this.showMessage('CV supprimé', 'success');
            this.closeCVModal();
            setTimeout(() => this.openCVModal(), 100);
        }
    }

    openLettreModal(): void {
        this.lettreData = { entreprise: '', poste: '', message: '' };
        this.lettreGeneree = '';
        this.showLettreModal = true;
    }

    closeLettreModal(): void {
        this.showLettreModal = false;
    }

    genererLettreFinal(): void {
        if (!this.lettreData.entreprise || !this.lettreData.poste) {
            alert('Veuillez renseigner l\'entreprise et le poste');
            return;
        }
        
        const date = new Date().toLocaleDateString('fr-FR');
        const nom = localStorage.getItem('userName') || 'Cher recruteur';
        
        this.lettreGeneree = `
${date}

Objet : Candidature pour le poste de ${this.lettreData.poste}

${nom},

Je me permets de vous adresser ma candidature pour le poste de ${this.lettreData.poste} au sein de votre entreprise ${this.lettreData.entreprise}.

${this.lettreData.message || 'Fort de mon expérience et de mes compétences, je suis convaincu de pouvoir contribuer activement au développement de vos projets.'}

Je me tiens à votre disposition pour un entretien.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${nom}
        `;
    }

    telechargerLettreGeneree(): void {
        if (this.lettreGeneree) {
            const blob = new Blob([this.lettreGeneree], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lettre_motivation_${this.lettreData.entreprise}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            this.showMessage('Lettre téléchargée !', 'success');
        }
    }

    openAnalyseModal(): void {
        this.analyserProfil();
        this.showAnalyseModal = true;
    }

    closeAnalyseModal(): void {
        this.showAnalyseModal = false;
    }

   analyserProfil(): void {
    this.apiService.getAnalyseProfil().subscribe({
        next: (data) => {
            this.scoreProfil = data.scoreProfil;
            this.conseils = data.conseils;
            this.profil = {
                competences: data.profilCompetences,
                experience: data.profilExperience,
                cv: data.profilCV
            };
        },
        error: () => {}
    });
}

    allerCompleterProfil(): void {
        this.closeAnalyseModal();
        this.router.navigate(['/candidates-dashboard/my-profile']);
    }

    toggleViewer(): void {
        this.showViewer = !this.showViewer;
    }

    isPdf(): boolean {
        return this.cvName?.toLowerCase().endsWith('.pdf');
    }

    getSafeUrl(url: string): string {
        return url;
    }

    openInNewTab(): void {
        if (this.cvUrl) {
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head><title>${this.cvName || 'CV'}</title></head>
                        <body><embed src="${this.cvUrl}" type="application/pdf" width="100%" height="100%"></body>
                    </html>
                `);
            }
        }
    }

    getFileSize(): string {
        if (!this.cvUrl) return '0 KB';
        const sizeInBytes = Math.ceil((this.cvUrl.length * 3) / 4);
        if (sizeInBytes < 1024) return sizeInBytes + ' octets';
        if (sizeInBytes < 1024 * 1024) return Math.round(sizeInBytes / 1024) + ' KB';
        return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    subscribeNewsletter(): void {
        if (!this.newsletterEmail) {
            alert('Veuillez entrer votre email');
            return;
        }
        
        if (!this.newsletterEmail.includes('@')) {
            alert('Email invalide');
            return;
        }
        
        this.isSubscribing = true;
        this.apiService.subscribeNewsletter(this.newsletterEmail).subscribe({
            next: () => {
                alert('✅ Inscription réussie !');
                this.newsletterEmail = '';
                this.isSubscribing = false;
            },
            error: () => {
                alert('Une erreur est survenue');
                this.isSubscribing = false;
            }
        });
    }
    



// 1. GAMIFICATION
ouvrirGamification(): void {
    this.chargerGamification();
    this.showGamificationModal = true;
}

chargerGamification(): void {
    this.apiService.getGamification().subscribe({
        next: (data: any) => {
            this.niveau = data.niveau;
            this.pointsTotal = data.points;
            this.niveauProgress = data.niveauProgress;
            this.niveauSuivant = data.niveauSuivant;
            this.pointsPourNiveauSuivant = data.pointsPourNiveauSuivant;
            this.badges = data.badges;
        },
        error: (err) => console.error('Erreur chargement gamification:', err)
    });
}

// 2. SMART MATCH
ouvrirSmartMatch(): void {
    this.chargerSmartMatch();
    this.showSmartMatchModal = true;
}

chargerSmartMatch(): void {
    this.apiService.getSmartMatch().subscribe({
        next: (data: any) => {
            this.matchScores = data.map((item: any) => ({
                offre: {
                    titre: item.titrOffre,
                    entreprise: item.entreprise,
                    location: item.localisation
                },
                score: item.score,
                label: item.label,
                couleur: item.score >= 70 ? '#10b981' : item.score >= 40 ? '#f59e0b' : '#ef4444'
            }));
        },
        error: (err) => console.error('Erreur chargement smart match:', err)
    });
}

getTouteMesCompetences(): string[] {
    const competencesSet = new Set<string>();
    this.candidatures.forEach(c => {
        if (c.competences) {
            c.competences.split(',').forEach((skill: string) => {
                competencesSet.add(skill.trim());
            });
        }
    });
    return Array.from(competencesSet);
}

// 3. RADAR COMPÉTENCES
ouvrirRadar(): void {
    this.chargerRadar();
    this.showRadarModal = true;
}

chargerRadar(): void {
    this.apiService.getRadarCompetences().subscribe({
        next: (data: any) => {
            this.radarData = data.radarData;
            this.competencesUtilisateur = data.competences || [];
        },
        error: (err) => console.error('Erreur chargement radar:', err)
    });
}

// 4. STATISTIQUES
ouvrirStatistiques(): void {
    this.chargerStatistiquesAvancees();
    this.showStatsModal = true;
}

chargerStatistiquesAvancees(): void {
    // Taux de réussite
    this.apiService.getTauxReussite().subscribe({
        next: (data: any) => {
            this.tauxReussiteCalcule = data.tauxReussite;
        },
        error: (err) => console.error('Erreur taux réussite:', err)
    });

    // Statistiques par mois
    this.apiService.getStatsParMois().subscribe({
        next: (data: any) => {
            this.candidaturesParMois = data;
        },
        error: (err) => console.error('Erreur stats mois:', err)
    });

    // Calcul du temps moyen de réponse (simulé)
    this.calculerTempsMoyenReponse();
}

calculerTempsMoyenReponse(): void {
    const candidaturesAvecReponse = this.candidatures.filter(c => 
        c.statut === 'ACCEPTEE' || c.statut === 'REFUSEE'
    );
    if (candidaturesAvecReponse.length > 0) {
        // Simulation - à adapter selon vos données réelles
        this.tempsMoyenReponse = Math.floor(Math.random() * 15) + 5;
    }
}

// 5. PRÉDICTION IA
ouvrirPrediction(): void {
    this.chargerPrediction();
    this.showPredictionModal = true;
}

chargerPrediction(): void {
    // 1. Récupérer le contenu du CV
    const cvContent = this.getCvContentForChat();
    
    // 2. Préparer l'historique des candidatures
    const historique = this.candidatures.map(c => ({
        statut: c.statut,
        dateEnvoi: c.dateEnvoi,
        poste: c.poste || c.offreTitre,
        entreprise: c.entreprise
    }));
    
    // 3. Appeler l'API ML avec les données
    this.apiService.getPredictionSucces(cvContent, historique).subscribe({
        next: (data: any) => {
            this.predictionData = {
                probabilite: data.probabilite,
                meilleurMoment: data.meilleurMoment,
                pointsForts: data.pointsForts,
                pointsAmeliorer: data.pointsAmeliorer,
                conseilsSpecifiques: data.conseilsSpecifiques || [],
                couleur: data.couleur || (data.probabilite >= 70 ? '#10b981' : data.probabilite >= 40 ? '#f59e0b' : '#ef4444')
            };
        },
        error: (err) => {
            console.error('Erreur chargement prédiction:', err);
            // Fallback en cas d'erreur
            this.predictionData = {
                probabilite: 25,
                meilleurMoment: "Créez d'abord votre CV et postulez à des offres",
                pointsForts: ["Commencez votre recherche"],
                pointsAmeliorer: ["Créez votre CV", "Ajoutez vos compétences", "Postulez à des offres"],
                conseilsSpecifiques: ["Créez votre CV dans Mes Documents"],
                couleur: '#ef4444'
            };
        }
    });
}

// 6. RELANCES
ouvrirRelances(): void {
    this.chargerRelances();
    this.showRelancesModal = true;
}

chargerRelances(): void {
    this.apiService.getRelances().subscribe({
        next: (data: any) => {
            this.relancesData = data;
        },
        error: (err) => console.error('Erreur chargement relances:', err)
    });
}

copierRelance(message: string): void {
    navigator.clipboard.writeText(message).then(() => {
        this.showMessage('Message copié dans le presse-papier !', 'success');
    });
}

// 7. ASSISTANT IA
ouvrirAssistant(): void {
    this.assistantMessages = [
        { 
            role: 'assistant', 
            content: `<div style="font-family: inherit; line-height: 1.6;">
                <strong>✨ Salut ! Moi c'est CareerBot, votre assistant carrière intelligent ! 🚀</strong><br><br>
                Je suis là pour booster votre recherche d'emploi. Voici ce que je peux faire :<br><br>
                
                <strong>🎯 Carrière & Stratégie</strong><br>
                • Analyser votre profil et vous donner un score<br>
                • Identifier vos points forts et axes d'amélioration<br>
                • Stratégie de recherche d'emploi personnalisée<br><br>
                
                <strong>📄 Documents professionnels</strong><br>
                • Générer un CV professionnel<br>
                • Rédiger une lettre de motivation percutante<br>
                • Créer votre portfolio<br><br>
                
                <strong>🎤 Préparation entretien</strong><br>
                • Questions fréquentes par métier<br>
                • Technique STAR expliquée<br>
                • Conseils de présentation<br><br>
                
                <strong>💡 Conseil du jour :</strong> Les candidats qui personnalisent leur CV pour chaque offre ont <strong>3x plus de chances</strong> d'être rappelés !<br><br>
                
                Alors, par où on commence ? 😊
            </div>`
        }
    ];
    this.assistantInput = '';
    this.showAssistantModal = true;
    setTimeout(() => this.scrollChatToBottom(), 100);
}

envoyerMessageAssistant(): void {
    if (!this.assistantInput.trim()) return;

    const userMessage = this.assistantInput.trim();
    this.assistantMessages.push({ role: 'user', content: userMessage });
    this.assistantInput = '';
    this.isAssistantTyping = true;
    this.scrollChatToBottom();

    // Détection des documents (optionnelle, maintenant gérée par le ML)
    if (this.detecterIntentionDocument(userMessage)) {
        this.isAssistantTyping = false;
        this.scrollChatToBottom();
        return;
    }

    // Appel au ML
    const cvContent = this.getCvContentForChat();
    
    this.apiService.chatWithML(userMessage, cvContent).subscribe({
        next: (data) => {
            // La réponse HTML du ML
            this.assistantMessages.push({
                role: 'assistant',
                content: data.response  // ← Contient le HTML avec le lien
            });
            this.isAssistantTyping = false;
            this.scrollChatToBottom();
        },
        error: (err) => {
            console.error('❌ Erreur ML:', err);
            // Fallback uniquement si ML indisponible
            const reponse = this.genererReponseAssistant(userMessage);
            this.assistantMessages.push({
                role: 'assistant',
                content: reponse
            });
            this.isAssistantTyping = false;
            this.scrollChatToBottom();
        }
    });
}


// ✅ Détecte les intentions liées aux documents
detecterIntentionDocument(message: string): boolean {
    const msg = message.toLowerCase();

    const motsClesCV = [
    'générer cv', 'generer cv', 'créer cv', 'creer cv',
    'faire un cv', 'nouveau cv', 'créer mon cv', 'creer mon cv',
    'générer mon cv', 'generer mon cv', 'cv professionnel',
    'faire mon cv', 'construire cv', 'rédiger cv', 'rediger cv',
    'gérer cv', 'gerer cv',        
    'créer un cv', 'creer un cv', 
    'mon cv', 'faire cv'           
];

    const motsClesLettre = [
        'lettre de motivation', 'lettre motivation',
        'générer lettre', 'generer lettre', 'créer lettre', 'creer lettre',
        'faire une lettre', 'rédiger lettre', 'rediger lettre',
        'lettre candidature', 'motivation letter'
    ];

    const motsClesPortfolio = [
        'portfolio', 'générer portfolio', 'generer portfolio',
        'créer portfolio', 'creer portfolio', 'faire portfolio'
    ];

    const motsClesDocument = [
        'générer document', 'generer document', 'créer document',
        'creer document', 'nouveau document', 'mes documents'
    ];

    const estCV = motsClesCV.some(mot => msg.includes(mot));
    const estLettre = motsClesLettre.some(mot => msg.includes(mot));
    const estPortfolio = motsClesPortfolio.some(mot => msg.includes(mot));
    const estDocument = motsClesDocument.some(mot => msg.includes(mot));


    
    // Si l'utilisateur parle de CV
      if (estCV) {
        this.assistantMessages.push({
            role: 'assistant',
            content: `<div style="font-family: inherit;">
                <strong>📄 Gestion de votre CV</strong><br><br>
                Voici où vous pouvez gérer votre CV :<br><br>
                <a href="/candidates-dashboard/documents" 
                   style="color: #6366F1; text-decoration: underline; cursor: pointer;">
                   🔗 Accéder à Mes Documents
                </a><br><br>
                <strong>Dans cette section, vous pourrez :</strong><br>
                • 📝 Créer et modifier votre CV professionnel<br>
                • 📤 Télécharger votre CV au format PDF<br>
                • 👁️ Visualiser votre CV<br>
                • 🔄 Mettre à jour vos informations<br><br>
                ✨ <strong>Conseil :</strong> Un CV bien structuré augmente vos chances d'être contacté de 40% !
            </div>`
        });
        
        // Gérer la navigation avec Router
        setTimeout(() => {
            const link = document.querySelector('.chat-messages a');
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAssistantModal = false;
                    this.router.navigate(['/candidates-dashboard/documents']);
                });
            }
        }, 100);
        
        setTimeout(() => this.scrollChatToBottom(), 100);
        return true;
    }
    
    return false;


    // Si l'utilisateur parle de lettre de motivation
    if (estLettre) {
        this.assistantMessages.push({
            role: 'assistant',
            content: `✉️ **Gestion de vos lettres de motivation**\n\nVoici où vous pouvez gérer vos lettres :\n\n🔗 **[Accéder à Mes Documents →](/candidates-dashboard/documents)**\n\nDans cette section, vous pourrez :\n• ✨ Générer une lettre personnalisée avec l'IA\n• 🏢 Adapter votre lettre à chaque entreprise\n• 📥 Télécharger vos lettres au format PDF\n• 📝 Créer plusieurs versions différentes\n\n💡 **Astuce :** Personnalisez chaque lettre pour multiplier vos chances par 3 !`
        });
        setTimeout(() => this.scrollChatToBottom(), 100);
        return true;
    }

    // Si l'utilisateur parle de portfolio
    if (estPortfolio) {
        this.assistantMessages.push({
            role: 'assistant',
            content: `🗂️ **Gestion de votre Portfolio**\n\nVoici où vous pouvez gérer votre portfolio :\n\n🔗 **[Accéder à Mes Documents →](/candidates-dashboard/documents)**\n\nDans cette section, vous pourrez :\n• 🚀 Présenter vos meilleurs projets\n• 🛠️ Lister vos compétences et technologies\n• 🔗 Ajouter des liens vers vos réalisations\n• 📸 Intégrer des captures d'écran\n\n🎯 **Pro-tip :** Un portfolio bien présenté double vos chances en design/tech !`
        });
        setTimeout(() => this.scrollChatToBottom(), 100);
        return true;
    }

    // Si l'utilisateur parle de documents en général
    if (estDocument) {
        this.assistantMessages.push({
            role: 'assistant',
            content: `📁 **Gestion de vos documents**\n\nVoici votre espace documentaire :\n\n🔗 **[Accéder à Mes Documents →](/candidates-dashboard/documents)**\n\nVous y trouverez :\n• 📄 **CV professionnel** - Créez et gérez votre CV\n• ✉️ **Lettres de motivation** - Générez avec l'IA\n• 🗂️ **Portfolio** - Présentez vos projets\n• 📝 **Autres documents** - Certificats, diplômes\n\n✨ **À découvrir :** L'IA peut vous aider à créer des documents percutants !`
        });
        setTimeout(() => this.scrollChatToBottom(), 100);
        return true;
    }

    return false;
}

// ✅ Nouvelle méthode pour récupérer le CV
getCvContentForChat(): string {
    // Chercher dans les candidatures si un CV HTML est disponible
    if (this.candidatures && this.candidatures.length > 0) {
        const candidatureAvecCV = this.candidatures.find(c => c.document?.contenu);
        if (candidatureAvecCV?.document?.contenu) {
            return candidatureAvecCV.document.contenu;
        }
    }
    // Fallback : CV en localStorage
    return localStorage.getItem('cvUrl') || '';
}

genererReponseAssistant(message: string): string {
    const msg = message.toLowerCase();

    if (this.detecterIntentionDocument(message)) {
        return '';
    }


    
//BONJOUR
    if (msg.includes('bonjour') || msg.includes('salut') || 
        msg.includes('hello') || msg.includes('hey') || msg.includes('coucou')) {
        const heures = new Date().getHours();
        const salutation = heures < 12 ? 'Bonne matinée' : heures < 18 ? 'Bon après-midi' : 'Bonne soirée';
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>${salutation} !</strong> Je suis CareerBot, votre assistant carrière. Que puis-je faire pour vous ?<br><br>
            <strong>📄 Générer un CV ou une lettre de motivation</strong><br>
            <strong>🎤 Préparer un entretien</strong><br>
            <strong>💰 Négocier un salaire</strong><br>
            <strong>📚 Trouver des formations</strong><br>
            <strong>🔍 Stratégie de recherche d'emploi</strong>
        </div>`;
    }

    // CV CONSEILS
    if (msg.includes('cv') || msg.includes('curriculum')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>📄 Votre CV, c'est votre carte de visite !</strong><br><br>
            
            <strong>🔥 Structure gagnante :</strong>
            <ul>
                <li>Titre accrocheur en haut</li>
                <li>Résumé professionnel de 3 lignes</li>
                <li>Expériences en ordre anti-chronologique</li>
                <li>Compétences bien organisées</li>
            </ul>
            
            <strong>⚡ Erreurs fatales à éviter :</strong>
            <ul>
                <li>Photo non professionnelle</li>
                <li>Fautes d'orthographe</li>
                <li>CV générique non adapté à l'offre</li>
            </ul>
            
            <strong>🎯 Secret :</strong> Un recruteur passe 6 secondes sur un CV !<br><br>
            
            💡 <strong>Tapez "générer cv" pour créer le vôtre !</strong>
        </div>`;
    }

    // ENTRETIEN
    if (msg.includes('entretien') || msg.includes('interview') || msg.includes('recruteur')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>🎤 Mode préparation entretien active !</strong> 💪<br><br>
            
            <strong>📌 Règle des 3P :</strong> Préparer, Pratiquer, Performer !<br><br>
            
            <hr style="margin: 10px 0; border-color: #e5e7eb;">
            
            <strong>📚 Avant l'entretien :</strong>
            <ul>
                <li>Googlez l'entreprise + lisez leurs dernières actus</li>
                <li>Préparez 5 exemples avec la méthode STAR</li>
                <li>Dormez bien la veille !</li>
            </ul>
            
            <hr style="margin: 10px 0; border-color: #e5e7eb;">
            
            <strong>🎯 Méthode STAR :</strong>
            <ul>
                <li><strong>S</strong>ituation : contexte</li>
                <li><strong>T</strong>âche : votre rôle</li>
                <li><strong>A</strong>ction : ce que vous avez fait</li>
                <li><strong>R</strong>ésultat : impact chiffré</li>
            </ul>
            
            <hr style="margin: 10px 0; border-color: #e5e7eb;">
            
            <strong>💬 Questions pièges :</strong>
            <ul>
                <li>"Parlez-moi de vous" → 2 min, parcours + valeur</li>
                <li>"Votre défaut ?" → vrai défaut + comment vous le gérez</li>
            </ul>
            
            <hr style="margin: 10px 0; border-color: #e5e7eb;">
            
            <strong>🤫 Secret :</strong> Posez des questions à la fin !
        </div>`;
    }

    // LETTRE
    if (msg.includes('lettre') || msg.includes('motivation') || msg.includes('cover')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>✉️ La lettre qui fait la différence !</strong><br><br>
            
            80% des lettres sont ennuyeuses. Soyez dans les 20% ! 🌟<br><br>
            
            <strong>📝 Structure (max 1 page) :</strong>
            <ul>
                <li><strong>Accroche :</strong> pas "Je me permets de..."<br>
                Tentez : "Votre offre a retenu mon attention car..."</li>
                <li><strong>Votre valeur :</strong> compétences + réalisation chiffrée</li>
                <li><strong>Pourquoi EUX :</strong> montrez que vous connaissez l'entreprise</li>
                <li><strong>Call to action :</strong> invitation à l'entretien</li>
            </ul>
            
            <strong>⚠️ À bannir :</strong> "Je suis motivé et dynamique"<br>
            <strong>✅ Ce qui marche :</strong> "J'ai augmenté les ventes de 30%"<br><br>
            
            💡 <strong>Tapez "générer lettre" pour créer la vôtre !</strong>
        </div>`;
    }

    // SALAIRE
    if (msg.includes('salaire') || msg.includes('remuneration') || 
        msg.includes('negocier') || msg.includes('paye')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>💰 Négociation salariale</strong> — Ne laissez pas d'argent sur la table !<br><br>
            
            <strong>🎯 Règle d'or :</strong> Ne donnez jamais un chiffre en premier !<br><br>
            
            <strong>📊 Préparation :</strong>
            <ul>
                <li>Consultez Glassdoor, LinkedIn Salary, Indeed</li>
                <li>Calculez votre valeur sur le marché</li>
                <li>Visez 10-20% au-dessus de votre cible</li>
            </ul>
            
            <strong>💬 Script qui fonctionne :</strong><br>
            "Je suis ouvert à discuter. Quelle est la fourchette prévue ?"<br><br>
            
            <strong>🎁 N'oubliez pas le package complet :</strong><br>
            Télétravail • Formation • RTT • Tickets resto<br><br>
            
            💡 <strong>Fun fact :</strong> 70% des employeurs s'attendent à une négociation !
        </div>`;
    }

    // FORMATION
    if (msg.includes('formation') || msg.includes('apprendre') || 
        msg.includes('cours') || msg.includes('certification') || msg.includes('competence')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>📚 Boostez vos compétences, boostez votre carrière !</strong><br><br>
            
            <strong>🔥 Compétences les plus recherchées en 2024 :</strong>
            <ul>
                <li>Intelligence Artificielle & Prompt Engineering</li>
                <li>Data Analysis (Excel, Python, Power BI)</li>
                <li>Cloud (AWS, Azure, GCP)</li>
                <li>Cybersécurité</li>
                <li>Langues (Anglais B2+ = +20% de salaire !)</li>
            </ul>
            
            <strong>🆓 Plateformes gratuites :</strong>
            <ul>
                <li>YouTube, Coursera (audit gratuit), freeCodeCamp</li>
            </ul>
            
            <strong>💳 Investissement utile :</strong>
            <ul>
                <li>Udemy (soldes à 9,99€), OpenClassrooms, LinkedIn Learning</li>
            </ul>
            
            <strong>⏱️ Règle :</strong> 30 min/jour = une compétence solide en 1 an !
        </div>`;
    }

    // RECONVERSION
    if (msg.includes('reconversion') || msg.includes('changer') || 
        msg.includes('nouveau metier') || msg.includes('orientation')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>🔄 Reconversion</strong> — Le courage de changer, c'est 50% du chemin !<br><br>
            
            60% des professionnels envisagent une reconversion. Vous n'êtes pas seul(e) !<br><br>
            
            <strong>🗺️ Roadmap en 5 étapes :</strong>
            <ul>
                <li>Bilan de compétences : ce que vous aimez / savez faire</li>
                <li>Ciblez votre domaine : rencontrez des pros sur LinkedIn</li>
                <li>Formez-vous : bootcamp (3-6 mois) ou formation longue</li>
                <li>Construisez un portfolio : projets personnels</li>
                <li>Réseautage actif : événements sectoriels</li>
            </ul>
            
            <strong>🔥 Secteurs qui recrutent sans expérience :</strong><br>
            Dev Web • Data • Cybersécurité • UX Design • Marketing Digital<br><br>
            
            Vers quel domaine souhaitez-vous vous orienter ?
        </div>`;
    }

    // EMPLOI / RECHERCHE
    if (msg.includes('emploi') || msg.includes('travail') || msg.includes('job') || 
        msg.includes('offre') || msg.includes('trouver') || msg.includes('cherche')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>🔍 Stratégie de recherche d'emploi</strong> — Travaillez malin !<br><br>
            
            <strong>📊 La réalité du marché :</strong>
            <ul>
                <li>70-80% des emplois ne sont jamais publiés !</li>
                <li>Le réseau représente 60% des recrutements</li>
            </ul>
            
            <strong>🎯 Stratégie multicanal :</strong>
            <ul>
                <li><strong>20%</strong> Plateformes : LinkedIn, Indeed, Welcome to the Jungle</li>
                <li><strong>50%</strong> Réseau : 5 connexions/jour dans votre secteur ⭐</li>
                <li><strong>30%</strong> Candidatures spontanées : email personnalisé</li>
            </ul>
            
            <strong>⚡ Hack :</strong> Candidatez le mardi ou mercredi matin.<br>
            Les recruteurs sont plus réactifs ces jours-là !<br><br>
            
            Besoin d'aide pour optimiser votre profil LinkedIn ?
        </div>`;
    }

    // STRESS / MOTIVATION
    if (msg.includes('stress') || msg.includes('anxieux') || msg.includes('peur') || 
        msg.includes('decourage') || msg.includes('difficile')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>💪 La recherche d'emploi, c'est un marathon, pas un sprint !</strong><br><br>
            
            Ce que vous ressentez est totalement normal. 🫂<br><br>
            
            <strong>🌟 Vérités réconfortantes :</strong>
            <ul>
                <li>La moyenne de recherche est de 3-6 mois</li>
                <li>Un refus n'est pas un jugement sur vous</li>
                <li>Les recruteurs cherchent du potentiel, pas la perfection</li>
            </ul>
            
            <strong>⚡ Technique des petites victoires :</strong>
            <ul>
                <li>1 candidature + 1 contact LinkedIn + 1 article lu par jour</li>
            </ul>
            
            <strong>🎯 Citation :</strong> "Le succès, c'est tomber 7 fois et se relever 8."<br><br>
            
            Je suis là pour vous aider à chaque étape. On attaque quoi ensemble ? 💪
        </div>`;
    }

    // LINKEDIN
    if (msg.includes('linkedin') || msg.includes('reseau') || msg.includes('profil')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>💼 LinkedIn</strong> — Votre vitrine professionnelle 24h/24 !<br><br>
            
            <strong>📊 Saviez-vous que :</strong>
            <ul>
                <li>87% des recruteurs utilisent LinkedIn</li>
                <li>Un profil complet reçoit 40x plus d'opportunités</li>
            </ul>
            
            <strong>🔑 Les 7 éléments d'un profil qui attire :</strong>
            <ul>
                <li>Photo pro : sourire, fond neutre</li>
                <li>Titre : "Dev React | Open to work | Fintech"</li>
                <li>Résumé : qui vous êtes, ce que vous faites</li>
                <li>Expériences : avec résultats chiffrés !</li>
                <li>Compétences : min 5, validées</li>
                <li>Formations : diplômes + certifications</li>
                <li>Activité : postez 1-2x/semaine</li>
            </ul>
            
            <strong>⚡ Hack :</strong> Activez "Open to Work" visible recruteurs seulement !
        </div>`;
    }

    // MERCI
    if (msg.includes('merci') || msg.includes('super') || 
        msg.includes('parfait') || msg.includes('genial')) {
        return `<div style="font-family: inherit; line-height: 1.6;">
            <strong>😊 Avec plaisir !</strong><br><br>
            
            C'est exactement pour ça que je suis là ! 🚀<br><br>
            
            <strong>N'oubliez pas :</strong>
            <ul>
                <li>✅ Chaque action compte, même petite</li>
                <li>✅ La persévérance fait la différence</li>
                <li>✅ Votre prochain employeur cherche quelqu'un comme vous !</li>
            </ul>
            
            Avez-vous d'autres questions ? 💪
        </div>`;
    }

    // FALLBACK
    return `<div style="font-family: inherit; line-height: 1.6;">
        <strong>🤔 Je suis spécialisé dans tout ce qui touche à votre carrière !</strong><br><br>
        
        <strong>📄 Documents :</strong> "générer cv", "lettre de motivation", "portfolio"<br>
        <strong>🎤 Entretiens :</strong> "préparer entretien", "questions fréquentes"<br>
        <strong>💰 Salaire :</strong> "négocier salaire", "combien demander"<br>
        <strong>📚 Formation :</strong> "quoi apprendre", "meilleures formations"<br>
        <strong>🔍 Emploi :</strong> "trouver un job", "stratégie recherche"<br>
        <strong>💼 LinkedIn :</strong> "optimiser profil", "réseau professionnel"<br>
        <strong>🔄 Reconversion :</strong> "changer de métier", "nouveau domaine"<br>
        <strong>💪 Motivation :</strong> "je suis découragé", "conseils"<br><br>
        
        Posez-moi votre question ! 😊
    </div>`;
}



scrollChatToBottom(): void {
    if (this.chatMessages) {
        setTimeout(() => {
            this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
        }, 100);
    }
}

// 8. CAREER TIMELINE
ouvrirTimeline(): void {
    this.chargerTimeline();
    this.showTimelineModal = true;
}

chargerTimeline(): void {
    this.apiService.getTimeline().subscribe({
        next: (data: any) => {
            this.timelineItems = data;
        },
        error: (err) => console.error('Erreur chargement timeline:', err)
    });
}

getTimelineItems(): any[] {
    return this.timelineItems;
}

// ==================== APPELER CES MÉTHODES DANS loadData() ====================
// Ajoute ces appels à la fin de ta méthode loadData() existante :

/*
this.chargerGamification();
this.chargerSmartMatch();
this.chargerRadar();
this.chargerStatistiquesAvancees();
this.chargerPrediction();
this.chargerRelances();
this.chargerTimeline();
*/

// ==================== AJOUTER CES MÉTHODES DANS api.service.ts ====================
// Tu dois aussi ajouter ces méthodes dans ton fichier api.service.ts :

/*
getGamification(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/gamification`);
}

getSmartMatch(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/smart-match`);
}

getRadarCompetences(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/radar-competences`);
}

getTauxReussite(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/taux-reussite`);
}

getStatsParMois(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/stats-par-mois`);
}

getPredictionSucces(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/prediction-succes`);
}

getRelances(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/relances`);
}

getTimeline(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/timeline`);
}
*/

// ==================== INIT ====================
chargerDonneesLocales(): void {
    const tags = localStorage.getItem('candidatureTags');
    const notes = localStorage.getItem('candidatureNotes');
    if (tags) this.candidatureTags = JSON.parse(tags);
    if (notes) this.candidatureNotes = JSON.parse(notes);
}

// ==================== TAGS ====================
toggleTagMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.showTagMenu = this.showTagMenu === id ? null : id;
}

toggleTag(candidatureId: number, tag: string): void {
    if (!this.candidatureTags[candidatureId]) {
        this.candidatureTags[candidatureId] = [];
    }
    const tags = this.candidatureTags[candidatureId];
    const idx = tags.indexOf(tag);
    if (idx === -1) {
        tags.push(tag);
    } else {
        tags.splice(idx, 1);
    }
    localStorage.setItem('candidatureTags', JSON.stringify(this.candidatureTags));
}

hasTag(candidatureId: number, tag: string): boolean {
    return (this.candidatureTags[candidatureId] || []).includes(tag);
}

getTagsForCandidature(candidatureId: number): string[] {
    return this.candidatureTags[candidatureId] || [];
}

toggleTagFilter(tag: string): void {
    const idx = this.activeTagFilter.indexOf(tag);
    if (idx === -1) {
        this.activeTagFilter.push(tag);
    } else {
        this.activeTagFilter.splice(idx, 1);
    }
}

getCandidaturesFiltrees(): any[] {
    if (this.activeTagFilter.length === 0) return this.candidatures;
    return this.candidatures.filter(c =>
        this.activeTagFilter.every(tag =>
            (this.candidatureTags[c.id] || []).includes(tag)
        )
    );
}

getTagColor(tag: string): string {
    const colors: { [key: string]: string } = {
        'Prioritaire': '#ef4444',
        'Remote': '#3b82f6',
        'Startup': '#8b5cf6',
        'Stage': '#f59e0b',
        'Tech': '#10b981',
        'Finance': '#06b6d4',
        'Urgent': '#f97316'
    };
    return colors[tag] || '#6b7280';
}

// ==================== NOTES ====================
ouvrirNote(candidature: any): void {
    this.showNoteModal = candidature.id;
    this.currentNote = this.candidatureNotes[candidature.id] || '';
}

sauvegarderNote(): void {
    if (this.showNoteModal !== null) {
        if (this.currentNote.trim()) {
            this.candidatureNotes[this.showNoteModal] = this.currentNote.trim();
        } else {
            delete this.candidatureNotes[this.showNoteModal];
        }
        localStorage.setItem('candidatureNotes', JSON.stringify(this.candidatureNotes));
        this.showNoteModal = null;
        this.currentNote = '';
    }
}

getNote(candidatureId: number): string {
    return this.candidatureNotes[candidatureId] || '';
}

hasNote(candidatureId: number): boolean {
    return !!this.candidatureNotes[candidatureId];
}

// ==================== RAPPELS ====================
calculerRappels(): void {
    this.apiService.getRelances().subscribe({
        next: (data) => {
            this.rappels = data.filter((c: any) => c.joursEcoules >= 7);
        },
        error: () => {}
    });
}
/*
getNiveauRappel(jours: number): string {
    return ''; // Le backend renvoie déjà niveauRappel dans l'objet
}

getNiveauRappelColor(jours: number): string {
    return ''; // Le backend renvoie déjà couleurRappel dans l'objet
}

getNiveauRappel(jours: number): string {
    if (jours >= 21) return 'critique';
    if (jours >= 14) return 'urgent';
    return 'normal';
}

getNiveauRappelColor(jours: number): string {
    if (jours >= 21) return '#ef4444';
    if (jours >= 14) return '#f59e0b';
    return '#3b82f6';
}*/

copierMessageRelance(candidature: any): void {
    const msg = `Objet : Suivi de ma candidature — ${candidature.poste || candidature.offreTitre || 'Candidature spontanée'}

Madame, Monsieur,

Je me permets de revenir vers vous concernant ma candidature envoyée le ${this.formatDate(candidature.dateEnvoi)}.

Toujours très intéressé(e) par ce poste, je reste disponible pour un entretien à votre convenance.

Cordialement,
${candidature.nomComplet}`;

    navigator.clipboard.writeText(msg).then(() => {
        this.showMessage('Message de relance copié dans le presse-papier !', 'success');
    });
}

// ==================== DOUBLONS ====================
detecterDoublons(): void {
    this.apiService.getDoublonsCandidatures().subscribe({
        next: (data) => { this.doublons = data; },
        error: () => {}
    });
}

ouvrirDoublons(): void {
    this.detecterDoublons();
    this.showDoublonsModal = true;
}


 // ==================== GESTION DES ARCHIVES ====================

getCandidaturesActives(): any[] {
    return this.candidatures.filter(c => 
        !c.archive || c.archive === 0 || c.archive === false
    );
}

getCandidaturesArchivees(): any[] {
    return this.candidatures.filter(c => 
        c.archive === true || c.archive === 1 || c.archive == 1
    );
}

getArchivesCount(): number {
    return this.getCandidaturesArchivees().length;
}

toggleShowArchives(): void {
    this.showArchives = !this.showArchives;
    console.log('showArchives:', this.showArchives);
    console.log('Total candidatures reçues:', this.candidatures.length);
    console.log('Archive values:', this.candidatures.map(c => ({ 
        id: c.id, 
        archive: c.archive,
        type: typeof c.archive 
    })));
    console.log('Archivées trouvées:', this.candidatures.filter(c => c.archive == 1).length);
}

archiverCandidature(candidature: any): void {
    if (confirm(`Archiver la candidature de ${candidature.nomComplet} ?`)) {
        this.apiService.archiverCandidature(candidature.id).subscribe({
            next: () => {
                this.showMessage('Candidature archivée avec succès', 'success');
                this.loadData();
            },
            error: (err) => {
                this.showMessage('Erreur lors de l\'archivage', 'error');
            }
        });
    }
}

restaurerCandidature(candidature: any): void {
    if (confirm(`Restaurer la candidature de ${candidature.nomComplet} ?`)) {
        this.apiService.restaurerCandidature(candidature.id).subscribe({
            next: () => {
                this.showMessage('Candidature restaurée avec succès', 'success');
                this.loadData();
            },
            error: (err) => {
                this.showMessage('Erreur lors de la restauration', 'error');
            }
        });
    }
}

}