import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
    selector: 'app-cd-documents',
    standalone: false,
    templateUrl: './cd-documents.component.html',
    styleUrls: ['./cd-documents.component.scss']
})
export class CdDocumentsComponent implements OnInit {
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
    @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
    
    editingDocumentId: number | null = null; 
    showCameraModal = false;
    capturedImage: string | null = null;
    isProcessing = false;
    processingStep = 0;
    stream: MediaStream | null = null;
    resultatRecherche: any = null;
    showResultModal: boolean = false;
    modalTitle: string = '';
    modalData: any = null;

    // Variables pour la confirmation photo
    showPhotoConfirmationModal: boolean = false;
    originalPhoto: string | null = null;
    processedPhoto: string | null = null;
    isProcessingPhoto: boolean = false;
    photoProcessingError: string | null = null;

    documents: any[] = [];
    isLoading = true;
    errorMessage = '';

    // Modals
    showCreateModal = false;
    showEditModal = false;
    showViewModal = false;
    showPreviewModal: boolean = false;
    showAnalyseCVModal: boolean = false;
    showOptimiseModal: boolean = false;

    // États
    isCreating = false;
    isUpdating = false;
    isAnalysing: boolean = false;
    isOptimising: boolean = false;

    selectedDocument: any = null;
    editingDocument: any = null;

    // Aperçu du document généré
    generatedDocument: {
        nom: string;
        type: string;
        contenu: string;
    } | null = null;

    // Snapshot sauvegardé avant reset
    savedCvData: any = null;
    savedSelectedType: string = 'CV';
    savedLettreData: any = null;
    savedPortfolioData: any = null;
    savedAutreData: any = null;

    // Type de document
    selectedType: string = 'CV';
    types = ['CV', 'LETTRE_DE_MOTIVATION', 'PORTFOLIO', 'AUTRE'];

    // ==================== FORMULAIRE CV ====================
    cvData = {
        nom: '',
        prenom: '',
        titre: '',
        email: '',
        telephone: '',
        adresse: '',
        dateNaissance: '',
        photo: '',
        photoName: '',
        experiences: [] as any[],
        formations: [] as any[],
        competences: [] as string[],
        langues: [] as any[],
        centresInteret: [] as string[],
        profil: ''
    };

    newExperience = { poste: '', entreprise: '', periode: '', description: '' };
    newFormation = { diplome: '', institution: '', annee: '', description: '' };
    newLangue = { langue: '', niveau: '' };

    // ==================== FORMULAIRE LETTRE ====================
    lettreData = {
        entreprise: '',
        poste: '',
        message: '',
        prenom: '',
        nom: ''
    };

    // ==================== FORMULAIRE PORTFOLIO ====================
    portfolioData = {
        titre: '',
        description: '',
        technologies: [] as string[],
        lien: '',
        annee: ''
    };
    newTechnologie = '';

    // ==================== FORMULAIRE AUTRE ====================
    autreData = {
        titre: '',
        contenu: ''
    };

    // ==================== ANALYSE / OPTIMISATION ====================
    analyseResult: any = null;
    optimisationResult: any = null;
    offreEmploiInput: string = '';
    documentEnCours: any = null;
message: string = '';
messageType: string = '';

showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
        this.message = '';
    }, 5000);
}
    // URL de l'API ML
    private readonly ML_API_URL = environment.mlUrl;

    constructor(private apiService: ApiService) {}

    ngOnInit(): void {
        this.loadDocuments();
    }

    loadDocuments(): void {
        this.isLoading = true;
        this.apiService.getMesDocuments().subscribe({
            next: (data) => {
                this.documents = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement documents:', err);
                this.errorMessage = 'Erreur de chargement';
                this.isLoading = false;
            }
        });
    }

    // ==================== CHANGEMENT DE TYPE ====================
    onTypeChange(type: string): void {
        this.selectedType = type;
    }

    // ==================== CRUD ====================
    openCreateModal(): void {
        this.selectedType = 'CV';
        this.resetForms();
        this.showCreateModal = true;
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.editingDocumentId = null;
        this.resetForms();
    }

    resetForms(): void {
        this.cvData = {
            nom: '',
            prenom: '',
            titre: '',
            email: '',
            telephone: '',
            adresse: '',
            dateNaissance: '',
            photo: '',
            photoName: '',
            experiences: [],
            formations: [],
            competences: [],
            langues: [],
            centresInteret: [],
            profil: ''
        };
        this.newExperience = { poste: '', entreprise: '', periode: '', description: '' };
        this.newFormation = { diplome: '', institution: '', annee: '', description: '' };
        this.newLangue = { langue: '', niveau: '' };
        this.lettreData = { entreprise: '', poste: '', message: '', prenom: '', nom: '' };
        this.portfolioData = { titre: '', description: '', technologies: [], lien: '', annee: '' };
        this.autreData = { titre: '', contenu: '' };
    }



    // ==================== GESTION CV ====================
    addExperience(): void {
        if (this.newExperience.poste && this.newExperience.entreprise) {
            this.cvData.experiences.push({ ...this.newExperience });
            this.newExperience = { poste: '', entreprise: '', periode: '', description: '' };
        }
    }

    removeExperience(index: number): void {
        this.cvData.experiences.splice(index, 1);
    }

    addFormation(): void {
        if (this.newFormation.diplome && this.newFormation.institution) {
            this.cvData.formations.push({ ...this.newFormation });
            this.newFormation = { diplome: '', institution: '', annee: '', description: '' };
        }
    }

    removeFormation(index: number): void {
        this.cvData.formations.splice(index, 1);
    }

    addCompetence(competence: string): void {
        if (competence && competence.trim()) {
            this.cvData.competences.push(competence.trim());
        }
    }

    removeCompetence(index: number): void {
        this.cvData.competences.splice(index, 1);
    }

    addLangue(): void {
        if (this.newLangue.langue && this.newLangue.niveau) {
            this.cvData.langues.push({ ...this.newLangue });
            this.newLangue = { langue: '', niveau: '' };
        }
    }

    removeLangue(index: number): void {
        this.cvData.langues.splice(index, 1);
    }

    addCentreInteret(centre: string): void {
        if (centre && centre.trim()) {
            this.cvData.centresInteret.push(centre.trim());
        }
    }

    removeCentreInteret(index: number): void {
        this.cvData.centresInteret.splice(index, 1);
    }

    // ==================== GESTION PORTFOLIO ====================
    addTechnologie(tech: string): void {
        if (tech && tech.trim()) {
            this.portfolioData.technologies.push(tech.trim());
        }
    }

    removeTechnologie(index: number): void {
        this.portfolioData.technologies.splice(index, 1);
    }

    // ==================== CRÉATION / MODIFICATION ====================
   createDocument(): void {
    // Appel de la validation AVANT tout traitement
    if (this.selectedType === 'CV' && !this.validateCvForm()) {
        return;
    }

    if (this.selectedType === 'CV') {
        if (this.newExperience.poste && this.newExperience.entreprise) this.addExperience();
        if (this.newFormation.diplome && this.newFormation.institution) this.addFormation();
        if (this.newLangue.langue && this.newLangue.niveau) this.addLangue();
    }

    const contenu = this.genererAIConstenu();
    const nomFichier = this.getNomDocument(); // ex: "Ahmed_Ben_Ali_CV"

    if (!nomFichier) {
        alert('Veuillez remplir les informations nécessaires');
        return;
    }

    if (this.editingDocumentId) {
        const updateData: any = {
            nomFichier: nomFichier,          // ← titre du fichier
            nom: this.cvData.nom,            // ← vrai nom de famille
            type: this.selectedType,
            contenu: contenu,
            template: this.getTemplateName(),
            compatibleATS: true,
            ajouterPhoto: this.selectedType === 'CV' && !!this.cvData.photo,
        };

        if (this.selectedType === 'CV') {
            updateData.prenom      = this.cvData.prenom      || null;
            updateData.titre       = this.cvData.titre        || null;
            updateData.email       = this.cvData.email        || null;
            updateData.telephone   = this.cvData.telephone    || null;
            updateData.adresse     = this.cvData.adresse      || null;
            updateData.profil      = this.cvData.profil       || null;
            updateData.photoName   = this.cvData.photoName    || null;
            updateData.competences   = JSON.stringify(this.cvData.competences   || []);
            updateData.langues       = JSON.stringify(this.cvData.langues       || []);
            updateData.centresInteret= JSON.stringify(this.cvData.centresInteret|| []);
            updateData.experiences   = JSON.stringify(this.cvData.experiences   || []);
            updateData.formations    = JSON.stringify(this.cvData.formations    || []);
        }

        this.isUpdating = true;
        this.apiService.modifierDocument(this.editingDocumentId, updateData).subscribe({
            next: () => {
                this.closeCreateModal();
                this.loadDocuments();
                this.isUpdating = false;
                this.editingDocumentId = null;
                this.showMessage('Document modifié avec succès !', 'success');
            },
            error: (err) => {
                console.error('Erreur modification:', err);
                this.showMessage('Erreur lors de la modification.', 'error');
                this.isUpdating = false;
            }
        });
    } else {
        this.savedCvData         = JSON.parse(JSON.stringify(this.cvData));
        this.savedSelectedType   = this.selectedType;
        this.savedLettreData     = JSON.parse(JSON.stringify(this.lettreData));
        this.savedPortfolioData  = JSON.parse(JSON.stringify(this.portfolioData));
        this.savedAutreData      = JSON.parse(JSON.stringify(this.autreData));

        this.generatedDocument = { nom: nomFichier, type: this.selectedType, contenu };
        this.closeCreateModal();
        this.showPreviewModal = true;
    }
}

  saveGeneratedDocument(): void {
    if (!this.generatedDocument) {
        alert("Aucun document à sauvegarder");
        return;
    }

    this.isCreating = true;
    const cv   = this.savedCvData   || this.cvData;
    const type = this.savedSelectedType || this.selectedType;

    let dataToSend: any = {
        nomFichier: this.generatedDocument.nom,  // ← titre fichier
        nom: cv.nom,                              // ← nom de famille
        type: this.generatedDocument.type,
        contenu: this.generatedDocument.contenu,
        template: this.getTemplateName(),
        compatibleATS: true,
        ajouterPhoto: type === 'CV' && !!cv.photo,
    };

    if (type === 'CV') {
        dataToSend = {
            ...dataToSend,
            prenom:         cv.prenom        || null,
            titre:          cv.titre         || null,
            email:          cv.email         || null,
            telephone:      cv.telephone     || null,
            adresse:        cv.adresse       || null,
            profil:         cv.profil        || null,
            photoName:      cv.photoName     || null,
            competences:    JSON.stringify(cv.competences    || []),
            langues:        JSON.stringify(cv.langues        || []),
            centresInteret: JSON.stringify(cv.centresInteret || []),
            experiences:    JSON.stringify(cv.experiences    || []),
            formations:     JSON.stringify(cv.formations     || []),
        };
    }

    this.apiService.creerDocument(dataToSend).subscribe({
        next: () => {
            this.closePreviewModal();
            this.loadDocuments();
            this.isCreating = false;
            this.savedCvData = this.savedLettreData = this.savedPortfolioData = this.savedAutreData = null;
            this.showMessage('Document créé avec succès !', 'success');
        },
        error: (err) => {
            console.error('Erreur création:', err);
            this.showMessage('Erreur lors de la création.', 'error');
            this.isCreating = false;
        }
    });
}

    closePreviewModal(): void {
        this.showPreviewModal = false;
        this.generatedDocument = null;
        this.savedCvData = null;
        this.savedLettreData = null;
        this.savedPortfolioData = null;
        this.savedAutreData = null;
    }

    getNomDocument(): string {
        switch(this.selectedType) {
            case 'CV':
                return `${this.cvData.prenom}_${this.cvData.nom}_CV` || 'Mon_CV';
            case 'LETTRE_DE_MOTIVATION':
                return `Lettre_${this.lettreData.entreprise}` || 'Lettre_motivation';
            case 'PORTFOLIO':
                return this.portfolioData.titre || 'Mon_Portfolio';
            default:
                return this.autreData.titre || 'Document';
        }
    }

    getTemplateName(): string {
        switch(this.selectedType) {
            case 'CV': return 'CV_Professionnel';
            case 'LETTRE_DE_MOTIVATION': return 'Lettre_Standard';
            case 'PORTFOLIO': return 'Portfolio_Moderne';
            default: return 'Standard';
        }
    }

    // ==================== GÉNÉRATION HTML ====================
    genererAIConstenu(): string {
        switch(this.selectedType) {
            case 'CV': return this.genererCV();
            case 'LETTRE_DE_MOTIVATION': return this.genererLettre();
            case 'PORTFOLIO': return this.genererPortfolio();
            default: return this.autreData.contenu;
        }
    }

    genererCV(): string {
        const fullName = `${this.cvData.prenom || ''} ${this.cvData.nom || ''}`.trim() || 'Votre Nom';
        const titre = this.cvData.titre || 'Ingénieur Informatique';
        const email = this.cvData.email || '';
        const telephone = this.cvData.telephone || '';
        const adresse = this.cvData.adresse || '';

        const experiencesHTML = this.cvData.experiences.map(exp => `
            <div class="experience">
                <div class="experience-header">
                    <div>
                        <strong>${exp.poste}</strong><br>
                        <span class="company">${exp.entreprise}</span>
                    </div>
                    <span class="period">${exp.periode || ''}</span>
                </div>
                <p>${exp.description || ''}</p>
            </div>
        `).join('');

        const formationsHTML = this.cvData.formations.map(formation => `
            <div class="education">
                <div class="education-header">
                    <div>
                        <strong>${formation.diplome}</strong><br>
                        <span class="institution">${formation.institution}</span>
                    </div>
                    <span class="period">${formation.annee || ''}</span>
                </div>
                <p>${formation.description || ''}</p>
            </div>
        `).join('');

        const competencesHTML = this.cvData.competences.map(skill =>
            `<li>${skill}</li>`
        ).join('');

        const languesHTML = this.cvData.langues.map(l =>
            `<li><strong>${l.langue}</strong> - ${l.niveau}</li>`
        ).join('');

        const centresHTML = this.cvData.centresInteret.map(c =>
            `<li>${c}</li>`
        ).join('');

        return `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>CV - ${fullName}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 30px; line-height: 1.5; }
                    .cv { max-width: 950px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.15); display: grid; grid-template-columns: 280px 1fr; min-height: 1100px; }
                    .left-column { background: #1e2a44; color: white; padding: 40px 25px; }
                    .photo { width: 170px; height: 170px; border-radius: 50%; object-fit: cover; border: 6px solid #ffffff; margin-bottom: 25px; }
                    .left-column h1 { font-size: 26px; margin-bottom: 5px; }
                    .left-column .title { font-size: 15px; color: #a0c4ff; margin-bottom: 25px; }
                    .left-column .contact-info { margin-bottom: 35px; font-size: 13.5px; }
                    .left-column .contact-info p { margin-bottom: 8px; }
                    .left-column h2 { font-size: 16px; text-transform: uppercase; border-bottom: 2px solid #4a6da7; padding-bottom: 8px; margin-bottom: 15px; color: #a0c4ff; }
                    .skills-list, .languages-list, .interests-list { list-style: none; }
                    .skills-list li, .languages-list li, .interests-list li { margin-bottom: 10px; font-size: 14px; }
                    .right-column { padding: 45px 40px; background: white; }
                    .right-column h2 { font-size: 18px; color: #1e2a44; border-bottom: 3px solid #1e2a44; padding-bottom: 8px; margin-bottom: 20px; }
                    .summary { font-size: 14.5px; margin-bottom: 35px; color: #333; }
                    .experience, .education { margin-bottom: 28px; }
                    .experience-header, .education-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .company, .institution { color: #1e2a44; font-weight: 600; }
                    .period { color: #555; font-size: 13.5px; }
                    @media print { body { background: white; padding: 0; } .cv { box-shadow: none; } }
                </style>
            </head>
            <body>
                <div class="cv">
                    <div class="left-column">
                        ${this.cvData.photo ?
                            `<img src="${this.cvData.photo}" alt="Photo" class="photo">` :
                            `<div style="width:170px;height:170px;background:#334466;border-radius:50%;margin-bottom:25px;"></div>`
                        }
                        <h1>${fullName}</h1>
                        <div class="title">${titre}</div>
                        <div class="contact-info">
                            ${email ? `<p>✉️ ${email}</p>` : ''}
                            ${telephone ? `<p>📱 ${telephone}</p>` : ''}
                            ${adresse ? `<p>📍 ${adresse}</p>` : ''}
                        </div>
                        <h2>Compétences</h2>
                        <ul class="skills-list">
                            ${competencesHTML || '<li>Aucune compétence ajoutée</li>'}
                        </ul>
                        <h2>Langues</h2>
                        <ul class="languages-list">
                            ${languesHTML || '<li>Aucune langue renseignée</li>'}
                        </ul>
                        ${centresHTML ? `<h2>Centres d'intérêt</h2><ul class="interests-list">${centresHTML}</ul>` : ''}
                    </div>
                    <div class="right-column">
                        <h2>Profil</h2>
                        <p class="summary">${this.cvData.profil || 'Professionnel motivé avec une solide expérience en développement et une forte capacité d\'adaptation.'}</p>
                        <h2>Expérience Professionnelle</h2>
                        ${experiencesHTML || '<p>Aucune expérience renseignée.</p>'}
                        <h2>Formation</h2>
                        ${formationsHTML || '<p>Aucune formation renseignée.</p>'}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    genererLettre(): string {
        const date = new Date().toLocaleDateString('fr-FR');
        const nomComplet = `${this.lettreData.prenom} ${this.lettreData.nom}`.trim() || 'Candidat';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Lettre de motivation - ${this.lettreData.entreprise}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; }
                    .letter { max-width: 800px; margin: 0 auto; background: white; border-radius: 24px; padding: 48px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
                    .header { text-align: right; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
                    .header .name { font-size: 20px; font-weight: 600; color: #2d3748; }
                    .header .date { color: #718096; margin-top: 8px; }
                    .content p { margin-bottom: 20px; line-height: 1.6; color: #4a5568; }
                    .subject { font-weight: 600; color: #667eea; margin-bottom: 24px; font-size: 18px; }
                    .signature { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
                    @media print { body { background: white; padding: 0; } .letter { box-shadow: none; } }
                </style>
            </head>
            <body>
                <div class="letter">
                    <div class="header">
                        <div class="name">${nomComplet}</div>
                        <div class="date">${date}</div>
                    </div>
                    <div class="content">
                        <div class="subject">Objet : Candidature pour le poste de ${this.lettreData.poste}</div>
                        <p>Madame, Monsieur,</p>
                        <p>${this.lettreData.message || `Je me permets de vous adresser ma candidature pour le poste de ${this.lettreData.poste} au sein de votre entreprise ${this.lettreData.entreprise}.`}</p>
                        <p>Je me tiens à votre disposition pour un entretien afin de vous exposer plus en détail ma motivation et mes compétences.</p>
                        <p>Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.</p>
                    </div>
                    <div class="signature"><p>${nomComplet}</p></div>
                </div>
            </body>
            </html>
        `;
    }

    genererPortfolio(): string {
        const technologiesHTML = this.portfolioData.technologies.map(tech =>
            `<span class="tech-tag">${tech}</span>`
        ).join('');
        const projectLink = this.portfolioData.lien
            ? `<a href="${this.portfolioData.lien}" target="_blank" class="project-btn">Voir le projet en ligne →</a>`
            : '';
        return `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>Portfolio - ${this.portfolioData.titre || 'Mon Projet'}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', sans-serif; background: #0f172a; padding: 40px 20px; }
                    .portfolio { max-width: 980px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.25); }
                    .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 90px 70px 70px; text-align: center; color: white; }
                    .header h1 { font-size: 48px; font-weight: 700; margin-bottom: 12px; }
                    .content { padding: 70px 80px; color: #1e2937; }
                    .section-title { font-size: 22px; font-weight: 700; margin-bottom: 20px; color: #0f172a; }
                    .description { font-size: 17px; line-height: 1.85; color: #334155; margin-bottom: 55px; }
                    .tech-tags { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 40px; }
                    .tech-tag { background: #f1f5f9; color: #1e40af; padding: 12px 24px; border-radius: 9999px; font-size: 15px; font-weight: 500; }
                    .project-btn { display: inline-block; background: #6366f1; color: white; padding: 16px 36px; border-radius: 9999px; font-size: 16px; font-weight: 600; text-decoration: none; }
                    @media print { body { background: white; padding: 0; } .portfolio { box-shadow: none; } }
                </style>
            </head>
            <body>
                <div class="portfolio">
                    <div class="header">
                        <h1>${this.portfolioData.titre || 'Mon Projet'}</h1>
                        ${this.portfolioData.annee ? `<div style="font-size:20px;opacity:0.9;">${this.portfolioData.annee}</div>` : ''}
                    </div>
                    <div class="content">
                        <div class="section-title">Description du projet</div>
                        <p class="description">${this.portfolioData.description || 'Description non renseignée.'}</p>
                        <div class="section-title">Technologies utilisées</div>
                        <div class="tech-tags">${technologiesHTML || '<p>Aucune technologie renseignée.</p>'}</div>
                        ${projectLink}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // ==================== READ ====================
    viewDocument(doc: any): void {
        this.selectedDocument = doc;
        this.showViewModal = true;
    }

    closeViewModal(): void {
        this.showViewModal = false;
        this.selectedDocument = null;
    }

    // ==================== UPDATE ====================
    openEditModal(doc: any): void {
        this.resetForms();
        this.selectedType = doc.type;
        
        if (doc.type === 'CV') {
            this.cvData.nom = doc.nom || '';
            this.cvData.prenom = doc.prenom || '';
            this.cvData.titre = doc.titre || '';
            this.cvData.email = doc.email || '';
            this.cvData.telephone = doc.telephone || '';
            this.cvData.adresse = doc.adresse || '';
            this.cvData.profil = doc.profil || '';
            
            if (doc.competences) {
                try {
                    this.cvData.competences = JSON.parse(doc.competences);
                } catch(e) {
                    this.cvData.competences = [];
                }
            }
            
            if (doc.langues) {
                try {
                    this.cvData.langues = JSON.parse(doc.langues);
                } catch(e) {
                    this.cvData.langues = [];
                }
            }
            
            if (doc.centresInteret) {
                try {
                    this.cvData.centresInteret = JSON.parse(doc.centresInteret);
                } catch(e) {
                    this.cvData.centresInteret = [];
                }
            }
            
            if (doc.experiences) {
                try {
                    this.cvData.experiences = JSON.parse(doc.experiences);
                } catch(e) {
                    this.cvData.experiences = [];
                }
            }
            
            if (doc.formations) {
                try {
                    this.cvData.formations = JSON.parse(doc.formations);
                } catch(e) {
                    this.cvData.formations = [];
                }
            }
        }
        
        if (doc.type === 'LETTRE_DE_MOTIVATION') {
            this.lettreData.entreprise = doc.entreprise || '';
            this.lettreData.poste = doc.poste || '';
            this.lettreData.message = doc.message || '';
            this.lettreData.prenom = doc.prenom || '';
            this.lettreData.nom = doc.nom || '';
        }
        
        if (doc.type === 'PORTFOLIO') {
            this.portfolioData.titre = doc.titre || '';
            this.portfolioData.description = doc.description || '';
            this.portfolioData.lien = doc.lien || '';
            this.portfolioData.annee = doc.annee || '';
            if (doc.technologies) {
                try {
                    this.portfolioData.technologies = JSON.parse(doc.technologies);
                } catch(e) {
                    this.portfolioData.technologies = [];
                }
            }
        }
        
        if (doc.type === 'AUTRE') {
            this.autreData.titre = doc.nom || '';
            this.autreData.contenu = doc.contenu || '';
        }
        
        this.editingDocumentId = doc.id;
        this.showCreateModal = true;
    }

    // ==================== DELETE ====================
    deleteDocument(id: number): void {
        if (confirm('Supprimer ce document ?')) {
            this.apiService.supprimerDocument(id).subscribe({
                next: () => {
                    this.loadDocuments();
                    alert('Document supprimé');
                },
                error: (err) => console.error('Erreur:', err)
            });
        }
    }

    // ==================== TÉLÉCHARGEMENT ====================
    telechargerDocument(doc: any): void {
        if (doc && doc.contenu) {
            const blob = new Blob([doc.contenu], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.nom || doc.type}.html`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    // ==================== ANALYSE CV (API ML) ====================
    ouvrirAnalyseCV(doc: any): void {
        if (doc.type !== 'CV') {
            alert('L\'analyse est disponible uniquement pour les CVs');
            return;
        }
        
        this.documentEnCours = doc;
        this.analyseResult = null;
        this.isAnalysing = true;
        this.showAnalyseCVModal = true;

        this.analyserAvecML(doc.contenu).subscribe({
            next: (data) => {
                this.analyseResult = data;
                this.isAnalysing = false;
                console.log('Résultat ML:', data);
            },
            error: (err) => {
                console.error('Erreur API ML:', err);
                this.isAnalysing = false;
                
                this.apiService.analyserCV(doc.id).subscribe({
                    next: (data) => {
                        this.analyseResult = data;
                        this.isAnalysing = false;
                    },
                    error: (err2) => {
                        console.error('Erreur fallback:', err2);
                        alert('Erreur lors de l\'analyse du CV');
                        this.isAnalysing = false;
                    }
                });
            }
        });
    }

    analyserAvecML(cvContent: string) {
        return new Observable<any>(observer => {
            fetch(`${this.ML_API_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cv_content: cvContent })
            })
            .then(response => response.json())
            .then(data => {
                observer.next(data);
                observer.complete();
            })
            .catch(error => observer.error(error));
        });
    }

    optimiserAvecML(cvContent: string, jobOffer: string) {
        return new Observable<any>(observer => {
            fetch(`${this.ML_API_URL}/optimize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    cv_content: cvContent,
                    job_offer: jobOffer 
                })
            })
            .then(response => response.json())
            .then(data => {
                observer.next(data);
                observer.complete();
            })
            .catch(error => observer.error(error));
        });
    }

    ouvrirOptimisation(doc: any): void {
        if (doc.type !== 'CV') {
            alert('L\'optimisation est disponible uniquement pour les CVs');
            return;
        }
        
        this.documentEnCours = doc;
        this.optimisationResult = null;
        this.offreEmploiInput = '';
        this.showOptimiseModal = true;
    }

    lancerOptimisation(): void {
        if (!this.offreEmploiInput.trim()) {
            alert('Veuillez coller une offre d\'emploi');
            return;
        }
        
        this.isOptimising = true;
        
        this.optimiserAvecML(this.documentEnCours.contenu, this.offreEmploiInput).subscribe({
            next: (data) => {
                this.optimisationResult = data;
                this.isOptimising = false;
                console.log('Résultat optimisation ML:', data);
            },
            error: (err) => {
                console.error('Erreur API ML:', err);
                this.isOptimising = false;
                
                this.apiService.optimiserCV(this.documentEnCours.id, this.offreEmploiInput).subscribe({
                    next: (data) => {
                        this.optimisationResult = data;
                        this.isOptimising = false;
                    },
                    error: (err2) => {
                        console.error('Erreur fallback:', err2);
                        alert('Erreur lors de l\'optimisation');
                        this.isOptimising = false;
                    }
                });
            }
        });
    }

    // ==================== UTILITAIRES ====================
    getTypeLabel(type: string): string {
        switch(type) {
            case 'CV': return 'CV';
            case 'LETTRE_DE_MOTIVATION': return 'Lettre de motivation';
            case 'PORTFOLIO': return 'Portfolio';
            default: return type;
        }
    }

    getTypeIcon(type: string): string {
        switch(type) {
            case 'CV': return 'ri-file-pdf-line';
            case 'LETTRE_DE_MOTIVATION': return 'ri-mail-line';
            case 'PORTFOLIO': return 'ri-folder-image-line';
            default: return 'ri-file-line';
        }
    }

    getTypeColor(type: string): string {
        switch(type) {
            case 'CV': return '#e74c3c';
            case 'LETTRE_DE_MOTIVATION': return '#3498db';
            case 'PORTFOLIO': return '#9b59b6';
            default: return '#95a5a6';
        }
    }

    getScoreColor(score: number): string {
        if (score >= 70) return '#10b981';
        if (score >= 40) return '#f59e0b';
        return '#ef4444';
    }

    getScoreLabel(score: number): string {
        if (score >= 70) return 'Excellent';
        if (score >= 40) return 'Moyen';
        return 'À améliorer';
    }

    getWordCount(text: string): number {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    getCharCount(text: string): number {
        if (!text) return 0;
        return text.length;
    }

    


    

   

    // ============ MÉTHODES POUR LES TESTS ============
    afficherTousDocumentsAvecCandidat(): void {
        this.apiService.getMesDocumentsAvecInfos().subscribe({
            next: (data: any) => {
                console.log('📄 Mes documents avec infos:', data);
                this.modalTitle = '📄 Mes documents avec infos candidats';
                this.modalData = data;
                this.showResultModal = true;
            },
            error: (err: any) => {
                console.error('Erreur:', err);
                this.modalTitle = '❌ Erreur';
                this.modalData = { error: 'Impossible de charger vos documents' };
                this.showResultModal = true;
            }
        });
    }

    afficherCVsAvecCandidatures(): void {
        this.apiService.getMesCVsAvecCandidatures().subscribe({
            next: (data: any) => {
                console.log('📊 Mes CVs avec nombre de candidatures:', data);
                this.modalTitle = '📊 Mes CVs et nombre de candidatures';
                this.modalData = data;
                this.showResultModal = true;
                
                if (data && data.length > 0) {
                    const max = data.reduce((a: any, b: any) => 
                        a.nombreCandidatures > b.nombreCandidatures ? a : b, data[0]);
                    console.log(`🏆 Le CV "${max.cvNom}" a ${max.nombreCandidatures} candidature(s) !`);
                }
            },
            error: (err: any) => {
                console.error('Erreur:', err);
                this.modalTitle = '❌ Erreur';
                this.modalData = { error: 'Impossible de charger vos données' };
                this.showResultModal = true;
            }
        });
    }

    afficherStatistiquesParNiveau(): void {
        this.apiService.getMesStatistiques().subscribe({
            next: (data: any) => {
                console.log('📈 Mes statistiques par niveau:', data);
                this.modalTitle = '📈 Mes statistiques par niveau d\'étude';
                this.modalData = data;
                this.showResultModal = true;
            },
            error: (err: any) => {
                console.error('Erreur:', err);
                this.modalTitle = '❌ Erreur';
                this.modalData = { error: 'Impossible de charger vos statistiques' };
                this.showResultModal = true;
            }
        });
    }

    rechercherSimple(): void {
        const mot = prompt('🔍 Entrez un mot-clé à rechercher (ex: java, spring, nada):');
        if (!mot || mot.trim() === '') {
            return;
        }
        
        this.apiService.rechercherParMotCle(mot.trim()).subscribe({
            next: (data) => {
                console.log(`🔍 Résultats pour "${mot}":`, data);
                this.modalTitle = `🔍 Résultats de recherche : "${mot}"`;
                this.modalData = data;
                this.showResultModal = true;
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.modalTitle = '❌ Erreur';
                this.modalData = { error: 'Erreur lors de la recherche' };
                this.showResultModal = true;
            }
        });
    }

    rechercherMultiMots(): void {
        const mot1 = prompt('🔑 Entrez le 1er mot-clé:');
        if (!mot1) return;
        
        const mot2 = prompt('🔑 Entrez le 2ème mot-clé:');
        if (!mot2) return;
        
        const mot3 = prompt('🔑 Entrez le 3ème mot-clé:');
        if (!mot3) return;
        
        const motsCles = [mot1.trim(), mot2.trim(), mot3.trim()];
        
        this.apiService.rechercherMultiMotsCles(motsCles).subscribe({
            next: (data) => {
                console.log(`🔥 Résultats multi-mots (${motsCles.join(', ')}):`, data);
                this.modalTitle = `🔥 Résultats multi-mots : "${motsCles.join(' + ')}"`;
                this.modalData = data;
                this.showResultModal = true;
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.modalTitle = '❌ Erreur';
                this.modalData = { error: 'Erreur lors de la recherche' };
                this.showResultModal = true;
            }
        });
    }

    closeResultModal(): void {
        this.showResultModal = false;
        this.modalData = null;
    }
    
    getObjectKeys(obj: any): string[] {
        return Object.keys(obj);
    }

    formatKey(key: string): string {
        const map: {[key: string]: string} = {
            'id': 'ID',
            'documentId': 'ID Document',
            'documentNom': 'Nom du document',
            'cvNom': 'Nom du CV',
            'type': 'Type',
            'typeDocument': 'Type de document',
            'candidatId': 'ID Candidat',
            'candidatPrenom': 'Prénom candidat',
            'candidatNom': 'Nom candidat',
            'nombreCandidatures': 'Nb candidatures',
            'nombreDocuments': 'Nb documents',
            'niveauEtude': 'Niveau d\'étude',
            'score': 'Score'
        };
        return map[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

// ============ NOUVELLES MÉTHODES POUR TESTER SPRING DATA JPA KEYWORDS ============

// Test 1: Recherche par nom contenant
testerRechercheParNomContenant(): void {
    const nom = prompt('🔍 Entrez un mot-clé à rechercher dans le nom du document (ex: CV, Lettre, Projet):');
    if (!nom || nom.trim() === '') return;
    
    this.apiService.rechercherParNomContenant(nom.trim()).subscribe({
        next: (data) => {
            console.log('📄 Résultats recherche par nom contenant:', data);
            this.modalTitle = `📄 Recherche Spring Data JPA - Nom contenant "${nom}"`;
            this.modalData = data;
            this.showResultModal = true;
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.modalTitle = '❌ Erreur';
            this.modalData = { error: 'Erreur lors de la recherche' };
            this.showResultModal = true;
        }
    });
}

// Test 2: Recherche par type ET nom
testerRechercheParTypeEtNom(): void {
    const type = prompt('📁 Entrez le type de document (CV, LETTRE_DE_MOTIVATION, PORTFOLIO, AUTRE):');
    if (!type || type.trim() === '') return;
    
    const nom = prompt('🔍 Entrez un mot-clé à rechercher dans le nom:');
    if (!nom || nom.trim() === '') return;
    
    this.apiService.rechercherParTypeEtNom(type.trim(), nom.trim()).subscribe({
        next: (data) => {
            console.log('📄 Résultats recherche par type et nom:', data);
            this.modalTitle = `📄 Type: ${type} | Nom contenant: "${nom}"`;
            this.modalData = data;
            this.showResultModal = true;
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.modalTitle = '❌ Erreur';
            this.modalData = { error: 'Erreur lors de la recherche' };
            this.showResultModal = true;
        }
    });
}

// Test 3: Vérifier existence document
testerExistsDocument(): void {
    const candidatId = prompt('👤 Entrez l\'ID du candidat:');
    if (!candidatId) return;
    
    const type = prompt('📁 Entrez le type de document (CV, LETTRE_DE_MOTIVATION, PORTFOLIO):');
    if (!type) return;
    
    this.apiService.existsDocumentParCandidat(Number(candidatId), type).subscribe({
        next: (exists) => {
            console.log('📄 Existence document:', exists);
            this.modalTitle = `📄 Existence document - Candidat ID: ${candidatId}, Type: ${type}`;
            this.modalData = [{ 
                "Existe": exists ? "✅ OUI" : "❌ NON",
                "Message": exists ? "Ce candidat possède déjà un document de ce type" : "Ce candidat n'a pas de document de ce type"
            }];
            this.showResultModal = true;
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.modalTitle = '❌ Erreur';
            this.modalData = { error: 'Erreur lors de la vérification' };
            this.showResultModal = true;
        }
    });
}

// Test 4: Compter documents par candidat
testerCompterDocuments(): void {
    const candidatId = prompt('👤 Entrez l\'ID du candidat pour compter ses documents:');
    if (!candidatId) return;
    
    this.apiService.compterDocumentsParCandidat(Number(candidatId)).subscribe({
        next: (count) => {
            console.log('📄 Nombre de documents:', count);
            this.modalTitle = `📄 Nombre de documents - Candidat ID: ${candidatId}`;
            this.modalData = [{ 
                "candidatId": candidatId,
                "nombreDocuments": count,
                "Message": `Ce candidat possède ${count} document(s)`
            }];
            this.showResultModal = true;
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.modalTitle = '❌ Erreur';
            this.modalData = { error: 'Erreur lors du comptage' };
            this.showResultModal = true;
        }
    });
}

// Test 5: Top 5 documents récents
testerTop5DocumentsRecents(): void {
    const candidatId = prompt('👤 Entrez l\'ID du candidat:');
    if (!candidatId) return;
    
    const mot = prompt('🔍 Entrez un mot-clé (ou laissez vide pour tous):', '');
    
    this.apiService.getTop5DocumentsRecents(Number(candidatId), mot || '').subscribe({
        next: (data) => {
            console.log('📄 Top 5 documents récents:', data);
            this.modalTitle = `📄 Top 5 documents récents - Candidat ID: ${candidatId}`;
            this.modalData = data;
            this.showResultModal = true;
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.modalTitle = '❌ Erreur';
            this.modalData = { error: 'Erreur lors du chargement' };
            this.showResultModal = true;
        }
    });
}


// ==================== MÉTHODES PHOTO PROFESSIONNELLE ====================

/**
 * Ouvrir la caméra pour prendre une photo
 */
openCameraModal(): void {
    this.showCameraModal = true;
    this.capturedImage = null;
    this.processingStep = 0;
    this.photoProcessingError = null;
    setTimeout(() => {
        this.startCamera();
    }, 100);
}

/**
 * Démarrer la caméra
 */
async startCamera(): Promise<void> {
    try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } 
        });
        if (this.videoElement?.nativeElement) {
            this.videoElement.nativeElement.srcObject = this.stream;
            await this.videoElement.nativeElement.play();
        }
    } catch (err) {
        console.error('Erreur accès caméra:', err);
        alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        this.closeCameraModal();
    }
}

/**
 * Capturer la photo
 */
capturePhoto(): void {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    
    if (video && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
        }
        this.stopCamera();
    }
}

/**
 * Reprendre la photo (recommencer)
 */
retakePhoto(): void {
    this.capturedImage = null;
    this.startCamera();
}

/**
 * Arrêter la caméra
 */
stopCamera(): void {
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
    }
}

/**
 * Fermer le modal caméra
 */
closeCameraModal(): void {
    this.stopCamera();
    this.showCameraModal = false;
    this.capturedImage = null;
    this.isProcessing = false;
    this.processingStep = 0;
}

/**
 * Traiter la photo avec l'API ML (fond blanc professionnel)
 */
async processPhotoWithML(): Promise<void> {
    if (!this.capturedImage) return;
    
    this.isProcessing = true;
    this.processingStep = 1;
    this.photoProcessingError = null;
    
    try {
        // Étape 1: Capture
        this.processingStep = 1;
        await this.delay(300);
        
        // Étape 2: Conversion en Blob
        this.processingStep = 2;
        const blob = this.dataURLtoBlob(this.capturedImage);
        const formData = new FormData();
        formData.append('photo', blob, 'photo.jpg');
        
        // Sauvegarder l'originale
        this.originalPhoto = this.capturedImage;
        
        // Étape 3: Appel API
        this.processingStep = 3;
        
        // Appel au backend Spring Boot
        this.apiService.traiterPhotoProfessionnelle(formData).subscribe({
            next: (result) => {
                this.processingStep = 4;
                
                if (result.success !== false) {
                    // Sauvegarder la photo traitée
                    this.processedPhoto = result.photoUrl || result.image_professionnelle;
                    
                    // Fermer le modal caméra
                    this.closeCameraModal();
                    
                    // Ouvrir le modal de confirmation
                    setTimeout(() => {
                        this.showPhotoConfirmationModal = true;
                    }, 100);
                } else {
                    throw new Error(result.message || 'Erreur traitement');
                }
                
                this.isProcessing = false;
            },
            error: (err) => {
                console.error('Erreur API:', err);
                this.photoProcessingError = 'Erreur lors du traitement. Utiliser la photo originale ?';
                
                if (confirm('❌ Erreur de traitement. Utiliser la photo originale ?')) {
if (this.capturedImage) {
    this.cvData.photo = this.capturedImage;
}                    this.cvData.photoName = 'photo_camera.jpg';
                    this.closeCameraModal();
                }
                this.isProcessing = false;
                this.processingStep = 0;
            }
        });
        
    } catch (error) {
        console.error('Erreur traitement photo:', error);
        this.photoProcessingError = 'Erreur lors du traitement.';
        this.isProcessing = false;
        this.processingStep = 0;
    }
}

/**
 * Confirmer l'utilisation de la photo traitée
 */
confirmProcessedPhoto(): void {
    if (this.processedPhoto) {
        this.cvData.photo = this.processedPhoto;
        this.cvData.photoName = 'photo_professionnelle.jpg';
        this.showPhotoConfirmationModal = false;
        this.originalPhoto = null;
        this.processedPhoto = null;
        alert('✅ Photo professionnelle appliquée avec succès !');
    }
}

/**
 * Refuser la photo traitée et garder l'originale
 */
rejectProcessedPhoto(): void {
    if (this.originalPhoto) {
        this.cvData.photo = this.originalPhoto;
        this.cvData.photoName = 'photo_originale.jpg';
        this.showPhotoConfirmationModal = false;
        this.originalPhoto = null;
        this.processedPhoto = null;
        alert('📸 Photo originale conservée.');
    }
}

/**
 * Reprendre la photo depuis la confirmation
 */
retakeFromConfirmation(): void {
    this.showPhotoConfirmationModal = false;
    this.originalPhoto = null;
    this.processedPhoto = null;
    setTimeout(() => {
        this.openCameraModal();
    }, 100);
}



/**
 * Convertir dataURL en Blob
 */
dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Délai pour simulation
 */
delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Sélectionner une photo depuis le fichier (avec compression et confirmation automatique)
 */
async onPhotoSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert("Veuillez sélectionner une image (JPG, PNG, etc.)");
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert("L'image est très grande, elle va être compressée automatiquement.");
    }
    
    // Afficher un indicateur de chargement
    this.isProcessingPhoto = true;
    
    try {
        // Compresser l'image
        const compressedImage = await this.compressImage(file, 400, 400, 0.7);
        this.originalPhoto = compressedImage;
        
        const blob = this.dataURLtoBlob(compressedImage);
        const formData = new FormData();
        formData.append('photo', blob, 'photo_compressée.jpg');
        
        // Appel au backend pour le traitement ML
        this.apiService.traiterPhotoProfessionnelle(formData).subscribe({
            next: (result) => {
                this.processedPhoto = result.photoUrl || result.image_professionnelle;
                this.isProcessingPhoto = false;
                
                // Ouvrir automatiquement la modale de confirmation
                this.showPhotoConfirmationModal = true;
            },
            error: (err) => {
                console.error('Erreur ML:', err);
                // Fallback: utiliser l'image compressée originale
                if (this.originalPhoto) {
                    this.cvData.photo = this.originalPhoto;
                    this.cvData.photoName = file.name.replace(/\.[^/.]+$/, '') + '_compressée.jpg';
                }
                alert('Photo ajoutée (version compressée)');
                this.isProcessingPhoto = false;
            }
        });
        
    } catch (error) {
        console.error('Erreur compression:', error);
        alert('Erreur lors du traitement de l\'image');
        this.isProcessingPhoto = false;
    }
}

// ==================== COMPRESSION D'IMAGE ====================

/**
 * Redimensionner et compresser une image depuis un fichier
 * @param file - Le fichier image à compresser
 * @param maxWidth - Largeur maximale (défaut: 400px)
 * @param maxHeight - Hauteur maximale (défaut: 400px)
 * @param quality - Qualité JPEG (0.1 à 1.0, défaut: 0.7)
 * @returns Promise avec le base64 compressé
 */
compressImage(file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e: any) => {
            const img = new Image();
            img.onload = () => {
                // Calculer les nouvelles dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                // Créer un canvas pour redimensionner
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Convertir en JPEG compressé
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Redimensionner une image depuis base64 (pour la caméra)
 * @param base64 - L'image en base64
 * @param maxWidth - Largeur maximale
 * @param maxHeight - Hauteur maximale
 * @param quality - Qualité JPEG
 * @returns Promise avec le base64 compressé
 */
compressImageFromBase64(base64: string, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = base64;
    });
}

// Ajoutez cette méthode de validation
validateCvForm(): boolean {
    const errors: string[] = [];
    
    // 1. Vérification du nom
    if (!this.cvData.nom || this.cvData.nom.trim() === '') {
        errors.push('❌ Le nom est obligatoire');
    } else if (this.cvData.nom.length < 2) {
        errors.push('❌ Le nom doit contenir au moins 2 caractères');
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(this.cvData.nom)) {
        errors.push('❌ Le nom ne doit contenir que des lettres');
    }
    
    // 2. Vérification du prénom
    if (!this.cvData.prenom || this.cvData.prenom.trim() === '') {
        errors.push('❌ Le prénom est obligatoire');
    } else if (this.cvData.prenom.length < 2) {
        errors.push('❌ Le prénom doit contenir au moins 2 caractères');
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(this.cvData.prenom)) {
        errors.push('❌ Le prénom ne doit contenir que des lettres');
    }
    
    // 3. Vérification de l'email
    if (!this.cvData.email || this.cvData.email.trim() === '') {
        errors.push('❌ L\'email est obligatoire');
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.cvData.email)) {
        errors.push('❌ Format d\'email invalide (ex: nom@domaine.com)');
    }
    
    // 4. Vérification du téléphone (optionnel mais format doit être valide si présent)
    if (this.cvData.telephone && this.cvData.telephone.trim() !== '') {
        if (!/^(\+216)?[\s]?[0-9]{8}$|^[0-9]{8}$/.test(this.cvData.telephone)) {
            errors.push('❌ Format téléphone invalide (ex: +216 55 555 555, 55555555)');
        }
    }
    
    // 5. Vérification du profil
    if (!this.cvData.profil || this.cvData.profil.trim() === '') {
        errors.push('❌ Le profil est obligatoire');
    } else if (this.cvData.profil.length < 20) {
        errors.push('❌ Le profil doit contenir au moins 20 caractères');
    }
    
    // 6. Vérification des compétences
    if (this.cvData.competences.length === 0) {
        errors.push('❌ Ajoutez au moins une compétence');
    }
    
    // 7. Vérification des expériences
    if (this.cvData.experiences.length === 0) {
        errors.push('❌ Ajoutez au moins une expérience professionnelle');
    }
    
    // 8. Vérification des formations
    if (this.cvData.formations.length === 0) {
        errors.push('❌ Ajoutez au moins une formation');
    }
    
    // Afficher les erreurs
    if (errors.length > 0) {
        this.showMessage(errors.join('\n'), 'error');
        return false;
    }
    
    return true;
}
}