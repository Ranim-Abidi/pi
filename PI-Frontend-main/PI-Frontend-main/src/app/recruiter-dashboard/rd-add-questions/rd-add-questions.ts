import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';

interface QuestionForm {
  contenu: string;
  type: string;
  choix: string[];
  bonneReponse: string;
  bonneReponses: number[]; // pour QCM, plusieurs réponses correctes
  niveau: string;
  points: number;
  ordre: number;
}

interface ValidationErrors {
  contenu?: string[];
  type?: string[];
  niveau?: string[];
  domaine?: string[];
  choix?: string[];
  bonneReponse?: string[];
  points?: string[];
  general?: string[];
}

interface AiAssistantForm {
  categorie: string;
  niveau: string;
  type: string;
  theme: string;
  nombre: number;
  temperature: number;
}

interface ChatMessage {
  sender: 'assistant' | 'user';
  text: string;
  timestamp: Date;
}

interface ChatRequestHints {
  wantsGeneration: boolean;
  type?: 'QCM' | 'QCU' | 'VRAI_FAUX';
  niveau?: 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'EXPERT';
  categorie?: 'TECHNIQUE' | 'RH' | 'MANAGERIAL' | 'FINAL' | 'PRESELECTION' | 'TEST';
  nombre?: number;
  theme?: string;
}

@Component({
  selector: 'app-rd-add-questions',
  imports: [CommonModule, FormsModule],
  templateUrl: './rd-add-questions.html',
  styleUrls: ['./rd-add-questions.scss'],
})
export class RdAddQuestions implements OnInit, OnDestroy {
  entretienId = 0;
  domaines: any[] = [
    { id: 1, nom: 'INFORMATIQUE' },
    { id: 2, nom: 'BUSINESS' },
    { id: 3, nom: 'SANTÉ' },
    { id: 4, nom: 'INGÉNIERIE' },
    { id: 5, nom: 'ÉDUCATION' },
    { id: 6, nom: 'DESIGN' },
    { id: 7, nom: 'COMMUNICATION' },
    { id: 8, nom: 'INDUSTRIE' },
    { id: 9, nom: 'COMMERCE' },
    { id: 10, nom: 'AUTRE' }
  ];
  typesQuestion = ['QCM', 'QCU', 'VRAI_FAUX'];
  categoriesEntretien = ['TECHNIQUE', 'RH', 'MANAGERIAL', 'FINAL', 'PRESELECTION', 'TEST'];
  niveaux = ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT'];
  newQuestion: QuestionForm = {
    contenu: '',
    type: '',
    choix: ['', '', '', ''],
    bonneReponse: '',
    bonneReponses: [],
    niveau: '',
    points: 1,
    ordre: 1
  };
  validationErrors: ValidationErrors = {};
  questions: any[] = [];
  editingQuestion: any = null;
  aiSuggestions: any[] = [];
  isAiGenerating = false;
  aiError = '';
  isChatbotOpen = false;
  chatUserInput = '';
  chatMessages: ChatMessage[] = [
    {
      sender: 'assistant',
      text:
        'Renseignez type, theme (au moins 3 caracteres), categorie, niveau : les propositions sont generees automatiquement via l API. ' +
        'Le bouton Generer force une mise a jour immediate. Utilisez Envoyer pour une conversation libre avec l assistant.',
      timestamp: new Date()
    }
  ];
  aiForm: AiAssistantForm = {
    categorie: 'TECHNIQUE',
    niveau: 'INTERMEDIAIRE',
    type: 'QCM',
    theme: '',
    nombre: 3,
    temperature: 0.4
  };
  quickThemes = [
    'SQL et optimisation des requetes',
    'API REST Java Spring Boot',
    'Angular TypeScript architecture',
    'Tests unitaires et integration',
    'Soft skills et communication'
  ];

  private readonly autoGenerate$ = new Subject<void>();
  private autoGenerateSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.entretienId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.entretienId || isNaN(this.entretienId) || this.entretienId <= 0) {
      console.error('❌ ID entretien invalide depuis la route:', this.route.snapshot.paramMap.get('id'));
      alert('ID d\'entretien invalide. Retour à la liste des entretiens.');
      this.goBack();
      return;
    }
    this.loadDomaines();
    this.loadQuestions();
    this.setupAutoAiGeneration();
  }

  ngOnDestroy(): void {
    this.autoGenerateSub?.unsubscribe();
    this.autoGenerateSub = null;
  }

  /** Declenche une generation API debounced quand les champs changent (panneau ouvert). */
  scheduleAutoAiGeneration(): void {
    if (!this.isChatbotOpen) {
      return;
    }
    this.autoGenerate$.next();
  }

  private setupAutoAiGeneration(): void {
    this.autoGenerateSub?.unsubscribe();
    this.autoGenerateSub = this.autoGenerate$
      .pipe(
        debounceTime(650),
        map(() => this.buildAiGenerationPayload(3)),
        tap((built) => {
          if (!built) {
            this.aiSuggestions = [];
            this.aiError = '';
          }
        }),
        filter((built): built is { payload: any; theme: string } => built !== null),
        distinctUntilChanged((a, b) => JSON.stringify(a.payload) === JSON.stringify(b.payload)),
        switchMap((built) => {
          this.isAiGenerating = true;
          this.aiError = '';
          return this.apiService.generateAiQuestionSuggestions(this.entretienId, built.payload).pipe(
            map((data) => ({ ok: true as const, data })),
            catchError((error) => of({ ok: false as const, error }))
          );
        })
      )
      .subscribe((result) => {
        this.isAiGenerating = false;
        if (result.ok) {
          this.aiSuggestions = Array.isArray(result.data) ? result.data : [];
          if (!this.aiSuggestions.length) {
            this.aiError = 'Aucune suggestion IA recue.';
            this.addChatMessage('assistant', this.aiError);
          } else {
            this.aiError = '';
          }
        } else {
          const err = result.error;
          const backendMessage =
            typeof err?.error === 'string'
              ? err.error
              : (err?.error?.message || err?.error?.detail || err?.message || 'Erreur inconnue');
          const status = err?.status ?? '?';
          this.aiError = `Erreur IA (${status}): ${backendMessage}`;
          this.aiSuggestions = [];
          this.addChatMessage('assistant', this.aiError);
        }
      });
  }

  /**
   * Construit le payload pour l API de generation.
   * @param minThemeLength longueur minimale du theme (1 = clic manuel Generer, 3 = saisie auto)
   */
  private buildAiGenerationPayload(minThemeLength: number): { payload: any; theme: string } | null {
    if (this.newQuestion.type) {
      this.aiForm.type = this.newQuestion.type;
    }
    if (this.newQuestion.niveau) {
      this.aiForm.niveau = this.newQuestion.niveau;
    }

    const currentTheme = String(this.aiForm.theme || '').trim();
    if (!currentTheme || currentTheme.length < minThemeLength) {
      return null;
    }

    const effectiveTheme = currentTheme || this.extractThemeFromMessage(this.chatUserInput);
    const normalizedTheme = this.normalizeThemeForApi(effectiveTheme);
    this.aiForm.theme = normalizedTheme;

    const nombre = Number(this.aiForm.nombre);
    const temperature = Number(this.aiForm.temperature);
    const payload = {
      categorie: String(this.aiForm.categorie || 'TECHNIQUE').trim().toUpperCase(),
      niveau: String(this.aiForm.niveau || 'INTERMEDIAIRE').trim().toUpperCase(),
      type: this.normalizeAiType(this.aiForm.type),
      theme: normalizedTheme,
      nombre: Number.isFinite(nombre) ? Math.max(1, Math.min(10, Math.trunc(nombre))) : 3,
      temperature: Number.isFinite(temperature) ? Math.max(0.1, Math.min(1.0, temperature)) : 0.4
    };

    return { payload, theme: normalizedTheme };
  }

  loadDomaines(): void {
    console.log('🔄 Chargement des domaines depuis le backend...');
    this.apiService.getDomaines().subscribe({
      next: (data: any) => {
        console.log('📥 Réponse brute du backend:', data);
        console.log('📥 Type de data:', typeof data);
        console.log('📥 Est un array?', Array.isArray(data));
        console.log('📥 Longueur:', data?.length);
        
        // Si le backend retourne un array d'objets avec id et nom
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('📍 Premier élément:', data[0]);
          console.log('📍 Type du premier élément:', typeof data[0]);
          console.log('📍 Keys du premier élément:', Object.keys(data[0] || {}));
          
          if (data[0].nom !== undefined) {
            console.log('✅ Format correct détecté (avec propriété "nom")');
            this.domaines = data;
          } else if (typeof data[0] === 'string') {
            console.log('✅ Array de strings détecté, conversion en cours...');
            this.domaines = data.map((nom: string, id: number) => ({ id: id + 1, nom }));
          } else {
            console.warn('⚠️ Format non reconnu, utilisation du fallback');
            this.useFallbackDomaines();
          }
        } else {
          console.warn('⚠️ Data vide ou non-array, utilisation du fallback');
          this.useFallbackDomaines();
        }
        
        console.log('✅ Domaines finaux pour le select:', this.domaines);
        console.log('✅ Nombre de domaines:', this.domaines.length);
      },
      error: (error: any) => {
        console.error('❌ Erreur lors du chargement des domaines:', error);
        console.error('📍 Status:', error.status);
        console.error('📍 Message:', error.message);
        console.error('📍 Error object:', error);
        this.useFallbackDomaines();
      }
    });
  }

  private useFallbackDomaines(): void {
    console.log('🔧 Utilisation des domaines par défaut (fallback)');
    this.domaines = [
      { id: 1, nom: 'INFORMATIQUE' },
      { id: 2, nom: 'BUSINESS' },
      { id: 3, nom: 'SANTÉ' },
      { id: 4, nom: 'INGÉNIERIE' },
      { id: 5, nom: 'ÉDUCATION' },
      { id: 6, nom: 'DESIGN' },
      { id: 7, nom: 'COMMUNICATION' },
      { id: 8, nom: 'INDUSTRIE' },
      { id: 9, nom: 'COMMERCE' },
      { id: 10, nom: 'Autre' }
    ];
    console.log('✅ Fallback domaines chargés:', this.domaines);
  }

  loadQuestions(): void {
    this.apiService.getQuestionsByEntretien(this.entretienId).subscribe({
      next: (data) => this.questions = data,
      error: (error) => console.error('Error loading questions', error)
    });
  }

  getCorrectAnswers(question: any): string {
    if (Array.isArray(question.choix)) {
      const correctChoices = question.choix
        .filter((c: any) => c.correcte === true || c.correct === true || c.isCorrecte === true)
        .map((c: any) => c.texte || c.contenu || c);
      if (correctChoices.length > 0) {
        return correctChoices.join(', ');
      }
    }

    if (question.type === 'QCU' || question.type === 'VRAI_FAUX') {
      // Cas QCU / Vrai-Faux où la cible est dans question.bonneReponse.
      if (question.bonneReponse) {
        return question.bonneReponse;
      }
      // si question.choix contient bools, retourne l'option correcte
      if (Array.isArray(question.choix)) {
        const firstCorrect = question.choix.find((c: any) => c.correcte === true || c.correct === true || c.isCorrecte === true);
        if (firstCorrect) {
          return firstCorrect.texte || firstCorrect.contenu || firstCorrect;
        }
      }
    }

    // Utilise fallback de la propriété ancienne si présente
    if (question.bonneReponse) {
      return question.bonneReponse;
    }

    return '-';
  }

  getChoiceText(choice: any): string {
    if (choice == null) {
      return '';
    }
    if (typeof choice === 'string') {
      return choice;
    }
    return choice.texte || choice.contenu || JSON.stringify(choice);
  }

  getSuggestionTypeLabel(suggestion: any): string {
    return this.normalizeDisplayType(suggestion?.type || this.aiForm.type || 'QCM');
  }

  getSuggestionChoices(suggestion: any): string[] {
    const choices = Array.isArray(suggestion?.choix) ? suggestion.choix : [];
    return choices
      .map((choice: any) => this.getChoiceText(choice))
      .filter((text: string) => !!String(text || '').trim());
  }

  getSuggestionCorrectAnswers(suggestion: any): string {
    const choices = Array.isArray(suggestion?.choix) ? suggestion.choix : [];
    const correctChoices = choices
      .filter((choice: any) => choice?.correcte === true || choice?.correct === true || choice?.isCorrecte === true)
      .map((choice: any) => this.getChoiceText(choice))
      .filter((text: string) => !!String(text || '').trim());

    if (correctChoices.length) {
      return correctChoices.join(', ');
    }

    return '-';
  }

  editQuestion(question: any): void {
    this.editingQuestion = question;
    this.newQuestion.contenu = question.contenu || question.question || '';
    this.newQuestion.type = question.type || 'QCM';
    this.newQuestion.niveau = question.niveau || '';
    this.newQuestion.choix = (Array.isArray(question.choix) ? question.choix.map((c: any) => c.texte || c.contenu || c) : ['', '', '', '']).slice();
    this.newQuestion.bonneReponse = question.bonneReponse || '';
    this.newQuestion.points = question.points || 1;
    this.newQuestion.ordre = question.ordre || 1;

    this.newQuestion.bonneReponses = (Array.isArray(question.choix)
      ? question.choix.map((c: any, i: number) => c.correcte || c.correct === true || c.isCorrecte === true ? i : -1).filter((i: number) => i >= 0)
      : []);
  }

  deleteQuestion(questionId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
      return;
    }
    this.apiService.deleteQuestion(questionId).subscribe({
      next: () => {
        this.questions = this.questions.filter(q => q.id !== questionId);
        alert('Question supprimée.');
      },
      error: error => {
        console.error('Error deleting question', error);
        alert('Erreur lors de la suppression de la question.');
      }
    });
  }

  private buildQuestionDto(): any {
    // Récupérer le domaine correctement
    let domaine = '';
    
    console.log('🏗️ buildQuestionDto() - Building payload');
    
    // Domaine est défini par l'entretien parent. ne pas envoyer domaine dans question.

    let choixDTO: any[] = [];

    if (this.newQuestion.type === 'VRAI_FAUX') {
      choixDTO = [
        { texte: 'VRAI', correcte: this.newQuestion.bonneReponse === 'VRAI', ordre: 1 },
        { texte: 'FAUX', correcte: this.newQuestion.bonneReponse === 'FAUX', ordre: 2 }
      ];
    } else {
      choixDTO = this.newQuestion.choix
        .map((texte, i) => ({
          texte: texte.trim(),
          correcte: this.newQuestion.type === 'QCM'
            ? this.newQuestion.bonneReponses.includes(i)
            : this.newQuestion.bonneReponse.trim() !== '' && this.newQuestion.bonneReponse.trim() === texte.trim(),
          ordre: i + 1
        }))
        .filter(c => c.texte);
    }

    const payload: any = {
      contenu: this.newQuestion.contenu.trim(),
      type: this.newQuestion.type,
      niveau: this.newQuestion.niveau,
      ordre: this.newQuestion.ordre || 1,
      actif: true,
      points: this.newQuestion.points,
      choix: choixDTO
    };

    console.log('📤 Payload finalisé:', payload);
    console.log('   Domaine field in payload:', payload.domaine);
    console.log('   Payload JSON:', JSON.stringify(payload));

    if (this.newQuestion.type === 'QCM') {
      payload.bonneReponses = this.newQuestion.bonneReponses;
      if (!payload.bonneReponse && this.newQuestion.bonneReponses.length > 0 && choixDTO.length > 0) {
        payload.bonneReponse = choixDTO[this.newQuestion.bonneReponses[0]]?.texte;
      }

      // Harmonisation des choix QCM : au moins 1 correcte est déjà garantis côté backend
      if (!payload.bonneReponse && choixDTO.length > 0 && choixDTO.some(c => c.correcte)) {
        payload.bonneReponse = choixDTO.find(c => c.correcte)!.texte;
      }
    } else {
      payload.bonneReponse = this.newQuestion.bonneReponse;
    }

    return payload;
  }

  cancelEdit(): void {
    this.editingQuestion = null;
    this.resetQuestionForm();
    this.validationErrors = {};
  }

  /**
   * Valide tous les champs du formulaire
   * @returns true si la validation réussit, false sinon
   */
  private validateForm(): boolean {
    this.validationErrors = {};
    let isValid = true;

    // Validation du contenu
    const contenuTrimmed = this.newQuestion.contenu.trim();
    if (!contenuTrimmed) {
      this.validationErrors.contenu = ['Le contenu est obligatoire'];
      isValid = false;
    } else if (contenuTrimmed.length < 10) {
      this.validationErrors.contenu = ['Le contenu doit contenir au minimum 10 caractères'];
      isValid = false;
    } else if (contenuTrimmed.length > 1000) {
      this.validationErrors.contenu = ['Le contenu doit contenir au maximum 1000 caractères'];
      isValid = false;
    }

    // Validation du type
    if (!this.newQuestion.type) {
      this.validationErrors.type = ['Le type de question est obligatoire'];
      isValid = false;
    }

    // Validation du niveau
    if (!this.newQuestion.niveau) {
      this.validationErrors.niveau = ['Le niveau est obligatoire'];
      isValid = false;
    }

    // Validation des points
    if (!this.newQuestion.points || this.newQuestion.points < 1 || this.newQuestion.points > 100) {
      this.validationErrors.points = ['Les points doivent être entre 1 et 100'];
      isValid = false;
    }

    // Domaine géré par l'entretien parent, on ignore la validation sur la question.

    // Validation des réponses
    if (this.newQuestion.type === 'QCM') {
      if (this.newQuestion.bonneReponses.length === 0) {
        this.validationErrors.bonneReponse = ['Sélectionnez au moins une réponse correcte pour QCM'];
        isValid = false;
      }
      // Vérifier qu'il y a au moins 2 choix et que sont non-vides
      const validChoices = this.newQuestion.choix.filter((c: string) => c.trim());
      if (validChoices.length < 2) {
        this.validationErrors.choix = ['QCM doit avoir au moins 2 réponses'];
        isValid = false;
      }
    } else if (this.newQuestion.type === 'QCU') {
      if (!this.newQuestion.bonneReponse) {
        this.validationErrors.bonneReponse = ['Sélectionnez la bonne réponse pour QCU'];
        isValid = false;
      }
      const validChoices = this.newQuestion.choix.filter((c: string) => c.trim());
      if (validChoices.length < 2) {
        this.validationErrors.choix = ['QCU doit avoir au moins 2 réponses'];
        isValid = false;
      }
    } else if (this.newQuestion.type === 'VRAI_FAUX') {
      if (!this.newQuestion.bonneReponse) {
        this.validationErrors.bonneReponse = ['Sélectionnez Vrai ou Faux'];
        isValid = false;
      }
    }

    if (!isValid) {
      this.scrollToFirstError();
    }

    return isValid;
  }

  /**
   * Scroll vers le premier champ avec erreur
   */
  private scrollToFirstError(): void {
    const firstErrorKey = Object.keys(this.validationErrors)[0];
    if (firstErrorKey) {
      const element = document.querySelector(`[data-validation-field="${firstErrorKey}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /**
   * Retourne les erreurs pour un champ spécifique
   */
  getFieldErrors(fieldName: keyof ValidationErrors): string[] {
    return this.validationErrors[fieldName] || [];
  }

  /**
   * Vérifie si un champ a une erreur
   */
  hasFieldError(fieldName: keyof ValidationErrors): boolean {
    return (this.validationErrors[fieldName] || []).length > 0;
  }

  saveQuestion(): void {
    // STEP 1: Log form state before validation
    console.log('🔍 STEP 1 - Form validation started');

    // Valider le formulaire en premier
    if (!this.validateForm()) {
      console.warn('❌ Validation failed:', this.validationErrors);
      return;
    }

    console.log('✅ STEP 2 - Form validation passed');

    if (this.editingQuestion) {
      const payload = this.buildQuestionDto();
      console.log('🔍 STEP 3 - Final payload ready (UPDATE):', payload);
      console.log('  Payload.domaine:', payload.domaine, '(type:', typeof payload.domaine + ')');
      this.apiService.updateQuestion(this.editingQuestion.id, payload).subscribe({
        next: (res) => {
          console.log('✅ Question updated successfully');
          this.loadQuestions();
          this.editingQuestion = null;
          this.resetQuestionForm();
          this.validationErrors = {};
          alert('Question modifiée avec succès !');
        },
        error: (error) => {
          console.error('❌ Error updating question', error);
          console.error('🔻 backend error body:', JSON.stringify(error.error));
          console.error('🔻 status:', error.status, error.statusText);

          if (error.status === 403) {
            alert(`❌ Accès refusé (403). Veuillez vous reconnecter en tant que Recruteur.`);
            localStorage.removeItem('token');
            window.location.href = '/';
          } else if (error.status === 401) {
            alert('❌ Non autorisé (401). Token invalide. Veuillez vous reconnecter.');
            localStorage.removeItem('token');
            window.location.href = '/';
          } else if (error.status === 500) {
            const backendMsg = error.error?.message || error.error?.msg || 'Erreur serveur';
            console.error('💥 Backend validation error:', backendMsg);
            alert(`❌ Erreur serveur (500): ${backendMsg}\n\nVérifiez la console pour plus de détails.`);
          } else {
            const backendMessage = typeof error.error === 'string' ? error.error : (error.error?.message || JSON.stringify(error.error));
            alert(`Erreur lors de la mise à jour: ${backendMessage || error.message || error.statusText}`);
          }
        }
      });
      return;
    }

    // Création d'une nouvelle question
    const createDto = {
      ...this.buildQuestionDto(),
      entretienId: this.entretienId
    };
    console.log('🔍 STEP 3 - Final payload ready (CREATE):', createDto);
    console.log('  Payload.domaine:', createDto.domaine, '(type:', typeof createDto.domaine + ')');
    console.log('  Payload keys:', Object.keys(createDto));
    this.apiService.createQuestion(createDto).subscribe({
      next: (response) => {
        alert('✅ Question ajoutée avec succès!');
        this.questions.push(response);
        this.resetQuestionForm();
        this.validationErrors = {};
      },
      error: (error) => {
        console.error('❌ Error creating question', error);
        console.error('🔻 backend error body:', JSON.stringify(error.error));
        console.error('🔻 status:', error.status, error.statusText);

        if (error.status === 403) {
          alert(`❌ Accès refusé (403). Veuillez vous reconnecter en tant que Recruteur.`);
          localStorage.removeItem('token');
          window.location.href = '/';
        } else if (error.status === 401) {
          alert('❌ Non autorisé (401). Token invalide. Veuillez vous reconnecter.');
          localStorage.removeItem('token');
          window.location.href = '/';
        } else if (error.status === 500) {
          const backendMsg = error.error?.message || error.error?.msg || 'Erreur serveur';
          console.error('💥 Backend validation error:', backendMsg);
          alert(`❌ Erreur serveur (500): ${backendMsg}\n\nVérifiez la console pour plus de détails.`);
        } else {
          const backendMessage = typeof error.error === 'string' ? error.error : (error.error?.message || JSON.stringify(error.error));
          alert(`Erreur lors de la création de la question: ${backendMessage || error.message || error.statusText}`);
        }
      }
    });
  }

  addChoice(): void {
    if (this.newQuestion.type === 'VRAI_FAUX') {
      return;
    }
    this.newQuestion.choix.push('');
  }

  removeChoice(index: number): void {
    if (this.newQuestion.choix.length > 2) {
      this.newQuestion.choix.splice(index, 1);
    }
  }

  private resetQuestionForm(): void {
    this.newQuestion = {
      contenu: '',
      type: '',
      choix: ['', '', '', ''],
      bonneReponse: '',
      bonneReponses: [],
      niveau: '',
      points: 1,
      ordre: 1
    };
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  trackByDomaine(index: number, domaine: any): any {
    return domaine?.id;
  }

  toggleCorrectChoice(index: number): void {
    const pos = this.newQuestion.bonneReponses.indexOf(index);
    if (pos > -1) {
      this.newQuestion.bonneReponses.splice(pos, 1);
    } else {
      this.newQuestion.bonneReponses.push(index);
    }
  }

  onQuestionTypeChange(): void {
    this.aiForm.type = this.newQuestion.type || this.aiForm.type;
    if (this.newQuestion.type !== 'QCM') {
      this.newQuestion.bonneReponses = [];
    }
    if (this.newQuestion.type === 'VRAI_FAUX') {
      this.newQuestion.choix = [];
    } else if (this.newQuestion.type !== 'VRAI_FAUX' && this.newQuestion.choix.length < 2) {
      this.newQuestion.choix = ['', '', '', ''];
    }
  }

  private normalizeAiType(type: string): string {
    const normalized = String(type || '').trim().toUpperCase();
    if (normalized === 'VRAI_FAUX') {
      return 'VF';
    }
    return normalized || 'QCM';
  }

  private normalizeDisplayType(type: string): string {
    const normalized = String(type || '').trim().toUpperCase();
    if (normalized === 'VF') {
      return 'VRAI_FAUX';
    }
    return normalized || 'QCM';
  }

  private normalizeThemeForApi(theme: string): string {
    const value = String(theme || '').trim();
    if (!value || this.isGreetingOrSmallTalk(value)) {
      return 'Entretien technique';
    }
    return value;
  }

  private isGreetingOrSmallTalk(message: string): boolean {
    const normalized = String(message || '').trim().toLowerCase();
    if (!normalized) {
      return true;
    }

    const smallTalkPatterns = [
      /^bonjour!?$/,
      /^salut!?$/,
      /^hello!?$/,
      /^hi!?$/,
      /^coucou!?$/,
      /^bonsoir!?$/,
      /^merci!?$/,
      /^ok!?$/,
      /^ca va\??$/,
      /^salam!?$/
    ];

    return smallTalkPatterns.some((pattern) => pattern.test(normalized));
  }

  generateAiSuggestions(): void {
    this.aiError = '';
    const built = this.buildAiGenerationPayload(1);
    if (!built) {
      this.aiError = 'Indiquez un theme (ex: SQL, Angular, gestion d equipe) avant de generer.';
      this.addChatMessage('assistant', this.aiError);
      return;
    }

    this.isAiGenerating = true;

    this.apiService.generateAiQuestionSuggestions(this.entretienId, built.payload).subscribe({
      next: (data) => {
        this.aiSuggestions = Array.isArray(data) ? data : [];
        if (!this.aiSuggestions.length) {
          this.aiError = 'Aucune suggestion IA recue.';
          this.addChatMessage('assistant', this.aiError);
        } else {
          this.addChatMessage('assistant', `${this.aiSuggestions.length} proposition(s) generee(s). Cliquez sur Utiliser pour remplir le formulaire.`);
        }
        this.isAiGenerating = false;
      },
      error: (error) => {
        const backendMessage = typeof error?.error === 'string'
          ? error.error
          : (error?.error?.message || error?.error?.detail || error?.message || 'Erreur inconnue');
        const status = error?.status ?? '?';
        this.aiError = `Erreur IA (${status}): ${backendMessage}`;
        this.aiSuggestions = [];
        this.isAiGenerating = false;
        this.addChatMessage('assistant', this.aiError);
      }
    });
  }

  applyAiSuggestion(suggestion: any): void {
    const type = this.normalizeDisplayType(suggestion?.type || 'QCM');
    const choix = Array.isArray(suggestion?.choix) ? suggestion.choix : [];
    const normalizedChoices = choix.map((c: any) => this.getChoiceText(c)).filter((text: string) => !!text.trim());

    this.newQuestion.contenu = suggestion?.contenu || '';
    this.newQuestion.type = type;
    this.newQuestion.niveau = suggestion?.niveau || this.aiForm.niveau;
    this.newQuestion.points = suggestion?.points || 1;
    this.newQuestion.ordre = suggestion?.ordre || (this.questions.length + 1);

    if (type === 'VRAI_FAUX') {
      const firstCorrect = choix.find((c: any) => c?.correcte === true || c?.correct === true || c?.isCorrecte === true);
      this.newQuestion.choix = [];
      this.newQuestion.bonneReponses = [];
      this.newQuestion.bonneReponse = firstCorrect ? this.getChoiceText(firstCorrect).toUpperCase() : 'VRAI';
    } else if (type === 'QCU') {
      const firstCorrect = choix.find((c: any) => c?.correcte === true || c?.correct === true || c?.isCorrecte === true);
      this.newQuestion.choix = normalizedChoices.length ? normalizedChoices : ['', ''];
      this.newQuestion.bonneReponses = [];
      this.newQuestion.bonneReponse = firstCorrect ? this.getChoiceText(firstCorrect) : (this.newQuestion.choix[0] || '');
    } else {
      this.newQuestion.choix = normalizedChoices.length ? normalizedChoices : ['', '', ''];
      this.newQuestion.bonneReponse = '';
      this.newQuestion.bonneReponses = [];
      choix.forEach((c: any, index: number) => {
        if (c?.correcte === true || c?.correct === true || c?.isCorrecte === true) {
          this.newQuestion.bonneReponses.push(index);
        }
      });
      if (!this.newQuestion.bonneReponses.length && this.newQuestion.choix.length) {
        this.newQuestion.bonneReponses = [0];
      }
    }

    this.validationErrors = {};
    this.editingQuestion = null;
    this.addChatMessage('assistant', 'Proposition appliquee dans le formulaire. Vous pouvez maintenant enregistrer la question.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  applyQuickPrompt(prompt: string): void {
    const value = String(prompt || '').trim();
    if (!value) {
      return;
    }
    this.chatUserInput = value;
    this.aiForm.theme = value;
    this.isChatbotOpen = true;
    this.scheduleAutoAiGeneration();
  }

  private extractThemeFromMessage(message: string): string {
    const raw = String(message || '').trim();
    if (!raw) {
      return 'Entretien technique';
    }

    const lowered = raw.toLowerCase();
    const cleaned = lowered
      .replace(/\b(genere|génère|cree|crée|donne|donnez|propose|produis|fais|faites)\b/g, ' ')
      .replace(/\b(question|questions|qcm|qcu|vf|vrai faux|vrai\/faux|entretien|chatbot|ia|assistant)\b/g, ' ')
      .replace(/\b(sur|de|des|du|pour|avec|niveau|theme|thème|type|categorie|catégorie)\b/g, ' ')
      .replace(/\b(debutant|débutant|intermediaire|intermédiaire|avance|avancé|expert|junior|senior)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 3) {
      return '';
    }

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  private normalizeForIntent(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s/_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseNombreFromMessage(normalizedMessage: string): number | undefined {
    const explicit = normalizedMessage.match(/\b(?:genere|cree|donne|produis|fais)\s+(\d{1,2})\b/);
    const generic = normalizedMessage.match(/\b(10|[1-9])\b/);
    const raw = explicit?.[1] || generic?.[1];
    if (!raw) {
      const wordsMap: Record<string, number> = {
        un: 1,
        une: 1,
        deux: 2,
        trois: 3,
        quatre: 4,
        cinq: 5,
        six: 6,
        sept: 7,
        huit: 8,
        neuf: 9,
        dix: 10
      };
      const key = Object.keys(wordsMap).find((word) => new RegExp(`\\b${word}\\b`).test(normalizedMessage));
      if (!key) {
        return undefined;
      }
      return wordsMap[key];
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return Math.max(1, Math.min(10, Math.trunc(parsed)));
  }

  private parseChatRequestHints(message: string): ChatRequestHints {
    const normalized = this.normalizeForIntent(message);
    const wantsGeneration = /\b(genere|generer|cree|creer|donne|produis|fais|fabrique|propose|question|questions|qcm|qcu|vf|vrai faux)\b/.test(normalized);

    let type: ChatRequestHints['type'];
    if (/\b(vrai faux|vrai_faux|vrai\/faux|\bvf\b|true false)\b/.test(normalized)) {
      type = 'VRAI_FAUX';
    } else if (/\b(qcu|choix unique|une seule bonne reponse)\b/.test(normalized)) {
      type = 'QCU';
    } else if (/\b(qcm|choix multiple|choix multiples|plusieurs bonnes reponses)\b/.test(normalized)) {
      type = 'QCM';
    }

    let niveau: ChatRequestHints['niveau'];
    if (/\b(debutant|junior|facile)\b/.test(normalized)) {
      niveau = 'DEBUTANT';
    } else if (/\b(intermediaire|moyen)\b/.test(normalized)) {
      niveau = 'INTERMEDIAIRE';
    } else if (/\b(avance|senior|confirme)\b/.test(normalized)) {
      niveau = 'AVANCE';
    } else if (/\b(expert|tres avance)\b/.test(normalized)) {
      niveau = 'EXPERT';
    }

    let categorie: ChatRequestHints['categorie'];
    if (/\b(rh|recrutement|soft skills?)\b/.test(normalized)) {
      categorie = 'RH';
    } else if (/\b(managerial|management|leadership)\b/.test(normalized)) {
      categorie = 'MANAGERIAL';
    } else if (/\b(test|evaluation|quiz)\b/.test(normalized)) {
      categorie = 'TEST';
    } else if (/\b(technique|dev|developpement|code|programmation)\b/.test(normalized)) {
      categorie = 'TECHNIQUE';
    }

    const nombre = this.parseNombreFromMessage(normalized);
    const extractedTheme = this.extractThemeFromMessage(message);
    const normalizedExtractedTheme = this.normalizeForIntent(extractedTheme);
    const invalidThemeCandidate = /\b(genere|generer|generation|question|questions|qcm|qcu|vf|vrai faux|assistant|chatbot)\b/.test(normalizedExtractedTheme);
    const hasThemeInMessage = extractedTheme
      && extractedTheme.trim().length >= 3
      && !this.isGreetingOrSmallTalk(extractedTheme)
      && !invalidThemeCandidate;

    return {
      wantsGeneration,
      type,
      niveau,
      categorie,
      nombre,
      theme: hasThemeInMessage ? extractedTheme : undefined
    };
  }

  private isDefaultTheme(theme: string): boolean {
    const normalized = this.normalizeForIntent(theme);
    return !normalized || normalized === 'entretien technique';
  }

  private isLikelyConversationText(value: string): boolean {
    const raw = String(value || '').trim();
    if (!raw) {
      return true;
    }

    const normalized = this.normalizeForIntent(raw);
    if (!normalized) {
      return true;
    }

    if (raw.includes('?')) {
      return true;
    }

    return /\b(tu|vous|je|moi|toi|comment|pourquoi|quel|quelle|quoi|peux|peut|repond|parle|aide|aider|bonjour|salut|hello)\b/.test(normalized);
  }

  private resolveConversationTheme(selectedTheme: string): string {
    const value = String(selectedTheme || '').trim();
    if (!value || this.isDefaultTheme(value) || this.isLikelyConversationText(value)) {
      return 'Entretien technique';
    }
    return value;
  }

  toggleChatbot(): void {
    this.isChatbotOpen = !this.isChatbotOpen;
    if (this.isChatbotOpen) {
      setTimeout(() => this.scheduleAutoAiGeneration(), 0);
    }
  }

  closeChatbot(): void {
    this.isChatbotOpen = false;
  }

  sendChatMessage(): void {
    const message = this.chatUserInput.trim();
    if (!message) {
      return;
    }

    this.addChatMessage('user', message);
    this.chatUserInput = '';

    const selectedTheme = String(this.aiForm.theme || '').trim();
    const hints = this.parseChatRequestHints(message);

    if (hints.wantsGeneration) {
      if (hints.type) {
        this.aiForm.type = hints.type;
      }
      if (hints.niveau) {
        this.aiForm.niveau = hints.niveau;
      }
      if (hints.categorie) {
        this.aiForm.categorie = hints.categorie;
      }
      if (hints.nombre) {
        this.aiForm.nombre = hints.nombre;
      }

      const hintedTheme = String(hints.theme || '').trim();
      if (hintedTheme) {
        this.aiForm.theme = hintedTheme;
      }

      const effectiveTheme = String(this.aiForm.theme || '').trim();
      if (!effectiveTheme) {
        this.addChatMessage('assistant', 'Pour generer des questions, precisez d abord un theme (ex: developpement mobile, SQL JOIN, Angular services).');
        return;
      }

      this.addChatMessage('assistant', `Je lance la generation de questions sur "${effectiveTheme}".`);
      this.generateAiSuggestions();
      return;
    }

    const conversationalTheme = this.resolveConversationTheme(selectedTheme);

    this.isAiGenerating = true;
    this.apiService.chatRecruiterAssistant(message, {
      theme: conversationalTheme,
      type: this.aiForm.type,
      niveau: this.aiForm.niveau
    }).subscribe({
      next: (reply: string) => {
        this.addChatMessage('assistant', reply || 'Je suis la pour vous aider.');
        this.isAiGenerating = false;
      },
      error: () => {
        this.addChatMessage('assistant', 'Je n ai pas pu traiter votre demande pour le moment. Reessayez dans quelques instants.');
        this.isAiGenerating = false;
      }
    });
  }

  private addChatMessage(sender: 'assistant' | 'user', text: string): void {
    this.chatMessages.push({ sender, text, timestamp: new Date() });
  }

  goBack(): void {
    this.router.navigate(['/recruiter-dashboard/interviews']);
  }

  testAuth(): void {
    console.log('🔍 Testing authentication...');
    this.apiService.testAuth().subscribe({
      next: (response) => {
        console.log('✅ Auth test successful:', response);
        alert(`Authentification valide:\n- Authentifié: ${response.authenticated}\n- Autorités: ${response.authorities}\n- Nom: ${response.name}`);
      },
      error: (error) => {
        console.error('❌ Auth test failed:', error);
        alert(`Erreur d'authentification:\nStatus: ${error.status}\nMessage: ${error.error || error.message}`);
      }
    });
  }
}
