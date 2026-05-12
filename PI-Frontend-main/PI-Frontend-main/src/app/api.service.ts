import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  /** Relatif → proxy ng serve vers Spring ; surcharger via environment.apiUrl en prod si besoin */
  private readonly apiUrl = environment.apiUrl;
  private mlUrl = '/ml';
  private mlAvailable = true;
  private recentFallbackQuestions = new Set<string>();
  constructor(private http: HttpClient) { }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();

    if (token && token !== 'undefined' && token !== 'null') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // Exemple de méthode GET
  getData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/data`);
  }

  // Exemple de méthode POST
  postData(data: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}/data`, data, { headers });
  }

  // CRUD utilisateurs (Admin)
  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`);
  }

  getUsersByName(name: string): Observable<any[]> {
    const query = encodeURIComponent(name?.trim() || '');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    headers = headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers = headers.set('Pragma', 'no-cache');
    const timestamp = Date.now();
    const url = `${this.apiUrl}/users/search?name=${query}&t=${timestamp}`;
    console.log('Calling API search endpoint:', url);
    return this.http.get<any[]>(url, { headers });
  }

  // Candidats (pour lier un entretien à un candidat)
  // See getCandidats() method below in Candidat methods section

  getUser(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`);
  }

  // Recruteur courant (permets d'obtenir l'id du recruteur connecté)
  getCurrentRecruteur(): Observable<any> {
    const headers = this.buildAuthHeaders();

    // Fallback only when endpoint path is missing. Do not retry on auth errors (401/403).
    return this.http.get(`${this.apiUrl}/recruteur/me`, { headers }).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.http.get(`${this.apiUrl}/recruteurs/me`, { headers });
        }
        return throwError(() => error);
      })
    );
  }

  createUser(user: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}/users`, user, { headers });
  }

  updateUser(id: number, user: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.apiUrl}/users/${id}`, user, { headers });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  // Delete Account - removes user, candidate, and location data
  deleteAccount(userId: number, token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    return this.http.delete(`${this.apiUrl}/users/${userId}/delete-account`, { headers });
  }

  // Register
  register(user: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const cleanEmail = String(user?.email || '').trim();
    const cleanRole = String(user?.role || 'CANDIDAT').replace(/^ROLE_/, '').toUpperCase() || 'CANDIDAT';
    const cleanPassword = user?.motDePasse ?? '';

    // Payload minimaliste - seulement les champs attendus par le backend
    const normalizedUser: any = {
      nom: user?.nom ?? '',
      email: cleanEmail,
      role: cleanRole,
      motDePasse: cleanPassword,
    };

    // Ajouter les champs optionnels s'ils existent
    if (user?.cv) normalizedUser.cv = user.cv;
    if (user?.niveauEtude) normalizedUser.niveauEtude = user.niveauEtude;
    if (user?.experience) normalizedUser.experience = user.experience;
    if (user?.entreprise) normalizedUser.entreprise = user.entreprise;
    if (user?.poste) normalizedUser.poste = user.poste;
    if (user?.secteur) normalizedUser.secteur = user.secteur;
    if (user?.budget) normalizedUser.budget = user.budget;
    if (user?.organisation) normalizedUser.organisation = user.organisation;
    if (user?.adresse) normalizedUser.adresse = user.adresse;
    if (user?.descriptionProjet) normalizedUser.descriptionProjet = user.descriptionProjet;

    return this.http.post(`${this.apiUrl}/auth/register`, normalizedUser, { headers }).pipe(
      catchError((firstError) => {
        // Si erreur, essayer avec payload minimal
        const minimalPayload = {
          nom: normalizedUser.nom,
          email: normalizedUser.email,
          role: cleanRole,
          motDePasse: cleanPassword,
        };
        return this.http.post(`${this.apiUrl}/auth/register`, minimalPayload, { headers }).pipe(
          catchError((secondError) => {
            return throwError(() => secondError);
          })
        );
      })
    );
  }

  // Login
  login(credentials: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const email = String(credentials?.email ?? credentials?.username ?? '').trim();
    const password = String(credentials?.password ?? credentials?.motDePasse ?? credentials?.rawPassword ?? '');

    // Send payload matching backend LoginRequest DTO expectations
    const payload = {
      email,
      motDePasse: password,
    };

    return this.http.post(`${this.apiUrl}/auth/login`, payload, { headers });
  }

  changePassword(payload: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}/auth/change-password`, payload, { headers });
  }

  resetPassword(phone: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { phone }, { headers });
  }

  // Entretiens (Interviews)
  getEntretiens(): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.get(`${this.apiUrl}/entretiens`, { headers });
  }

  getAllEntretiensForAdmin(): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/entretiens`, { headers });
  }

  getEntretiensByCandidat(candidatId: number): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.get(`${this.apiUrl}/entretiens/candidat/${candidatId}`, { headers });
  }

  getEntretiensByRecruteur(recruteurId: number): Observable<any[]> {
    const headers = this.buildAuthHeaders();

    const primaryUrl = `${this.apiUrl}/entretiens/recruteur/${recruteurId}`;
    const fallbackUrl = `${this.apiUrl}/recruteurs/${recruteurId}/entretiens`;

    return this.http.get<any[]>(primaryUrl, { headers }).pipe(
      catchError((firstError) => {
        if (firstError?.status === 404 || firstError?.status === 405) {
          return this.http.get<any[]>(fallbackUrl, { headers });
        }
        return throwError(() => firstError);
      })
    );
  }

  getEntretien(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/entretiens/${id}`);
  }

  getEntretiensByOffre(offreId: number): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    const primaryUrl = `${this.apiUrl}/entretiens/offre/${offreId}`;
    const fallbackUrlA = `${this.apiUrl}/offres/${offreId}/entretiens`;
    const fallbackUrlB = `${this.apiUrl}/offres-emploi/${offreId}/entretiens`;

    return this.http.get<any[]>(primaryUrl, { headers }).pipe(
      catchError((firstError) => {
        if (firstError?.status === 404 || firstError?.status === 405 || firstError?.status === 500) {
          return this.http.get<any[]>(fallbackUrlA, { headers }).pipe(
            catchError((secondError) => {
              if (secondError?.status === 404 || secondError?.status === 405 || secondError?.status === 500) {
                return this.http.get<any[]>(fallbackUrlB, { headers });
              }
              return throwError(() => secondError);
            })
          );
        }
        return throwError(() => firstError);
      })
    );
  }

  updateEntretienStatutByAdmin(id: number, statut: 'ACCEPTE' | 'REFUSE'): Observable<any> {
    const queryUrl = `${this.apiUrl}/entretiens/${id}/statut?statut=${encodeURIComponent(statut)}`;
    const bodyUrl = `${this.apiUrl}/entretiens/${id}/statut`;

    return this.http.put(queryUrl, {}).pipe(
      catchError((firstError) => {
        if (firstError?.status === 404 || firstError?.status === 405) {
          return this.http.put(bodyUrl, { statut });
        }

        if (firstError?.status === 400) {
          return this.http.put(bodyUrl, { status: statut });
        }

        return throwError(() => firstError);
      })
    );
  }

  getPublicTestEntretiens(): Observable<any> {
    return this.http.get(`${this.apiUrl}/entretiens/public/tests`);
  }

  createEntretien(entretien: any, recruteurId?: number): Observable<any> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const genericUrl = `${this.apiUrl}/entretiens`;

    if (recruteurId != null && !isNaN(recruteurId) && recruteurId > 0) {
      headers = headers.set('Recruteur-ID', String(recruteurId));
    }

    // 1) Tentative la plus probable : endpoint lié au recruteur
    if (recruteurId != null && !isNaN(recruteurId) && recruteurId > 0) {
      const recruteurScopedUrl = `${this.apiUrl}/recruteurs/${recruteurId}/entretiens`;

      return this.http.post(recruteurScopedUrl, entretien, { headers }).pipe(
        catchError((error) => {
          const errorMessage = String(error?.error?.message || error?.message || '');
          const shouldFallbackToGeneric =
            error?.status === 404 ||
            (error?.status === 500 && /No static resource|NoResourceFoundException/i.test(errorMessage));

          if (shouldFallbackToGeneric) {
            return this.http.post(genericUrl, entretien, { headers });
          }

          return throwError(() => error);
        })
      );
    }

    // 2) Fallback générique
    return this.http.post(genericUrl, entretien, { headers });
  }

  completeEntretien(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/entretiens/${id}/complete`, {});
  }

  // Questions
  getQuestionsByEntretien(entretienId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/questions/entretien/${entretienId}`);
  }

  generateAiQuestionSuggestions(entretienId: number, payload: any): Observable<any[]> {
    const generationContext = this.normalizeQuestionGenerationContext(payload);
    const normalizeOrThrow = (rows: any, context: any, checkQuality: boolean = true): any[] => {
      const normalizedRows = this.normalizeIncomingQuestionRows(rows, context);
      if (!normalizedRows.length) {
        throw new Error('API_EMPTY_RESPONSE');
      }
      const structuredRows = normalizedRows.filter((row: any) =>
        Array.isArray(row?.choix)
        && row.choix.length >= 2
        && row.choix.some((choice: any) => choice?.correcte === true)
      );
      if (!structuredRows.length) {
        throw new Error('AI_UNSTRUCTURED_RESPONSE');
      }
      if (checkQuality && this.isLowQualityAiSuggestions(structuredRows, context)) {
        throw new Error('API_LOW_QUALITY_RESPONSE');
      }
      return structuredRows;
    };

    const retryPayload = {
      ...generationContext,
      temperature: Math.max(0.6, Number(payload?.temperature) || 0.7),
    };

    // Utilise uniquement l'API externe (Pollinations)
    return this.callExternalOpenSourceQuestionApi(generationContext, 'full').pipe(
      map((rows) => normalizeOrThrow(rows, generationContext, true)),
      catchError(() => this.callExternalOpenSourceQuestionApi(retryPayload, 'simple').pipe(
        map((rows) => normalizeOrThrow(rows, retryPayload, true)),
        catchError(() => this.callExternalOpenSourceQuestionApi(retryPayload, 'raw').pipe(
          map((rows) => normalizeOrThrow(rows, retryPayload, false)),
          catchError(() => of(this.buildLocalQuestionFallback(retryPayload)))
        ))
      ))
    );
  }

  private normalizeQuestionGenerationContext(payload: any): any {
    const theme = this.cleanThemeForGeneration(payload?.theme);
    return {
      ...payload,
      categorie: String(payload?.categorie || 'TECHNIQUE').trim().toUpperCase(),
      niveau: String(payload?.niveau || 'INTERMEDIAIRE').trim().toUpperCase(),
      type: this.normalizeQuestionType(payload?.type),
      theme: theme || 'entretien technique',
      nombre: Math.max(1, Math.min(10, Number(payload?.nombre) || 3)),
      temperature: Math.max(0.1, Math.min(1.0, Number(payload?.temperature) || 0.7))
    };
  }

  private cleanThemeForGeneration(theme: string): string {
    const raw = String(theme || '').trim();
    if (!raw) {
      return '';
    }

    const cleaned = raw
      .replace(/[|].*$/g, ' ')
      .replace(/\b(questions?|questionner|genere|génère|generer|crée|cree|donne|donnez|propose|produis|fais|faites|reussir|réussir|comment|explique|definition|définition|pourquoi|commentaire|expliquer)\b/gi, ' ')
      .replace(/\b(concretes?|spécifiques?|specifiques?|génériques?|generiques?|templates?|template|json|markdown|valide|valides|uniquement|exactement|sans)\b/gi, ' ')
      .replace(/\b(de|du|des|pour|avec|sur|en|a|à|au|aux|le|la|les|un|une|et|ou|niveau|type|categorie|catégorie)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 2) {
      return raw;
    }

    return cleaned.replace(/\b\w/g, (m) => m.toUpperCase());
  }

  private callMlGenerateApi(payload: any): Observable<any[]> {
    const categorie = String(payload?.categorie || 'TECHNIQUE').trim().toUpperCase();
    const domaine = categorie === 'TECHNIQUE' || categorie === 'TEST' ? 'INFORMATIQUE' : 'BUSINESS';

    const body = {
      domaine,
      categorie,
      niveau: String(payload?.niveau || 'INTERMEDIAIRE').trim().toUpperCase(),
      type: this.normalizeQuestionType(payload?.type),
      theme: String(payload?.theme || 'entretien technique').trim(),
      nombre: Math.max(1, Math.min(10, Number(payload?.nombre) || 3)),
      temperature: Math.max(0.1, Math.min(1.0, Number(payload?.temperature) || 0.7))
    };

    return this.http.post<any[]>(`${this.mlUrl}/generate`, body, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  // ── New ML Recommendation v2 Methods ────────────────────────────

  recommendFormations(payload: any): Observable<any[]> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any[]>(`${this.mlUrl}/recommend`, payload, { headers });
  }

  analyzeSkillGapML(payload: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${this.mlUrl}/analyze-gap`, payload, { headers });
  }

  getAvailableCareers(): Observable<any> {
    return this.http.get(`${this.mlUrl}/careers`);
  }

  testSkillSimilarity(skillA: string, skillB: string): Observable<any> {
    const params = { skill_a: skillA, skill_b: skillB };
    return this.http.get(`${this.mlUrl}/skill-similarity`, { params });
  }

  getMlHealth(): Observable<any> {
    return this.http.get(`${this.mlUrl}/health`);
  }

  // ──────────────────────────────────────────────────────────────

  private normalizeIncomingQuestionRows(rows: any, context: any): any[] {
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row: any, index: number) => {
      const rowType = this.normalizeQuestionType(row?.type || context?.type);
      const rowNiveau = String(row?.niveau || context?.niveau || 'INTERMEDIAIRE').trim().toUpperCase();
      const rowTheme = String(row?.theme || context?.theme || '').trim();
      const rawChoices = Array.isArray(row?.choix) ? row.choix : [];

      let choix = rawChoices
        .map((choice: any, cIndex: number) => {
          if (typeof choice === 'string') {
            return { texte: choice.trim(), correcte: cIndex === 0, ordre: cIndex + 1 };
          }
          return {
            texte: String(choice?.texte || choice?.contenu || choice?.label || '').trim(),
            correcte: Boolean(choice?.correcte === true || choice?.correct === true || choice?.isCorrecte === true),
            ordre: Number(choice?.ordre) || cIndex + 1
          };
        })
        .filter((choice: any) => !!choice.texte);

      if (!choix.length) {
        return null;
      }

      if (!choix.some((c: any) => c.correcte)) {
        choix[0].correcte = true;
      }

      if (rowType === 'QCU' || rowType === 'VRAI_FAUX') {
        let found = false;
        choix.forEach((c: any) => {
          if (c.correcte && !found) {
            found = true;
          } else {
            c.correcte = false;
          }
        });
      }

      const fallbackTheme = rowTheme || String(context?.theme || 'entretien technique').trim();
      const rawContent = String(row?.contenu || '').trim() || `${fallbackTheme} - Question ${index + 1}`;
      return {
        contenu: this.applyThemeToGeneratedContent(rawContent, fallbackTheme),
        type: rowType,
        niveau: rowNiveau,
        points: Number(row?.points) || 1,
        ordre: Number(row?.ordre) || index + 1,
        choix
      };
    }).filter((row: any) => !!row);
  }

  private isLowQualityAiSuggestions(rows: any[], context: any): boolean {
    if (!Array.isArray(rows) || !rows.length) {
      return true;
    }

    const normalizedTheme = String(context?.theme || '').trim().toLowerCase();
    const stripDiacritics = (value: string) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const genericPattern = /^(debutant|intermediaire|avance|expert)\s*:\s*affirmation\s*\d+\s*sur\s+.+(?:est-?elle\s+)?vraie\s+ou\s+fausse\s*\??$/i;
    const staticQcmPatternA = /^(debutant|intermediaire|avance|expert)\s*:\s*quelle est la meilleure reponse concernant .+\??$/i;
    const staticQcmPatternB = /^(debutant|intermediaire|avance|expert)\s*:\s*parmi les options suivantes, laquelle est correcte pour .+\??$/i;
    const staticQcmPatternC = /^(debutant|intermediaire|avance|expert)\s*:\s*selectionnez la bonne pratique relative a .+\??$/i;
    const providerNoticePatterns = [
      /please migrate to our new service/i,
      /enter\.pollinations\.ai/i,
      /anonymous requests to text\.pollinations\.ai/i,
      /access to all the latest models/i,
      /note:\s*anonymous requests/i
    ];

    const contents = rows.map((row: any) => String(row?.contenu || '').trim()).filter(Boolean);
    const normalizedContents = contents.map((text) =>
      stripDiacritics(text)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (!contents.length) {
      return true;
    }

    const genericCount = normalizedContents.filter((text) => genericPattern.test(text)).length;
    const genericAffirmationCount = normalizedContents.filter(
      (text) => text.includes('affirmation') && text.includes('vraie ou fausse')
    ).length;
    const staticQcmCount = normalizedContents.filter(
      (text) => staticQcmPatternA.test(text) || staticQcmPatternB.test(text) || staticQcmPatternC.test(text)
    ).length;
    const providerNoticeCount = normalizedContents.filter((text) =>
      providerNoticePatterns.some((pattern) => pattern.test(text))
    ).length;
    const uniqueCount = new Set(normalizedContents).size;
    const reducedContents = normalizedContents.map((text) =>
      text
        .replace(/^\[[^\]]+\]\s*/g, '')
        .replace(/\b(en pratique|au quotidien|en entretien technique|parmi les propositions)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
    const reducedUniqueCount = new Set(reducedContents).size;
    const skeletonCount = new Set(
      contents.map((text) =>
        text
          .toLowerCase()
          .replace(/\b(debutant|intermediaire|avance|expert)\b/g, 'niveau')
          .replace(/\b\d+\b/g, '#')
          .replace(/\s+/g, ' ')
          .trim()
      )
    ).size;

    const normalizedThemeNoAccent = stripDiacritics(normalizedTheme);
    const allThemeOnly = normalizedThemeNoAccent
      ? normalizedContents.every((text) => text.includes(`sur ${normalizedThemeNoAccent}`))
      : false;

    if (
      genericCount === contents.length
      || genericAffirmationCount === contents.length
      || staticQcmCount === contents.length
      || providerNoticeCount > 0
    ) {
      return true;
    }

    // Theme relevance guard: reject off-topic results for clear technical themes.
    const themeSignals: Record<string, string[]> = {
      angular: ['angular', 'component', 'directive', 'rxjs', 'typescript', 'template'],
      informatique: [
        'informatique',
        'logiciel',
        'programm',
        'develop',
        'code',
        'donnee',
        'donnees',
        'reseau',
        'securite',
        'cloud',
        'devops',
        'application',
        'systeme',
        'architecture',
        'api',
        'base de donnee',
        'bdd',
        'algorithme'
      ],
      javascript: ['javascript', 'js', 'closure', 'promise', 'async', 'await', 'event loop', 'prototype', 'callback'],
      java: ['java', 'jvm', 'jdk', 'jre', 'spring', 'hibernate'],
      sql: ['sql', 'join', 'index', 'transaction', 'requete', 'database', 'bdd'],
      spring: ['spring', 'spring boot', 'bean', 'controller', 'transactional'],
      frontend: ['frontend', 'css', 'html', 'javascript', 'ux', 'ui']
    };

    const offTopicSignals: Record<string, string[]> = {
      angular: ['java', 'jvm', 'jdk', 'spring boot', 'hibernate'],
      informatique: [],
      javascript: ['spring', 'hibernate', 'jvm', 'jdk', 'sql transaction'],
      java: ['angular', 'rxjs', 'typescript', 'template html'],
      sql: ['angular', 'typescript', 'component', 'java abstract'],
      spring: ['angular', 'rxjs', 'typescript'],
      frontend: ['jvm', 'jdk', 'hibernate', 'sql transaction']
    };

    const matchThemeKey = (): keyof typeof themeSignals | null => {
      if (normalizedThemeNoAccent.includes('angular')) return 'angular';
      if (normalizedThemeNoAccent.includes('informatique') || normalizedThemeNoAccent.includes('it ') || normalizedThemeNoAccent === 'it') {
        return 'informatique';
      }
      if (normalizedThemeNoAccent.includes('javascript') || normalizedThemeNoAccent.includes('java script') || normalizedThemeNoAccent === 'js') return 'javascript';
      if (normalizedThemeNoAccent.includes('java')) return 'java';
      if (normalizedThemeNoAccent.includes('spring')) return 'spring';
      if (
        normalizedThemeNoAccent.includes('sql')
        || normalizedThemeNoAccent.includes('bdd')
        || normalizedThemeNoAccent.includes('database')
        || normalizedThemeNoAccent.includes('base de donne')
      ) return 'sql';
      if (
        normalizedThemeNoAccent.includes('frontend')
        || normalizedThemeNoAccent.includes('ui')
        || normalizedThemeNoAccent.includes('css')
      ) return 'frontend';
      return null;
    };

    const themeKey = matchThemeKey();
    if (themeKey && themeKey !== 'informatique') {
      const hasThemeSignal = reducedContents.filter((text) =>
        themeSignals[themeKey].some((signal) => text.includes(signal))
      ).length;
      const hasOffTopicSignal = reducedContents.filter((text) =>
        offTopicSignals[themeKey].some((signal) => text.includes(signal))
      ).length;

      if (hasThemeSignal === 0 || hasOffTopicSignal >= Math.ceil(reducedContents.length / 2)) {
        return true;
      }
    }

    // Guard against repetitive template output even if numbering changes.
    if (
      uniqueCount <= 1
      || reducedUniqueCount <= 1
      || skeletonCount <= 1
      || (allThemeOnly && uniqueCount <= Math.max(1, Math.floor(contents.length / 2)))
    ) {
      return true;
    }

    return false;
  }

  /** Réponse OpenAI-compatible (POST text.pollinations.ai/openai). */
  private extractPollinationsOpenAiText(res: any): string {
    if (res == null) {
      return '';
    }
    if (typeof res === 'string') {
      return res;
    }
    const c = res?.choices?.[0]?.message?.content;
    if (typeof c === 'string') {
      return c;
    }
    return '';
  }

  private callExternalOpenSourceQuestionApi(payload: any, variant: 'full' | 'simple' | 'raw' = 'full'): Observable<any[]> {
    const type = this.normalizeQuestionType(payload?.type);
    const niveau = String(payload?.niveau || 'INTERMEDIAIRE').trim().toUpperCase();
    const categorie = String(payload?.categorie || 'TECHNIQUE').trim().toUpperCase();
    const nombre = Math.max(1, Math.min(10, Number(payload?.nombre) || 3));
    const theme = this.cleanThemeForGeneration(payload?.theme) || 'entretien technique';
    const temperature = Math.max(0.1, Math.min(1.0, Number(payload?.temperature) || 0.7));

    const strictRules =
      `Tu dois retourner uniquement du JSON valide. Aucun texte hors JSON. Aucun markdown. Aucun commentaire. ` +
      `Le tableau doit contenir exactement ${nombre} objets. ` +
      `Chaque objet doit avoir: contenu, type, niveau, points, ordre, choix. ` +
      `Le champ contenu doit etre une seule question claire, specifique au theme, sans prefixe de niveau, sans "questions concretes", sans pipe, sans instructions. ` +
      `Pour ${type}, respecte exactement le type demande.`;

    const prompt = variant === 'raw'
      ? `${strictRules} Theme: ${theme}. Donne ${nombre} questions d entretien en francais. Retourne uniquement un tableau JSON valide.`
      : variant === 'simple'
        ? `${strictRules} Theme: ${theme}. Categorie: ${categorie}. Niveau: ${niveau}. Donne ${nombre} questions d entretien en francais. Retourne uniquement du JSON.`
        : `${strictRules} Theme: ${theme}. Categorie: ${categorie}. Niveau: ${niveau}. ` +
          `Genere exactement ${nombre} questions d entretien en francais au format JSON strict. ` +
          `Chaque question doit etre concrète, specifique, contextualisee et réellement liée au domaine du theme. ` +
          `Pour QCM/QCU, chaque choix doit être plausible et distinct; pour VRAI_FAUX, fournir VRAI et FAUX. ` +
          `Schema: [{"contenu":"...","type":"${type}","niveau":"${niveau}","points":1,"ordre":1,"choix":[{"texte":"...","correcte":true,"ordre":1}]}].`;

    const body = {
      model: 'openai',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 8192,
      stream: false
    };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>('/oss/openai', body, { headers }).pipe(
      map((res) => {
        const raw = String(this.extractPollinationsOpenAiText(res) || '');
        const parsed = this.normalizeExternalQuestionsText(raw, { type, niveau, nombre, theme });
        if (parsed.length) {
          return parsed.map((row) => ({
            ...row,
            type: this.normalizeQuestionType(type),
            niveau,
            theme,
            choix: this.ensureChoicesForRequestedType(row?.choix || [], type, String(row?.contenu || theme))
          }));
        }

        const salvaged = this.extractQuestionsFromPlainText(raw, { type, niveau, nombre, theme });
        return salvaged.map((row) => ({
          ...row,
          type: this.normalizeQuestionType(type),
          niveau,
          theme,
          choix: this.ensureChoicesForRequestedType(row?.choix || [], type, String(row?.contenu || theme))
        }));
      })
    );
  }

  private normalizeQuestionType(rawType: any): string {
    const normalized = String(rawType || 'QCM').trim().toUpperCase();
    if (normalized === 'VF' || normalized === 'VRAI_FAUX') {
      return 'VRAI_FAUX';
    }
    if (normalized === 'QCU') {
      return 'QCU';
    }
    return 'QCM';
  }

  private normalizeExternalQuestionsText(text: string, context: any): any[] {
    const extracted = this.extractJsonPayload(text);
    if (extracted && !Array.isArray(extracted) && typeof extracted === 'object') {
      const asObj: any = extracted;
      const questionText = this.sanitizeQuestionContent(String(asObj?.contenu || asObj?.question || asObj?.text || ''), String(context?.theme || ''));
      if (questionText && !this.isProviderNoticeText(questionText)) {
        const type = this.normalizeQuestionType(asObj?.type || context?.type);
        const niveau = String(asObj?.niveau || context?.niveau || 'INTERMEDIAIRE').trim().toUpperCase();
        const isVf = type === 'VRAI_FAUX' || typeof asObj?.vrai_faux === 'boolean';
        if (isVf) {
          const answer = typeof asObj?.vrai_faux === 'boolean' ? asObj.vrai_faux : true;
          return [{
            contenu: this.applyThemeToGeneratedContent(questionText, String(context?.theme || '')),
            type: 'VRAI_FAUX',
            niveau,
            points: 1,
            ordre: 1,
            choix: [
              { texte: 'VRAI', correcte: Boolean(answer), ordre: 1 },
              { texte: 'FAUX', correcte: !Boolean(answer), ordre: 2 }
            ]
          }];
        }
        const answerText = String(asObj?.answer || asObj?.reponse || asObj?.correct || asObj?.bonneReponse || '').trim().toLowerCase();
        const options = Array.isArray(asObj?.options)
          ? asObj.options
          : (Array.isArray(asObj?.choix) ? asObj.choix : []);
        const choix = options
          .map((option: any, idx: number) => {
            const text = typeof option === 'string'
              ? option.trim()
              : String(option?.texte || option?.contenu || option?.label || option?.text || '').trim();
            const isCorrect = typeof option === 'string'
              ? (answerText ? text.toLowerCase() === answerText : idx === 0)
              : Boolean(
                option?.correcte === true
                || option?.correct === true
                || option?.isCorrecte === true
                || (answerText && text.toLowerCase() === answerText)
              );
            return {
              texte: text,
              correcte: isCorrect,
              ordre: Number(option?.ordre) || idx + 1
            };
          })
          .filter((choice: any) => !!choice.texte);

        if (choix.length && !choix.some((c: any) => c.correcte)) {
          choix[0].correcte = true;
        }

        const normalizedChoices = choix.length
          ? choix
          : this.buildSmartFallbackChoices(questionText, type, String(context?.theme || ''));

        return [{
          contenu: this.applyThemeToGeneratedContent(questionText, String(context?.theme || '')),
          type,
          niveau,
          points: 1,
          ordre: 1,
          choix: normalizedChoices
        }];
      }
    }

    const rows = Array.isArray(extracted)
      ? extracted
      : (Array.isArray((extracted as any)?.questions) ? (extracted as any).questions : []);

    if (!rows.length) {
      return this.extractQuestionsFromPlainText(text, context);
    }

    return rows.slice(0, context.nombre).map((row: any, index: number) => {
      const rowType = this.normalizeQuestionType(row?.type || context.type);
      const rowNiveau = String(row?.niveau || context.niveau || 'INTERMEDIAIRE').trim().toUpperCase();
      const rowQuestion = this.sanitizeQuestionContent(String(row?.contenu || row?.question || row?.text || row?.prompt || ''), String(context?.theme || ''));
      if (!rowQuestion || this.isProviderNoticeText(rowQuestion)) {
        return null;
      }
      const choixRaw = Array.isArray(row?.choix)
        ? row.choix
        : (Array.isArray(row?.options) ? row.options : []);
      const answerText = String(row?.answer || row?.reponse || row?.correct || row?.bonneReponse || '').trim().toLowerCase();
      const choix = choixRaw
        .map((choice: any, cIndex: number) => {
          if (typeof choice === 'string') {
            const text = choice.trim();
            return {
              texte: text,
              correcte: cIndex === 0 || (answerText && text.toLowerCase() === answerText),
              ordre: cIndex + 1
            };
          }
          const choiceText = String(choice?.texte || choice?.contenu || choice?.label || choice?.text || '').trim();
          return {
            texte: choiceText,
            correcte: Boolean(
              choice?.correcte === true
              || choice?.correct === true
              || choice?.isCorrecte === true
              || (answerText && choiceText.toLowerCase() === answerText)
            ),
            ordre: Number(choice?.ordre) || cIndex + 1
          };
        })
        .filter((choice: any) => !!choice.texte);

      if (!choix.length && Array.isArray(row?.options) && row?.answer) {
        const options = row.options.map((option: any, optionIndex: number) => {
          const text = String(option || '').trim();
          return {
            texte: text,
            correcte: text.toLowerCase() === answerText || optionIndex === 0,
            ordre: optionIndex + 1
          };
        }).filter((option: any) => !!option.texte);
        choix.push(...options);
      }

      if (!choix.length) {
        return null;
      }

      if (!choix.some((c: any) => c.correcte)) {
        choix[0].correcte = true;
      }

      if (rowType === 'QCU' || rowType === 'VRAI_FAUX') {
        let found = false;
        choix.forEach((c: any) => {
          if (c.correcte && !found) {
            found = true;
          } else {
            c.correcte = false;
          }
        });
      }

      return {
        contenu: this.applyThemeToGeneratedContent(
          rowQuestion || `${context.theme} - Question ${index + 1}`,
          String(context?.theme || '')
        ),
        type: rowType,
        niveau: rowNiveau,
        points: Number(row?.points) || 1,
        ordre: Number(row?.ordre) || index + 1,
        choix
      };
    }).filter((row: any) => !!row);
  }

  private extractQuestionsFromPlainText(text: string, context: any): any[] {
    const raw = String(text || '').trim();
    if (!raw) {
      return [];
    }

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/g, '').trim())
      .filter((line) => line.length > 15)
      .filter((line) => /\?|:/.test(line))
      .filter((line) => !this.isProviderNoticeText(line));

    const unique = Array.from(new Set(lines));
    if (!unique.length) {
      return [];
    }

    const type = this.normalizeQuestionType(context?.type);
    const niveau = String(context?.niveau || 'INTERMEDIAIRE').trim().toUpperCase();
    const wanted = Math.max(1, Math.min(10, Number(context?.nombre) || 3));

    return (unique.slice(0, wanted) as string[]).map((questionText: string, index: number) => {
      const contenu = questionText.endsWith('?') || questionText.endsWith(':')
        ? questionText
        : `${questionText} ?`;
      const themedContent = this.applyThemeToGeneratedContent(this.sanitizeQuestionContent(contenu, String(context?.theme || '')), String(context?.theme || ''));

      if (type === 'VRAI_FAUX') {
        return {
          contenu: themedContent,
          type,
          niveau,
          points: 1,
          ordre: index + 1,
          choix: [
            { texte: 'VRAI', correcte: true, ordre: 1 },
            { texte: 'FAUX', correcte: false, ordre: 2 }
          ]
        };
      }

      return {
        contenu: themedContent,
        type,
        niveau,
        points: 1,
        ordre: index + 1,
        choix: this.buildSmartFallbackChoices(contenu, type, String(context?.theme || ''))
      };
    });
  }

  private sanitizeQuestionContent(content: string, theme: string): string {
    const raw = String(content || '').trim();
    if (!raw) {
      return '';
    }

    const themeText = String(theme || '').trim();
    return raw
      .replace(/\|.*$/g, '')
      .replace(/^(debutant|intermediaire|avance|expert)\s*:\s*/i, '')
      .replace(/\b(questions? concretes?|specifiques?|sans formulations generiques|sans templates|retourne du json|retourne uniquement json|json strict|aucun texte hors json)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s+([?.!:,;])$/g, '$1')
      .replace(/^sur\s+/i, '')
      .replace(new RegExp(`^${this.escapeRegExp(themeText)}\s*-\s*`, 'i'), '')
      .trim();
  }

  private escapeRegExp(value: string): string {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private isProviderNoticeText(value: string): boolean {
    const text = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      return false;
    }

    const providerNoticePatterns = [
      /please migrate to our new service/,
      /enter\.pollinations\.ai/,
      /text\.pollinations\.ai/,
      /anonymous requests to/,
      /access to all the latest models/,
      /note:\s*anonymous requests/
    ];

    return providerNoticePatterns.some((pattern) => pattern.test(text));
  }

  private applyThemeToGeneratedContent(content: string, theme: string): string {
    const normalizedContent = String(content || '').trim();
    const normalizedTheme = String(theme || '').trim();

    if (!normalizedContent) {
      return normalizedTheme || 'Question d entretien';
    }

    if (!normalizedTheme) {
      return normalizedContent;
    }

    return normalizedContent
      .replace(/\[\s*entretien technique\s*\]/gi, `[${normalizedTheme}]`)
      .replace(/\bentretien technique\b/gi, normalizedTheme)
      .replace(/\btheme\s*:\s*entretien technique\b/gi, `theme: ${normalizedTheme}`)
      .replace(/\bsur\s+entretien technique\b/gi, `sur ${normalizedTheme}`)
      .trim();
  }

  private extractJsonPayload(text: string): any | null {
    const cleaned = String(text || '')
      .replace(/```json/gi, '```')
      .replace(/```/g, '')
      .trim();

    if (!cleaned) {
      return null;
    }

    const tryParse = (candidate: string): any | null => {
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    };

    const direct = tryParse(cleaned);
    if (direct != null) {
      return direct;
    }

    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart >= 0 && arrEnd > arrStart) {
      const parsed = tryParse(cleaned.slice(arrStart, arrEnd + 1));
      if (parsed != null) {
        return parsed;
      }
    }

    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart >= 0 && objEnd > objStart) {
      return tryParse(cleaned.slice(objStart, objEnd + 1));
    }

    return null;
  }

  private buildLocalQuestionFallback(context: any): any[] {
    const type = this.normalizeQuestionType(context?.type);
    const niveau = String(context?.niveau || 'INTERMEDIAIRE').trim().toUpperCase();
    const theme = String(context?.theme || 'entretien technique').trim();
    const nombre = Math.max(1, Math.min(10, Number(context?.nombre) || 3));
    const normalizedTheme = theme.toLowerCase();
    const normalizedThemeAscii = normalizedTheme
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const shuffle = <T>(items: T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const includesAny = (source: string, keywords: string[]): boolean =>
      keywords.some((k) => source.includes(k));

    const pickDomain = (): 'angular' | 'java' | 'sql' | 'spring' | 'frontend' | 'mobile' | 'cuisine' | 'generic' => {
      if (normalizedTheme.includes('angular')) return 'angular';
      if (normalizedTheme.includes('java')) return 'java';
      if (
        includesAny(normalizedThemeAscii, [
          'mobile',
          'android',
          'ios',
          'flutter',
          'react native',
          'react-native'
        ])
      ) return 'mobile';
      if (
        includesAny(normalizedThemeAscii, [
          'sql',
          'database',
          'bdd',
          'base de donne',
          'base de donnee',
          'donnees',
          'donnes',
          'mysql',
          'postgres',
          'postgresql',
          'oracle',
          'mongodb',
          'sqlite'
        ])
      ) return 'sql';
      if (
        includesAny(normalizedThemeAscii, [
          'gateau',
          'gato',
          'patisserie',
          'patisserie',
          'recette',
          'dessert',
          'cuisine',
          'boulangerie',
          'four',
          'chocolat'
        ])
      ) return 'cuisine';
      if (normalizedTheme.includes('spring')) return 'spring';
      if (normalizedTheme.includes('frontend') || normalizedTheme.includes('ui') || normalizedTheme.includes('css')) return 'frontend';
      return 'generic';
    };

    const domain = pickDomain();

    const questionBanks: Record<string, string[]> = {
      angular: [
        'Dans Angular, comment reduire les rerenders inutiles dans une liste volumineuse ?',
        'Quand faut-il preferer un Resolver plutot qu un chargement de donnees dans ngOnInit ?',
        'Comment structurer un module Angular pour eviter les dependances circulaires ?',
        'Quelle strategie utiliser pour gerer proprement les erreurs HTTP globales dans Angular ?',
        'Comment optimiser la performance de detection de changements sur un tableau de composants ?'
      ],
      java: [
        'Quelle difference pratique entre interface et classe abstraite dans un backend Java ?',
        'Comment gerer efficacement les exceptions checked et unchecked dans une API Java ?',
        'Dans quel cas utiliser Optional dans un service Java, et quand l eviter ?',
        'Comment identifier et corriger un goulot d etranglement memoire dans une application Java ?',
        'Quelles bonnes pratiques de conception appliquent SOLID dans un service metier Java ?'
      ],
      sql: [
        'Comment choisir entre INNER JOIN et LEFT JOIN dans une requete de reporting RH ?',
        'Quelle strategie d indexation pour accelerer une recherche multi-criteres sur candidatures ?',
        'Comment eviter les scans complets de table sur une requete SQL frequente ?',
        'Comment ecrire une requete SQL pour retrouver les candidats ayant passe au moins 3 entretiens ?',
        'Quelles precautions prendre pour eviter les injections SQL dans une API backend ?'
      ],
      spring: [
        'Comment separer controller, service et repository dans Spring Boot pour garder un code maintenable ?',
        'Quand utiliser @Transactional et quels risques en cas de mauvaise granularite ?',
        'Quelle approche pour gerer une validation metier complexe dans Spring sans dupliquer le code ?',
        'Comment mettre en cache des lectures couteuses dans Spring Boot sans incoherence de donnees ?',
        'Comment tracer proprement les erreurs 5xx dans une API Spring en production ?'
      ],
      frontend: [
        'Comment ameliorer l accessibilite d un formulaire complexe sans degradations UX ?',
        'Quelle strategie pour eviter le code CSS non utilise dans une application front volumineuse ?',
        'Comment gerer l etat d une page riche sans couplage fort entre composants ?',
        'Comment detecter et corriger un layout shift sur mobile ?',
        'Quelles metriques suivre pour mesurer la performance percue cote frontend ?'
      ],
      mobile: [
        'Comment reduire le temps de demarrage d une application mobile sans degrader la maintenabilite ?',
        'Quelle strategie utiliser pour gerer proprement les etats hors ligne et la synchronisation ?',
        'Comment optimiser la consommation batterie d une application mobile riche en appels reseau ?',
        'Comment structurer la navigation et les ecrans pour limiter la complexite sur un projet mobile ?',
        'Quels KPI suivre pour evaluer la stabilite d une app mobile en production (crash rate, ANR, freeze) ?'
      ],
      cuisine: [
        `Pour ${theme}, comment obtenir une texture moelleuse sans alourdir la pate ?`,
        `Pour ${theme}, comment equilibrer sucre et matiere grasse pour un meilleur gout ?`,
        `Quelles etapes critiques de cuisson faut-il surveiller pour ${theme} ?`,
        `Comment adapter ${theme} si on remplace le beurre par de l huile ?`,
        `Quels signes montrent que ${theme} est bien cuit sans etre sec ?`
      ],
      generic: [
        `Quelles sont les bonnes pratiques essentielles pour reussir ${theme} ?`,
        `Quelles erreurs frequentes faut-il eviter quand on travaille sur ${theme} ?`,
        `Quelle methode simple recommandez-vous pour progresser rapidement en ${theme} ?`,
        `Quels criteres permettent d evaluer un bon resultat sur ${theme} ?`,
        `Comment adapter ${theme} pour un niveau debutant sans perdre en qualite ?`
      ]
    };

    const vfAffirmations: Record<string, Array<{ text: string; answer: 'VRAI' | 'FAUX' }>> = {
      angular: [
        { text: 'En Angular, trackBy dans *ngFor peut reduire les rerenders inutiles.', answer: 'VRAI' },
        { text: 'En Angular, tous les observables se desabonnent automatiquement sans exception.', answer: 'FAUX' },
        { text: 'Un resolver Angular permet de charger des donnees avant l affichage d une route.', answer: 'VRAI' },
        { text: 'Le ChangeDetectionStrategy.OnPush force un rerender complet a chaque evenement global.', answer: 'FAUX' }
      ],
      java: [
        { text: 'En Java, une interface peut definir des methodes par defaut.', answer: 'VRAI' },
        { text: 'Le garbage collector garantit qu une application Java ne peut jamais fuir de memoire.', answer: 'FAUX' },
        { text: 'Optional est utile pour expliciter l absence possible de valeur en Java.', answer: 'VRAI' },
        { text: 'Une RuntimeException doit obligatoirement etre capturee ou declaree throws.', answer: 'FAUX' }
      ],
      sql: [
        { text: 'LEFT JOIN peut retourner des lignes de la table gauche sans correspondance a droite.', answer: 'VRAI' },
        { text: 'Un index accelere toujours toutes les requetes SQL, sans exception.', answer: 'FAUX' },
        { text: 'Une requete avec filtre sur colonne non indexee peut provoquer un scan complet.', answer: 'VRAI' },
        { text: 'Les requetes preparees sont inutiles contre les injections SQL.', answer: 'FAUX' }
      ],
      spring: [
        { text: '@Transactional peut garantir l atomicite d un bloc metier en Spring.', answer: 'VRAI' },
        { text: 'En Spring, un controller doit contenir toute la logique metier principale.', answer: 'FAUX' },
        { text: 'Spring Security peut proteger des routes par roles.', answer: 'VRAI' },
        { text: 'Le cache applicatif ne doit jamais etre invalide, quelle que soit la donnee.', answer: 'FAUX' }
      ],
      frontend: [
        { text: 'Associer un label a un champ de formulaire ameliore l accessibilite.', answer: 'VRAI' },
        { text: 'Le chargement differe des images est inutile pour les performances web.', answer: 'FAUX' },
        { text: 'Une mauvaise hierarchie de titres peut nuire a la navigation clavier et lecteur ecran.', answer: 'VRAI' },
        { text: 'Le CLS mesure principalement le temps de reponse serveur.', answer: 'FAUX' }
      ],
      mobile: [
        { text: 'Le crash rate est un indicateur cle pour suivre la qualite d une application mobile.', answer: 'VRAI' },
        { text: 'Les appels reseau en boucle n ont aucun impact sur la batterie mobile.', answer: 'FAUX' },
        { text: 'Un mode hors ligne bien gere ameliore l experience utilisateur mobile.', answer: 'VRAI' },
        { text: 'Sur mobile, ignorer les contraintes de taille d ecran n impacte pas l ergonomie.', answer: 'FAUX' }
      ],
      cuisine: [
        { text: `Pour ${theme}, prechauffer le four peut impacter la cuisson finale.`, answer: 'VRAI' },
        { text: `Pour ${theme}, ouvrir souvent le four n influence jamais le resultat.`, answer: 'FAUX' },
        { text: `Pour ${theme}, tamiser la farine peut aider a obtenir une mie plus legere.`, answer: 'VRAI' },
        { text: `Pour ${theme}, augmenter fortement la temperature reduit toujours les risques de gateau sec.`, answer: 'FAUX' }
      ],
      generic: [
        { text: `Pour ${theme}, suivre une methode progressive augmente les chances de reussite.`, answer: 'VRAI' },
        { text: `Pour ${theme}, ignorer les bases permet d obtenir plus vite un bon resultat.`, answer: 'FAUX' },
        { text: `Pour ${theme}, pratiquer regulierement aide a consolider les acquis.`, answer: 'VRAI' },
        { text: `Pour ${theme}, copier sans comprendre est la meilleure strategie long terme.`, answer: 'FAUX' }
      ]
    };

    const qcmChoices = [
      {
        correct: 'Identifier la cause racine, proposer une solution et valider par tests.',
        wrong: ['Appliquer un correctif rapide sans verifier les effets de bord.', 'Reporter la decision sans plan de mitigation.', 'Modifier plusieurs composants sans controle de regression.']
      },
      {
        correct: 'Mesurer, comparer, puis optimiser la partie la plus couteuse en priorite.',
        wrong: ['Optimiser au hasard sans metriques.', 'Supprimer les logs et les tests pour gagner du temps.', 'Changer d architecture avant toute mesure.']
      },
      {
        correct: 'Decouper le probleme en etapes, verifier chaque hypothese puis automatiser la validation.',
        wrong: ['Traiter uniquement les symptomes visibles.', 'Ignorer les cas limites pour aller plus vite.', 'Reporter les correctifs a une version future sans suivi.']
      }
    ];

    const selectedQuestions: string[] = [];
    const shuffledBank = shuffle(questionBanks[domain]);
    const variants = ['(axe performance)', '(axe architecture)', '(axe fiabilite)', '(axe qualite)'];

    for (const candidate of shuffledBank) {
      const key = `${domain}::${candidate}`.toLowerCase();
      if (!this.recentFallbackQuestions.has(key)) {
        selectedQuestions.push(candidate);
      }
      if (selectedQuestions.length >= nombre) {
        break;
      }
    }

    while (selectedQuestions.length < nombre) {
      const base = shuffledBank[selectedQuestions.length % shuffledBank.length];
      const variant = variants[selectedQuestions.length % variants.length];
      selectedQuestions.push(`${base} ${variant}`);
    }

    const rememberQuestion = (value: string): void => {
      this.recentFallbackQuestions.add(`${domain}::${value}`.toLowerCase());
      if (this.recentFallbackQuestions.size > 80) {
        const keys = Array.from(this.recentFallbackQuestions);
        this.recentFallbackQuestions = new Set(keys.slice(keys.length - 40));
      }
    };

    if (type === 'VRAI_FAUX') {
      const vfPool = shuffle(vfAffirmations[domain]);
      while (vfPool.length < nombre) {
        vfPool.push(vfAffirmations[domain][vfPool.length % vfAffirmations[domain].length]);
      }

      return Array.from({ length: nombre }, (_, index) => {
        const item = vfPool[index];
        const trueFirst = Math.random() >= 0.5;
        const choices = trueFirst
          ? [
              { texte: 'VRAI', correcte: item.answer === 'VRAI', ordre: 1 },
              { texte: 'FAUX', correcte: item.answer === 'FAUX', ordre: 2 }
            ]
          : [
              { texte: 'FAUX', correcte: item.answer === 'FAUX', ordre: 1 },
              { texte: 'VRAI', correcte: item.answer === 'VRAI', ordre: 2 }
            ];

        const finalContent = `${niveau}: ${item.text}`;
        rememberQuestion(finalContent);
        return {
          contenu: finalContent,
          type,
          niveau,
          points: 1,
          ordre: index + 1,
          choix: choices
        };
      });
    }

    return Array.from({ length: nombre }, (_, index) => {
      const baseQuestion = selectedQuestions[index];
      const choiceSet = qcmChoices[index % qcmChoices.length];
      const distractors = shuffle(choiceSet.wrong).slice(0, 3);
      const allChoices = shuffle([choiceSet.correct, ...distractors]);

      const choix = allChoices.map((text, cIndex) => ({
        texte: text,
        correcte: text === choiceSet.correct,
        ordre: cIndex + 1
      }));

      if (type === 'QCU') {
        let hasMarked = false;
        choix.forEach((c) => {
          if (c.correcte && !hasMarked) {
            hasMarked = true;
          } else {
            c.correcte = false;
          }
        });
      }

      const finalQuestion = `${niveau}: ${baseQuestion}`;
      rememberQuestion(finalQuestion);
      return {
        contenu: finalQuestion,
        type,
        niveau,
        points: 1,
        ordre: index + 1,
        choix
      };
    });
  }

  private buildSmartFallbackChoices(questionText: string, type: string, theme: string): any[] {
    if (type === 'VRAI_FAUX') {
      return [
        { texte: 'VRAI', correcte: true, ordre: 1 },
        { texte: 'FAUX', correcte: false, ordre: 2 }
      ];
    }

    const normalized = `${questionText} ${theme}`.toLowerCase();
    let pool = ['Approche recommandee', 'Approche partiellement correcte', 'Approche incorrecte'];

    if (normalized.includes('sql') || normalized.includes('requete') || normalized.includes('join')) {
      pool = ['Indexer les colonnes de filtre principales', 'Utiliser SELECT * systematiquement', 'Remplacer les JOIN par des sous-requetes non filtrees'];
    } else if (normalized.includes('mobile') || normalized.includes('android') || normalized.includes('ios') || normalized.includes('flutter') || normalized.includes('react native')) {
      pool = ['Instrumenter les performances (cold start, memoire, crash) et corriger les goulots', 'Multiplier les appels reseau sans cache ni retry', 'Ignorer l ergonomie mobile et les tailles d ecran'];
    } else if (normalized.includes('angular') || normalized.includes('component') || normalized.includes('rxjs')) {
      pool = ['Utiliser des services injectables et composants decouples', 'Mettre toute la logique metier dans le template', 'Ignorer la gestion des subscriptions'];
    } else if (normalized.includes('java') || normalized.includes('spring')) {
      pool = ['Separer controller/service/repository', 'Capter toutes les exceptions sans log', 'Mettre les acces DB directement dans le controller'];
    }

    const choices = pool.slice(0, Math.max(3, type === 'QCU' ? 3 : 3)).map((text, index) => ({
      texte: text,
      correcte: index === 0,
      ordre: index + 1
    }));

    if (type === 'QCU') {
      return choices.map((choice, index) => ({ ...choice, correcte: index === 0 }));
    }

    return choices;
  }

  private ensureChoicesForRequestedType(choices: any[], requestedType: string, seedText: string): any[] {
    const normalizedType = this.normalizeQuestionType(requestedType);
    const cleanedChoices = Array.isArray(choices)
      ? choices.filter((choice) => !!String(choice?.texte || choice?.contenu || choice?.label || choice?.text || '').trim())
      : [];

    if (normalizedType === 'VRAI_FAUX') {
      const firstChoice = cleanedChoices[0]?.texte || cleanedChoices[0]?.contenu || 'VRAI';
      const answer = String(cleanedChoices.find((choice) => choice?.correcte === true)?.texte || firstChoice).toLowerCase();
      return [
        { texte: 'VRAI', correcte: /vrai|true|yes|oui/.test(answer), ordre: 1 },
        { texte: 'FAUX', correcte: !/vrai|true|yes|oui/.test(answer), ordre: 2 }
      ];
    }

    if (normalizedType === 'QCU') {
      const normalizedChoices = cleanedChoices.length >= 2
        ? cleanedChoices.map((choice, index) => ({
            texte: String(choice.texte || choice.contenu || choice.label || choice.text || '').trim(),
            correcte: index === 0 ? Boolean(choice?.correcte === true || choice?.correct === true || choice?.isCorrecte === true) : false,
            ordre: Number(choice?.ordre) || index + 1
          }))
        : this.buildSmartFallbackChoices(seedText, normalizedType, seedText);

      let found = false;
      return normalizedChoices.map((choice) => {
        if (choice.correcte && !found) {
          found = true;
          return choice;
        }
        return { ...choice, correcte: false };
      });
    }

    if (cleanedChoices.length >= 2) {
      return cleanedChoices.map((choice, index) => ({
        texte: String(choice.texte || choice.contenu || choice.label || choice.text || '').trim(),
        correcte: Boolean(choice?.correcte === true || choice?.correct === true || choice?.isCorrecte === true),
        ordre: Number(choice?.ordre) || index + 1
      }));
    }

    return this.buildSmartFallbackChoices(seedText, normalizedType, seedText);
  }

  createQuestion(question: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = localStorage.getItem('token');
    const entretienId = Number(question?.entretienId);

    if (!entretienId || isNaN(entretienId) || entretienId <= 0) {
      const invalidIdError = new Error('ID entretien manquant ou invalide pour la création de question');
      console.error('❌ createQuestion - entretienId invalide:', question?.entretienId);
      return throwError(() => invalidIdError);
    }
    
    return this.http.post(`${this.apiUrl}/questions/entretien/${entretienId}`, question, { headers }).pipe(
      catchError(error => {
        console.error('❌ Question creation failed:', error);
        console.error('🔻 response body:', error.error);
        console.error('🔻 status:', error.status, error.statusText);

        if (error.status === 403) {
          console.error('🚫 AUTHORIZATION DENIED (403)');
          console.error('Possible causes:');
          console.error('1. No valid JWT token in Authorization header');
          console.error('2. Token missing ROLE_RECRUTEUR authority');
          console.error('3. Backend SecurityConfig not recompiled');
          console.error('Error response:', error.error);
        } else if (error.status === 401) {
          console.error('🔐 AUTHENTICATION REQUIRED (401) - Invalid or expired token');
          console.error('Error response:', error.error);
        }

        return throwError(() => error);
      })
    );
  }

  updateQuestion(id: number, question: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.apiUrl}/questions/${id}`, question, { headers });
  }

  deleteQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/questions/${id}`);
  }

  updateEntretien(id: number, entretien: any): Observable<any> {
    const recruteurId = Number(localStorage.getItem('recruteurId'));
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (!isNaN(recruteurId) && recruteurId > 0) {
      headers = headers.set('Recruteur-ID', String(recruteurId));
    }
    return this.http.put(`${this.apiUrl}/entretiens/${id}`, entretien, { headers });
  }

  deleteEntretien(id: number): Observable<any> {
    const recruteurId = Number(localStorage.getItem('recruteurId'));
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (!isNaN(recruteurId) && recruteurId > 0) {
      headers = headers.set('Recruteur-ID', String(recruteurId));
    }
    return this.http.delete(`${this.apiUrl}/entretiens/${id}`, { headers });
  }

  // Resultats
  getResultat(entretienId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/entretiens/${entretienId}/resultat`);
  }

  submitEntretienResponses(entretienId: number, score: number, rapport?: string): Observable<any> {
    const payload: any = { score };
    if (rapport && rapport.trim()) {
      payload.rapport = rapport.trim();
    }
    return this.http.post(`${this.apiUrl}/entretiens/${entretienId}/submit-responses`, payload);
  }

  // Domaines
  getDomaines(): Observable<any> {
    return this.http.get(`${this.apiUrl}/domaines`);
  }

  // Candidat methods
  getCandidats(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidats`, { headers });
  }

  getCandidat(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidats/${id}`, { headers });
  }

  getCandidateByEmail(email: string): Observable<any> {
    const encodedEmail = encodeURIComponent(email);
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidats/email/${encodedEmail}`, { headers });
  }

  createCandidate(candidateData: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/candidats`, candidateData, { headers });
  }

  // ==================== FOLLOW FEATURE ====================

  followUser(userToFollowId: number, token: string): Observable<any> {
    console.log('🌐 API: followUser called with userId:', userToFollowId);
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    const url = `${this.apiUrl}/follows/${userToFollowId}/follow`;
    console.log('🌐 API: Making POST request to:', url);
    return this.http.post(url, {}, { headers });
  }

  unfollowUser(userToUnfollowId: number, token: string): Observable<any> {
    console.log('🌐 API: unfollowUser called with userId:', userToUnfollowId);
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    const url = `${this.apiUrl}/follows/${userToUnfollowId}/unfollow`;
    console.log('🌐 API: Making POST request to:', url);
    return this.http.post(url, {}, { headers });
  }

  getFollowers(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/follows/${userId}/followers`);
  }

  isFollowing(userIdToCheck: number, token: string): Observable<any> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/follows/${userIdToCheck}/is-following`, { headers });
  }

  getFollowersCount(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/follows/${userId}/followers-count`);
  }

  updateCandidate(id: number, candidateData: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.put(`${this.apiUrl}/candidats/${id}`, candidateData, { headers });
  }

  deleteCandidate(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.delete(`${this.apiUrl}/candidats/${id}`, { headers });
  }

  updateCandidateCompetences(id: number, data: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.put(`${this.apiUrl}/candidats/${id}/competences`, data, { headers });
  }

  getAllCompetences(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/competences`, { headers });
  }

  // Localisation methods
  getLocalisation(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/localisations/${id}`, { headers });
  }

  createLocalisation(localisationData: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/localisations`, localisationData, { headers });
  }

  updateLocalisation(id: number, localisationData: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.put(`${this.apiUrl}/localisations/${id}`, localisationData, { headers });
  }

  deleteLocalisation(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.delete(`${this.apiUrl}/localisations/${id}`, { headers });
  }

  // Test d'authentification
  testAuth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/test-auth`);
  }
  // ==================== CANDIDATURES ====================

  // Candidatures
  getMesCandidatures(): Observable<any> {
    const headers = this.buildAuthHeaders();

    // Avoid guaranteed 401/403 calls when session is absent.
    if (!headers.get('Authorization')) {
      return of([]);
    }

    const primaryUrl = `${this.apiUrl}/candidatures/mes-candidatures`;
    return this.http.get(primaryUrl, { headers }).pipe(
      catchError((error) => {
        // Some backend versions expose candidatures by candidate id instead.
        if (error?.status !== 404) {
          return throwError(() => error);
        }

        const candidatId = Number(localStorage.getItem('candidatId'));
        if (!Number.isFinite(candidatId) || candidatId <= 0) {
          return of([]);
        }

        return this.http
          .get(`${this.apiUrl}/candidatures/candidat/${candidatId}`, { headers })
          .pipe(
            catchError((fallbackError) => {
              if (fallbackError?.status === 404) {
                return of([]);
              }
              return throwError(() => fallbackError);
            })
          );
      })
    );
  }

  getStatsCandidatures(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token && token !== 'undefined' && token !== 'null') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidatures/stats`, { headers });
  }

  // Récupérer une candidature par ID
  getCandidatureById(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token && token !== 'undefined' && token !== 'null') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidatures/${id}`, { headers });
  }

  // Créer une candidature (postuler)
  creerCandidature(data: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    const normalizedData = {
      ...data,
      nomComplet: this.normalizeCandidatureName(data?.nomComplet, data?.email)
    };
    console.log('📡 Envoi des données:', normalizedData);
    return this.http.post(`${this.apiUrl}/candidatures`, normalizedData, { headers });
  }

  private normalizeCandidatureName(rawName: string, email: string): string {
    let candidate = (rawName || '').trim();

    // If name looks like an email, derive a readable name from local-part.
    if (candidate.includes('@')) {
      candidate = candidate.split('@')[0] || '';
    }

    if (!candidate && email) {
      candidate = (email.split('@')[0] || '').trim();
    }

    candidate = candidate
      .replace(/[0-9_\.]+/g, ' ')
      .replace(/[^a-zA-ZÀ-ÿ\s'\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return candidate || 'Candidat';
  }

  // Modifier une candidature (entreprise, poste, lettre)
  modifierCandidature(id: number, data: any): Observable<any> {
    console.log('🔧 API - Modification complète:', { id, data });
    return this.http.put(`${this.apiUrl}/candidatures/${id}`, data);
  }

  // Modifier le statut d'une candidature
  modifierStatutCandidature(id: number, statut: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/candidatures/${id}/statut?statut=${statut}`, {});
  }

  // Récupérer toutes les candidatures (pour recruteur)
  getAllCandidaturesForRecruteur(): Observable<any[]> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<any[]>(`${this.apiUrl}/candidatures/admin/toutes`, { headers });
  }

  getCandidaturesByOffre(offreId: number): Observable<any[]> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const primaryUrl = `${this.apiUrl}/candidatures/offre/${offreId}`;
    const fallbackUrlA = `${this.apiUrl}/offres/${offreId}/candidatures`;
    const fallbackUrlB = `${this.apiUrl}/offres-emploi/${offreId}/candidatures`;

    return this.http.get<any[]>(primaryUrl, { headers }).pipe(
      catchError((firstError) => {
        if (firstError?.status === 404 || firstError?.status === 405 || firstError?.status === 500) {
          console.warn('⚠️ getCandidaturesByOffre fallback after primary failure:', firstError?.status, firstError?.message || firstError);
          return this.http.get<any[]>(fallbackUrlA, { headers }).pipe(
            catchError((secondError) => {
              if (secondError?.status === 404 || secondError?.status === 405 || secondError?.status === 500) {
                return this.http.get<any[]>(fallbackUrlB, { headers }).pipe(
                  catchError((thirdError) => {
                    console.warn('⚠️ getCandidaturesByOffre returning empty list after all fallbacks failed:', thirdError?.status, thirdError?.message || thirdError);
                    return of([]);
                  })
                );
              }
              return of([]);
            })
          );
        }

        return throwError(() => firstError);
      })
    );
  }

  // Récupérer les statistiques pour recruteur
  getStatsForRecruteur(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/recruteur/stats`);
  }

  supprimerCandidature(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.delete(`${this.apiUrl}/candidatures/${id}`, { headers });
  }

  // Rechercher des candidatures par entreprise
  rechercherCandidaturesParEntreprise(entreprise: string): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidatures/recherche?entreprise=${entreprise}`, { headers });
  }

  // Filtrer les candidatures par statut
  filtrerCandidaturesParStatut(statut: string): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidatures/filtre/statut/${statut}`, { headers });
  }

  // Trier les candidatures par date
  trierCandidaturesParDate(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/candidatures/tri/date`, { headers });
  }

  getOffresEmploi(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/offres-emploi`, { headers });
  }

  getOffreEmploiById(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const primaryUrl = `${this.apiUrl}/offres-emploi/${id}`;

    return this.http.get(primaryUrl, { headers }).pipe(
      catchError((firstError) => {
        const shouldTryAltEndpoint = firstError?.status === 404 || firstError?.status === 405 || firstError?.status === 500;

        if (shouldTryAltEndpoint) {
          // Fallback: fetch list and resolve the item client-side.
          // Avoid probing /api/offres/{id} which may return noisy 500s on some backends.
          return this.http.get<any[]>(`${this.apiUrl}/offres-emploi`, { headers }).pipe(
            map((offres) => {
              const matched = (offres || []).find((item: any) => Number(item?.id) === Number(id));
              if (!matched) {
                throw firstError;
              }
              return matched;
            })
          );
        }

        return throwError(() => firstError);
      })
    );
  }

  getMesOffresEmploi(): Observable<any[]> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<any[]>(`${this.apiUrl}/offres-emploi/mes-offres`, { headers });
  }

  private normalizeOffreEmploiPayload(data: any): any {
    const competences = Array.isArray(data?.competencesRequises)
      ? data.competencesRequises
      : [];

    const uniqueCompetences = [...new Set(
      competences
        .map((item: any) => String(item ?? '').trim())
        .filter((item: string) => !!item)
    )];

    return {
      ...data,
      titre: String(data?.titre ?? '').trim(),
      description: String(data?.description ?? '').trim(),
      entreprise: String(data?.entreprise ?? '').trim() || null,
      location: String(data?.location ?? '').trim(),
      salary: String(data?.salary ?? '').trim() || null,
      typeContrat: String(data?.typeContrat ?? '').trim().toUpperCase(),
      competencesRequises: uniqueCompetences.slice(0, 15)
    };
  }

  private validateOffreEmploiPayload(data: any): string | null {
    const titre = String(data?.titre ?? '');
    const description = String(data?.description ?? '');
    const entreprise = String(data?.entreprise ?? '');
    const location = String(data?.location ?? '');
    const salary = String(data?.salary ?? '');
    const typeContrat = String(data?.typeContrat ?? '');
    const competences = Array.isArray(data?.competencesRequises) ? data.competencesRequises : [];

    if (!titre || !description || !entreprise || !location || !salary || !typeContrat || !data?.deadline || !competences.length) {
      return 'Titre, description, entreprise, localisation, salaire, type de contrat, date limite et competences sont obligatoires.';
    }

    if (titre.length < 3 || titre.length > 120) {
      return 'Titre invalide (3 a 120 caracteres).';
    }

    if (description.length < 20 || description.length > 2000) {
      return 'Description invalide (20 a 2000 caracteres).';
    }

    if (entreprise.length < 2 || entreprise.length > 100) {
      return 'Entreprise invalide (2 a 100 caracteres).';
    }

    if (location.length < 2 || location.length > 100) {
      return 'Localisation invalide (2 a 100 caracteres).';
    }

    if (salary.length < 1 || salary.length > 50) {
      return 'Salaire invalide (1 a 50 caracteres).';
    }

    const allowedTypes = ['CDI', 'CDD', 'STAGE', 'FREELANCE'];
    if (!allowedTypes.includes(typeContrat)) {
      return 'Type de contrat invalide.';
    }

    const dateValue = data?.deadline;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return 'Date limite invalide.';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);
    if (parsed <= today) {
      return 'La date limite doit etre strictement future.';
    }

    if (competences.length > 15) {
      return 'Le nombre maximum de competences est 15.';
    }

    const invalidCompetence = competences.find((item: any) => {
      const skill = String(item ?? '').trim();
      return skill.length < 2 || skill.length > 40;
    });

    if (invalidCompetence) {
      return 'Chaque competence doit contenir entre 2 et 40 caracteres.';
    }

    return null;
  }

  creerOffreEmploi(data: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const normalizedData = this.normalizeOffreEmploiPayload(data);
    const validationError = this.validateOffreEmploiPayload(normalizedData);
    if (validationError) {
      return throwError(() => ({
        status: 400,
        message: validationError,
        clientValidation: true
      }));
    }

    return this.http.post(`${this.apiUrl}/offres-emploi`, normalizedData, { headers });
  }

  modifierOffreEmploi(id: number, data: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.put(`${this.apiUrl}/offres-emploi/${id}`, data, { headers });
  }

  supprimerOffreEmploi(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const primaryUrl = `${this.apiUrl}/offres-emploi/${id}`;

    return this.http.delete(primaryUrl, { headers }).pipe(
      catchError((firstError) => {
        if (firstError?.status === 404 || firstError?.status === 405) {
          console.warn('⚠️ supprimerOffreEmploi endpoint unavailable, returning soft success:', firstError?.status, firstError?.message || firstError);
          return of({ softDeleted: true });
        }

        return throwError(() => firstError);
      })
    );
  }

  // Newsletter
  subscribeNewsletter(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/newsletter/subscribe`, { email }, { headers });
  }

  // ==================== DOCUMENTS CRUD ====================

  // Récupérer UNIQUEMENT les documents du candidat connecté (et non tous les documents)
getMesDocuments(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // ✅ /documents suffit — le backend filtre par candidat via le token JWT
    return this.http.get(`${this.apiUrl}/documents`, { headers });
}

// Récupérer un document par son ID (avec vérification d'appartenance)
getDocumentById(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // ✅ Ce endpoint vérifie que le document appartient au candidat connecté
    return this.http.get(`${this.apiUrl}/documents/${id}`, { headers });
}

// Créer un document (automatiquement lié au candidat connecté)
creerDocument(data: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // ✅ Inchangé - le backend lie automatiquement au candidat connecté
    return this.http.post(`${this.apiUrl}/documents`, data, { headers });
}

// Modifier un document (vérifie que le document appartient au candidat)
modifierDocument(id: number, data: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // ✅ Inchangé - le backend vérifie l'appartenance avant modification
    return this.http.put(`${this.apiUrl}/documents/${id}`, data, { headers });
}

// Supprimer un document (vérifie que le document appartient au candidat)
supprimerDocument(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // ✅ Inchangé - le backend vérifie l'appartenance avant suppression
    return this.http.delete(`${this.apiUrl}/documents/${id}`, { headers });
}

traiterPhoto(formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/documents/traiter-photo`, formData, { headers });
}

  quickApply(candidatureData: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/candidatures/quick-apply`, candidatureData, { headers });
  }
  // Envoyer un email de notification pour une candidature
  envoyerEmailCandidature(emailData: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/candidatures/send-email`, emailData, { headers });
  }

  // Envoyer un message entre utilisateur connecté et destinataire
  sendMessage(messageData: any): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/messages/send`, messageData, { headers });
  }

  // Récupérer les messages de la boîte actuelle (candidat ou recruteur)
  getMessagesForCurrentUser(): Observable<any[]> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (!token || token === 'undefined' || token === 'null') {
      // Pas de token : on évite l'appel et on retourne un tableau vide
      return of([]);
    }
    headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.get<any[]>(`${this.apiUrl}/messages/mes-messages`, { headers }).pipe(
      catchError((err) => {
        if (err.status === 403 || err.status === 401) {
          // Si non autorisé, on retourne un tableau vide sans bloquer l'UI
          return of([]);
        }
        return throwError(() => err);
      })
    );
  }

  // Alias conservé pour compatibilité avec l'existant
  getMessagesForCandidat(): Observable<any[]> {
    return this.getMessagesForCurrentUser();
  }

  // Marquer un message comme lu
  marquerMessageCommeL(messageId: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.put(`${this.apiUrl}/messages/${messageId}/lu`, {}, { headers });
  }

  // Supprimer un message
  supprimerMessage(messageId: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.delete(`${this.apiUrl}/messages/${messageId}`, { headers });
  }

  // ==================== NOTIFICATIONS ====================

  getUnreadNotificationCount(token: string): Observable<any> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    headers = headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers = headers.set('Pragma', 'no-cache');
    headers = headers.set('Expires', '0');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    return this.http.get(`${this.apiUrl}/notifications/unread-count?t=${timestamp}`, { headers });
  }

  getNotifications(token: string): Observable<any[]> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    headers = headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers = headers.set('Pragma', 'no-cache');
    headers = headers.set('Expires', '0');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    return this.http.get<any[]>(`${this.apiUrl}/notifications?t=${timestamp}`, { headers });
  }

  markNotificationAsRead(notificationId: number): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/notifications/${notificationId}/read`, {}, { headers });
  }

  markAllNotificationsAsRead(token: string): Observable<any> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/notifications/mark-all-read`, {}, { headers });
  }

  /** Freelance verification flags; falls back if the endpoint is absent. */
  getVerificationStatus(token: string): Observable<{ emailVerified?: boolean; identityStatus?: string }> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http
      .get<{ emailVerified?: boolean; identityStatus?: string }>(
        `${this.apiUrl}/freelance/verification/status`,
        { headers }
      )
      .pipe(
        catchError(() => of({ emailVerified: false, identityStatus: 'UNVERIFIED' }))
      );
  }

  deleteAllNotifications(token: string): Observable<any> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/notifications/delete-all`, {}, { headers });
  }

// ==================== FONCTIONNALITÉS AVANCÉES ====================

// 1. Gamification
getGamification(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/gamification`);
}

// 2. Smart Match
getSmartMatch(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/smart-match`);
}

// 3. Radar Compétences
getRadarCompetences(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/radar-competences`);
}

// 4. Taux de réussite
getTauxReussite(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/taux-reussite`);
}

// 5. Statistiques par mois
getStatsParMois(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/stats-par-mois`);
}

// 6. Prédiction IA
getPredictionSucces(cvContent: string, historique: any[]): Observable<any> {
    if (!this.mlAvailable) {
      return of({
        probabilite: 25,
        meilleurMoment: 'Service IA indisponible',
        pointsForts: ['Profil en cours d analyse'],
        pointsAmeliorer: ['Relancer le service ML sur le port 8000'],
        conseilsSpecifiques: ['Demarrer le serveur Python pour activer la prediction'],
        couleur: '#ef4444'
      });
    }

    return this.http.post(`${this.mlUrl}/prediction/succes`, {
      cv_content: cvContent,
      historique_candidatures: historique
    }).pipe(
      catchError(() => {
        this.mlAvailable = false;
        return of({
          probabilite: 25,
          meilleurMoment: 'Service IA indisponible',
          pointsForts: ['Profil en cours d analyse'],
          pointsAmeliorer: ['Relancer le service ML sur le port 8000'],
          conseilsSpecifiques: ['Demarrer le serveur Python pour activer la prediction'],
          couleur: '#ef4444'
        });
      })
    );
}

// 7. Relances
getRelances(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/relances`);
}

// 8. Timeline
getTimeline(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidatures/timeline`);
}

// ==================== ANALYSE CV ====================

 analyserCV(documentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/cv-analyse/analyser/${documentId}`, {});
  }

  // ============ OPTIMISATION CV ============
  optimiserCV(documentId: number, offreEmploi: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cv-analyse/optimiser/${documentId}`, { offreEmploi });
  }


getAlertesCandidatures(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/candidatures/alertes`);
}

getDoublonsCandidatures(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/candidatures/doublons`);
}

getAnalyseProfil(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/candidatures/analyse-profil`);
}



// ============ NOUVELLES MÉTHODES ============

getMesDocumentsAvecInfos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/documents/jpql/mes-documents-avec-infos`);
}

getMesCVsAvecCandidatures(): Observable<any> {
    return this.http.get(`${this.apiUrl}/documents/jpql/mes-cvs-candidatures`);
}

getMesStatistiques(): Observable<any> {
    return this.http.get(`${this.apiUrl}/documents/jpql/mes-statistiques`);
}

rechercherParMotCle(mot: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/documents/keywords/recherche?mot=${mot}`);
}

rechercherMultiMotsCles(motsCles: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/documents/keywords/multi-recherche`, motsCles);
}


// ============ NOUVELLES MÉTHODES SPRING DATA JPA KEYWORDS ============

// Recherche par nom contenant (IgnoreCase)
rechercherParNomContenant(nom: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/documents/keywords/jpa/by-nom?nom=${nom}`);
}

// Recherche par type ET nom
rechercherParTypeEtNom(type: string, nom: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/documents/keywords/jpa/by-type-and-nom?type=${type}&nom=${nom}`);
}

// Vérifier existence document par candidat et type
existsDocumentParCandidat(candidatId: number, type: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/documents/keywords/jpa/exists-by-candidat?candidatId=${candidatId}&type=${type}`);
}

// Compter documents par candidat
compterDocumentsParCandidat(candidatId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/documents/keywords/jpa/count-by-candidat?candidatId=${candidatId}`);
}

// Top 5 documents récents par candidat
getTop5DocumentsRecents(candidatId: number, mot: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/documents/keywords/jpa/top5-recents?candidatId=${candidatId}&mot=${mot}`);
}
// Dans api.service.ts
archiverCandidature(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/candidatures/${id}/archiver`, {});
}

restaurerCandidature(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/candidatures/${id}/restaurer`, {});
}
traiterPhotoProfessionnelle(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/documents/traiter-photo`, formData);
}

  getCandidatCompetences(candidatId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/candidat/${candidatId}/competences`);
    } 
     // src/app/api.service.ts
getCurrentCandidat(): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidats/me`);
}

//  CHATBOT
chatWithML(message: string, cvContent: string): Observable<any> {
    // Appel direct au serveur FastAPI sur le port 8000
    return this.http.post(`${environment.mlUrl}/chat/ml`, { 
        message: message, 
        cv_content: cvContent 
    });
}

chatRecruiterAssistant(message: string, context?: { theme?: string; type?: string; niveau?: string }): Observable<string> {
  const cleanMessage = String(message || '').trim();
  const theme = String(context?.theme || 'entretien technique').trim();
  const type = String(context?.type || 'QCM').trim().toUpperCase();
  const niveau = String(context?.niveau || 'INTERMEDIAIRE').trim().toUpperCase();

  if (!cleanMessage) {
    return of('Posez votre question.');
  }

  const fallbackReply = this.buildChatServiceUnavailableReply();

  const system =
    `Tu es un assistant conversationnel polyvalent en francais. ` +
    `Tu peux repondre a n importe quel sujet de facon claire, utile, precise et naturelle. ` +
    `Contexte optionnel entretien: theme="${theme}", type="${type}", niveau="${niveau}". ` +
    `Si la question n est pas liee au recrutement, reponds normalement sans ramener au theme. ` +
    `Ne retourne pas de JSON. ` +
    `N invente pas de faits. Si l information est incertaine, dis-le explicitement.`;

  const body = {
    model: 'openai',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: cleanMessage }
    ],
    temperature: 0.6,
    max_tokens: 1200,
    stream: false
  };

  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  return this.http.post<any>('/oss/openai', body, { headers }).pipe(
    map((res) => {
      const raw = String(this.extractPollinationsOpenAiText(res) || '').trim();
      if (!raw || this.isProviderNoticeText(raw)) {
        return fallbackReply;
      }

      const cleaned = raw
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^\s*[|:,-]\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleaned || this.isProviderNoticeText(cleaned)) {
        return fallbackReply;
      }

      return cleaned;
    }),
    catchError(() => of(fallbackReply))
  );
}

  private buildChatServiceUnavailableReply(): string {
    return 'Le service de conversation est temporairement indisponible. Reessayez dans quelques secondes.';
  }

  private answerConceptQuestion(message: string, theme: string): string {
    const normalized = String(message || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const themeLabel = theme || 'ce sujet';

    if (normalized.includes('sql join') || (normalized.includes('join') && normalized.includes('sql'))) {
      return `SQL JOIN sert à combiner des lignes de plusieurs tables. INNER JOIN garde seulement les correspondances, LEFT JOIN garde toutes les lignes de la table de gauche même sans correspondance, et RIGHT JOIN fait l'inverse. Sur "${themeLabel}", je peux aussi vous proposer une question d'entretien ou un cas pratique.`;
    }

    if (normalized.includes('qcm') || normalized.includes('qcu')) {
      return `QCM autorise plusieurs bonnes réponses, alors que QCU n'en autorise qu'une seule. Pour "${themeLabel}", je peux vous aider à formuler une question plus précise ou à définir une bonne réponse attendue.`;
    }

    if (normalized.includes('vrai faux') || normalized.includes('vf')) {
      return `Un VRAI/FAUX doit tester un point précis et non une généralité. Pour "${themeLabel}", je peux vous proposer un énoncé clair avec la bonne réponse attendue.`;
    }

    if (normalized.includes('angular')) {
      return `Angular est un framework front-end basé sur des composants, le typage TypeScript et la gestion d'état réactive. Pour "${themeLabel}", je peux vous expliquer un concept comme les services, les observables ou les interceptors.`;
    }

    if (normalized.includes('java')) {
      return `Java est un langage orienté objet très utilisé côté backend. Pour "${themeLabel}", je peux vous expliquer les bases, les exceptions, les interfaces ou la différence entre classe abstraite et interface.`;
    }

    if (normalized.includes('spring')) {
      return `Spring aide à construire des applications Java structurées, avec injection de dépendances, contrôleurs, services et repositories. Pour "${themeLabel}", je peux détailler une bonne réponse d'entretien.`;
    }

    if (normalized.includes('sql') || normalized.includes('base de donne') || normalized.includes('database')) {
      return `SQL sert à interroger et manipuler des données dans une base relationnelle. Pour "${themeLabel}", je peux expliquer les JOIN, les index, les transactions ou les bonnes pratiques d'écriture de requêtes.`;
    }

    return `Sur "${themeLabel}", je peux vous répondre de façon concrète. Donnez-moi un point précis à clarifier ou un candidat à évaluer, et je vous aide immédiatement.`;
  }

  // ==================== CONNECTION STATISTICS ====================

  getConnectionCount(userId: number): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.get(`${this.apiUrl}/connections/count/${userId}`, { headers });
  }

  getConnectionStats(userId: number): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.get(`${this.apiUrl}/connections/stats/${userId}`, { headers });
  }

  getLoginHistory(userId: number): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/connections/history/${userId}`, { headers });
  }

  getAllConnectionStats(): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/connections/all-stats`, { headers });
  }
  analyzeSkillGap(candidatId: number, targetJob: string): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.post(`${this.apiUrl}/formations/analyze-gap/${candidatId}`, { targetJob }, { headers });
  }
}



