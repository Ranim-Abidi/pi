import {
  Component, Input, OnInit, OnDestroy, inject,
  ElementRef, ViewChild, AfterViewChecked
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Formation } from '../models/formation.model';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string;
  fileName?: string;
  fileExcerpt?: string;
  loading?: boolean;
  isInitial?: boolean;
  isEditing?: boolean;
  editContent?: string;
  editImageUrl?: string;
}

interface ChatSession {
  id:           number;
  sessionId:    string;
  sessionTitle: string;
  createdAt?:   string;
  messages:     ChatMessage[];
}

@Component({
  selector: 'app-chatbot-formation',
  standalone: false,
  templateUrl: './chatbot-formation.component.html',
  styleUrls: ['./chatbot-formation.component.scss']
})
export class ChatbotFormationComponent
  implements OnInit, OnDestroy, AfterViewChecked {

  @Input() formation!: Formation;
  @Input() context: 'video' | 'ecrite' = 'video';
  @Input() candidatId!: number | null;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private http = inject(HttpClient);

  isOpen = false;
  sessions: ChatSession[] = [];
  currentSessionId: string | null = null;
  messages: ChatMessage[] = [];
  inputText = '';
  selectedImageBase64: string | null = null;
  selectedFileBase64: string | null = null;   // base64 du fichier (PDF/Word)
  selectedFileName: string | null = null;     // nom du fichier
  selectedFileText: string | null = null;     // texte extrait (PDF.js ou fallback)
  isLoading = false;
  isRenamingSession = false;
  newSessionTitle = '';
  private shouldScrollToBottom = false;

  isListening = false;
  isSpeaking = false;
  voiceEnabled = false;
  showUploadOptions = false;
  private recognition: any = null;
  private synth: SpeechSynthesis = window.speechSynthesis;
  private voicesLoaded = false;

  private readonly base = '/api';

  readonly ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx,.csv';

  get quickSuggestions(): string[] {
    const titre = this.formation?.titre || 'cette formation';
    if (this.context === 'video') {
      return [
        `Résume la formation "${titre}"`,
        `Quels sont les prérequis pour cette formation ?`,
        `Quels projets puis-je faire après cette formation ?`,
        `Explique-moi les concepts clés de ${this.formation?.categorie}`,
      ];
    }
    return [
      `Explique-moi les bases de ${this.formation?.categorie}`,
      `Résume la documentation de cette formation`,
      `Donne-moi des exemples pratiques`,
      `Quelles sont les meilleures pratiques ?`,
    ];
  }

  ngOnInit(): void {
    this.synth.onvoiceschanged = () => { this.voicesLoaded = true; };
    if (this.synth.getVoices().length > 0) { this.voicesLoaded = true; }

    if (this.candidatId && this.formation?.id) {
      this.http.get<ChatSession[]>(`${this.base}/chatbot/history`, {
        params: {
          candidatId:  this.candidatId.toString(),
          formationId: this.formation.id.toString()
        }
      }).subscribe({
        next: (hist) => {
          if (hist && hist.length > 0) {
            this.sessions         = hist;
            this.currentSessionId = hist[0].sessionId;
            this.messages         = hist[0].messages || [];
            if (this.messages.length === 0) this.setInitialMessage();
            this.shouldScrollToBottom = true;
          } else {
            this.setInitialMessage();
          }
        },
        error: () => this.setInitialMessage()
      });
    } else {
      this.setInitialMessage();
    }
  }

  private setInitialMessage(): void {
    this.messages.push({
      role:    'assistant',
      content: `Bonjour ! Je suis votre assistant IA pour la formation **"${this.formation?.titre}"**.\n\nJe peux vous aider à :\n- Résumer des concepts\n- Expliquer des notions difficiles\n- Répondre à vos questions\n- Suggérer des exercices pratiques\n- Analyser des **images** liées à la formation\n- Analyser des **documents PDF ou Word** liés à la formation\n\nQue souhaitez-vous savoir ?`,
      isInitial: true
    });
  }

  ngOnDestroy(): void {
    this.stopListening();
    this.stopSpeaking();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.shouldScrollToBottom = true;
      setTimeout(() => this.focusInput(), 100);
    } else {
      this.stopListening();
      this.stopSpeaking();
    }
  }

  closeChat(): void {
    this.isOpen = false;
    this.stopListening();
    this.stopSpeaking();
  }

  sendMessage(text?: string): void {
    const msg = (text || this.inputText).trim();
    const image = text ? null : this.selectedImageBase64;
    const file  = text ? null : this.selectedFileBase64;
    const fname = text ? null : this.selectedFileName;
    const ftext = text ? null : this.selectedFileText;

    if (!msg && !image && !file) return;

    if (!text) {
      this.inputText           = '';
      this.selectedImageBase64 = null;
      this.selectedFileBase64  = null;
      this.selectedFileName    = null;
      this.selectedFileText    = null;
    }

    this.sendMessageWithAttachments(msg, image, file, fname, ftext);
  }

  sendMessageWithAttachments(
    text:        string,
    imageBase64: string | null,
    fileBase64:  string | null,
    fileName:    string | null,
    fileText:    string | null
  ): void {
    let msg = text.trim();
    if (!msg && !imageBase64 && !fileBase64) return;
    if (this.isLoading) return;

    this.stopSpeaking();

    if (imageBase64 && !msg) {
      msg = "Peux-tu analyser cette image s'il te plaît ?";
    }
    if (fileBase64 && !msg) {
      msg = `Peux-tu analyser ce document : ${fileName} ?`;
    }

    const userMsg: ChatMessage = {
      role:        'user',
      content:     msg,
      imageUrl:    imageBase64  || undefined,
      fileName:    fileName     || undefined,
      fileExcerpt: fileText     ? (fileText.length > 200 ? fileText.substring(0, 200) + '...' : fileText) : undefined
    };
    this.messages.push(userMsg);
    this.shouldScrollToBottom = true;

    const loadingMsg: ChatMessage = { role: 'assistant', content: '', loading: true };
    this.messages.push(loadingMsg);
    this.isLoading = true;

    // Historique pour le backend — les base64 bruts sont remplacés par des placeholders
    // pour éviter des payloads de 20MB+ qui causent des erreurs 500
    const history = this.messages
      .filter(m => !m.loading && m.content)
      .slice(-10)
      .map(m => {
        const obj: any = { role: m.role, content: m.content };
        // Remplacer les base64 par un placeholder (URL externe = OK, base64 = trop lourd)
        if (m.imageUrl) {
          obj.imageUrl = m.imageUrl.startsWith('data:') ? '[image:base64]' : m.imageUrl;
        }
        if (m.fileName)    obj.fileName    = m.fileName;
        if (m.fileExcerpt) obj.fileExcerpt = m.fileExcerpt;
        return obj;
      });

    // Tronquer fileText à 15 000 chars pour éviter les payloads trop lourds
    const truncatedFileText = fileText
      ? (fileText.length > 15000 ? fileText.substring(0, 15000) + '\n...[document tronqué]' : fileText)
      : null;

    // Ne pas envoyer le base64 brut si on a déjà le texte extrait (évite les payloads de 20MB+)
    const fileDataToSend = (truncatedFileText || !fileBase64) ? null : fileBase64;

    this.http.post<any>(`${this.base}/chatbot/formation`, {
      message:        msg,
      imageUrl:       imageBase64       || null,
      fileData:       fileDataToSend,              // base64 seulement si pas de texte extrait
      fileName:       fileName          || null,
      fileText:       truncatedFileText || null,   // texte extrait (tronqué à 15k chars)
      titreFormation: (this.formation?.titre     || '').trim(),
      categorie:      (this.formation?.categorie || '').trim(),
      niveau:         (this.formation?.niveau    || '').trim(),
      context:        this.context,
      formationId:    this.formation?.id,
      candidatId:     this.candidatId,
      sessionId:      this.currentSessionId,
      history
    }).subscribe({
      next: (resp) => {
        const replyText = resp.response || 'Désolé, je n\'ai pas pu répondre.';
        const idx = this.messages.indexOf(loadingMsg);
        if (idx !== -1) {
          this.messages[idx] = { role: 'assistant', content: replyText };
        }

        if (this.voiceEnabled) { this.speakMessage(replyText); }

        if (resp.sessionId && resp.sessionId !== this.currentSessionId) {
          this.currentSessionId = resp.sessionId;
          const existingSession = this.sessions.find(s => s.sessionId === resp.sessionId);
          if (!existingSession) {
            this.sessions.unshift({
              id: 0,
              sessionId: resp.sessionId,
              sessionTitle: resp.sessionTitle || msg.substring(0, 30),
              messages: this.messages,
              createdAt: new Date().toISOString()
            });
          }
        } else if (this.currentSessionId) {
          const session = this.sessions.find(s => s.sessionId === this.currentSessionId);
          if (session) session.messages = [...this.messages];
        }

        this.isLoading = false;
        this.shouldScrollToBottom = true;
      },
      error: () => {
        const idx = this.messages.indexOf(loadingMsg);
        if (idx !== -1) {
          this.messages[idx] = {
            role: 'assistant',
            content: 'Une erreur s\'est produite. Vérifiez votre connexion.'
          };
        }
        this.isLoading = false;
      }
    });
  }

  // ── Compatibilité avec l'ancienne méthode (image seule) ──────
  sendMessageWithImage(text: string, imageBase64: string | null): void {
    this.sendMessageWithAttachments(text, imageBase64, null, null, null);
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.currentSessionId    = null;
    this.messages            = [];
    this.selectedImageBase64 = null;
    this.selectedFileBase64  = null;
    this.selectedFileName    = null;
    this.selectedFileText    = null;
    this.stopSpeaking();
    this.setInitialMessage();
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/image\/*/)) {
      alert("Seules les images sont autorisées pour ce bouton.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          this.selectedImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
          // Effacer le fichier si une image est sélectionnée
          this.selectedFileBase64 = null;
          this.selectedFileName   = null;
          this.selectedFileText   = null;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  onDocumentSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Effacer l'image si un document est sélectionné
    this.selectedImageBase64 = null;
    this.selectedFileName    = file.name;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      // Lire directement en texte
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFileText   = e.target.result as string;
        this.selectedFileBase64 = null; // pas besoin du base64 pour les fichiers texte
      };
      reader.readAsText(file);
    } else if (ext === 'pdf') {
      // Lire en base64 ET tenter l'extraction via PDF.js (disponible en CDN)
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFileBase64 = e.target.result as string;
        this.extractPdfText(e.target.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Word, Excel, PPT, etc. : on envoie juste le base64 + nom
      // Le backend signalera que l'extraction n'est pas disponible
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFileBase64 = e.target.result as string;
        this.selectedFileText   = null;
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  }

  // ── Extraction texte PDF via PDF.js (CDN) ────────────────────
  private async extractPdfText(base64DataUrl: string): Promise<void> {
    try {
      // Charger PDF.js dynamiquement si pas encore chargé
      const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) {
        // Si PDF.js n'est pas chargé, on envoie sans texte extrait
        this.selectedFileText = null;
        return;
      }

      const base64 = base64DataUrl.split(',')[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const pdf  = await pdfjsLib.getDocument({ data: bytes }).promise;
      let   text = '';
      const maxPages = Math.min(pdf.numPages, 20); // max 20 pages

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page    = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        text += pageText + '\n';
      }

      this.selectedFileText = text.trim();
    } catch (err) {
      console.warn('PDF text extraction failed:', err);
      this.selectedFileText = null;
    }
  }

  removeSelectedImage(): void {
    this.selectedImageBase64 = null;
  }

  removeSelectedFile(): void {
    this.selectedFileBase64 = null;
    this.selectedFileName   = null;
    this.selectedFileText   = null;
  }

  // ── Obtenir l'icône selon l'extension du fichier ─────────────
  getFileIcon(fileName: string): string {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':  return 'ri-file-pdf-line';
      case 'doc':
      case 'docx': return 'ri-file-word-line';
      case 'xls':
      case 'xlsx': return 'ri-file-excel-line';
      case 'ppt':
      case 'pptx': return 'ri-file-ppt-line';
      case 'txt':
      case 'md':   return 'ri-file-text-line';
      case 'csv':  return 'ri-file-chart-line';
      default:     return 'ri-file-line';
    }
  }

  selectSession(event: any): void {
    const sessionId = event.target.value;
    if (!sessionId) {
      this.clearChat();
      return;
    }
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      this.currentSessionId     = sessionId;
      this.messages             = session.messages || [];
      if (this.messages.length === 0) this.setInitialMessage();
      this.shouldScrollToBottom = true;
    }
  }

  startRenaming(): void {
    if (!this.currentSessionId) return;
    const session = this.sessions.find(s => s.sessionId === this.currentSessionId);
    if (session) {
      this.newSessionTitle   = session.sessionTitle;
      this.isRenamingSession = true;
    }
  }

  cancelRenaming(): void { this.isRenamingSession = false; }

  saveRenamedSession(): void {
    if (!this.currentSessionId || !this.newSessionTitle.trim()) {
      this.cancelRenaming();
      return;
    }
    const session = this.sessions.find(s => s.sessionId === this.currentSessionId);
    if (session) {
      session.sessionTitle = this.newSessionTitle.trim();
      this.http.put(`${this.base}/chatbot/session/${this.currentSessionId}`, {
        sessionTitle: session.sessionTitle
      }).subscribe();
    }
    this.isRenamingSession = false;
  }

  deleteCurrentSession(): void {
    if (!this.currentSessionId) return;
    if (!confirm("Voulez-vous vraiment supprimer cette discussion ?")) return;

    this.http.delete(`${this.base}/chatbot/session/${this.currentSessionId}`).subscribe({
      next: () => {
        this.sessions = this.sessions.filter(s => s.sessionId !== this.currentSessionId);
        this.clearChat();
      },
      error: (err) => {
        console.error("Failed to delete the session:", err);
        const serverError = err.error?.error ? `\nDétails: ${err.error.error}` : '';
        alert("Erreur lors de la suppression de la discussion." + serverError);
      }
    });
  }

  copyMessage(msg: ChatMessage): void {
    if (msg.content) navigator.clipboard.writeText(msg.content);
  }

  deleteMessage(index: number): void {
    if (index + 1 < this.messages.length && this.messages[index + 1].role === 'assistant') {
      this.messages.splice(index, 2);
    } else {
      this.messages.splice(index, 1);
    }
    this.updateHistoryInDb();
  }

  startEditMessage(msg: ChatMessage): void {
    msg.isEditing = true;
    msg.editContent = msg.content;
    msg.editImageUrl = msg.imageUrl;
  }

  cancelEditMessage(msg: ChatMessage): void {
    msg.isEditing = false;
    msg.editImageUrl = undefined;
  }

  saveEditMessage(index: number, msg: ChatMessage): void {
    const newText = msg.editContent?.trim();
    if (!newText) return;

    const savedImageUrl = msg.editImageUrl || msg.imageUrl || null;
    this.messages = this.messages.slice(0, index);
    this.updateHistoryInDb();
    this.sendMessageWithImage(newText, savedImageUrl);
  }

  private updateHistoryInDb(): void {
    if (!this.currentSessionId) return;
    const session = this.sessions.find(s => s.sessionId === this.currentSessionId);
    if (session) session.messages = [...this.messages];

    // Sanitiser les base64 avant d'envoyer au backend (évite les payloads massifs)
    const sanitizedMessages = this.messages.map(m => {
      const obj: any = { role: m.role, content: m.content };
      if (m.imageUrl) {
        obj.imageUrl = m.imageUrl.startsWith('data:') ? '[image:base64]' : m.imageUrl;
      }
      if (m.fileName)    obj.fileName    = m.fileName;
      if (m.fileExcerpt) obj.fileExcerpt = m.fileExcerpt;
      return obj;
    });

    this.http.put(`${this.base}/chatbot/session/${this.currentSessionId}`, {
      messages: sanitizedMessages
    }).subscribe();
  }

  formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  }


  startListening(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.\nUtilisez Chrome ou Edge.");
      return;
    }

    if (this.isListening) { this.stopListening(); return; }

    this.stopSpeaking();

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart  = () => { this.isListening = true; };

    this.recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('');
      this.inputText = transcript;

      if ((event.results[event.results.length - 1] as SpeechRecognitionResult).isFinal) {
        this.stopListening();
        setTimeout(() => { if (this.inputText.trim()) this.sendMessage(); }, 300);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (event.error === 'not-allowed') {
        alert("Accès au microphone refusé.");
      }
    };

    this.recognition.onend = () => { this.isListening = false; };
    this.recognition.start();
  }

  stopListening(): void {
    if (this.recognition) { this.recognition.stop(); this.recognition = null; }
    this.isListening = false;
  }

  speakMessage(text: string): void {
    if (!text) return;
    this.stopSpeaking();

    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const utterance    = new SpeechSynthesisUtterance(clean);
    utterance.lang     = 'fr-FR';
    utterance.rate     = 1.0;
    utterance.pitch    = 1.0;
    utterance.volume   = 1.0;

    const voices    = this.synth.getVoices();
    const frVoices  = voices.filter(v => v.lang.startsWith('fr'));
    const localVoice = frVoices.find(v => v.localService);
    utterance.voice = localVoice || frVoices[0] || null;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };
    utterance.onpause = () => { this.isSpeaking = false; };
    utterance.onresume = () => { this.isSpeaking = true; };

    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synth.speaking || this.synth.pending) { this.synth.cancel(); }
    this.isSpeaking = false;
  }

  toggleVoice(): void {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled) this.stopSpeaking();
  }

  get isSpeechSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  get isTTSSupported(): boolean { return !!window.speechSynthesis; }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (e) { }
  }

  private focusInput(): void {
    const input = document.getElementById('chatbot-input');
    input?.focus();
  }
}