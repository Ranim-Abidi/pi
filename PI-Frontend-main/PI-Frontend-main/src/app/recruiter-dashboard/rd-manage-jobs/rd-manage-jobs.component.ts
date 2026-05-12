import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../api.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

interface DecisionRow {
    candidatureId: number | null;
    candidatNom: string;
    candidatureStatut: string;
    competencesOffre: string[];
    competencesCandidat: string[];
    competencesCorrespondantes: string[];
    competencesManquantes: string[];
    tauxCorrespondance: number;
    scoreEntretien: number | null;
    scoreCompetence: number;
    scoreExperience: number;
    scoreFinal: number;
    experienceAnnees: number;
    rang: number;
    decision: string;
    recommandation: string;
}

interface DecisionReport {
    offre: any;
    candidats: DecisionRow[];
    candidatRecommande: DecisionRow | null;
    totalCandidatures: number;
    totalEntretiens: number;
}

@Component({
    selector: 'app-rd-manage-jobs',
    standalone: false,
    templateUrl: './rd-manage-jobs.component.html',
    styleUrls: ['./rd-manage-jobs.component.scss']
})
export class RdManageJobsComponent {
    offres: any[] = [];
    loading = false;
    saving = false;
    decisionLoading = false;
    errorMessage = '';
    successMessage = '';
    offreEditee: any = null;
    decisionError = '';
    decisionReport: DecisionReport | null = null;
    expandedOffreId: number | null = null;

    constructor(private apiService: ApiService, private router: Router) { }

    ngOnInit(): void { this.chargerOffres(); }

    chargerOffres(): void {
        this.loading = true;
        this.errorMessage = '';
        this.apiService.getMesOffresEmploi().subscribe({
            next: (data) => {
                this.offres = data || [];
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.apiService.getOffresEmploi().subscribe({
                    next: (fallbackData) => {
                        this.offres = fallbackData || [];
                        this.errorMessage = this.offres.length > 0 ? '' : 'Impossible de charger vos offres.';
                        this.loading = false;
                    },
                    error: () => {
                        this.errorMessage = 'Impossible de charger vos offres.';
                        this.loading = false;
                    }
                });
            }
        });
    }

    modifier(offre: any): void {
        this.offreEditee = {
            ...offre,
            deadline: offre?.deadline ? this.toDateInputValue(offre.deadline) : ''
        };
    }

    annuler(): void {
        this.offreEditee = null;
    }

    enregistrer(): void {
        if (!this.offreEditee?.id) { return; }

        this.saving = true;
        const payload = {
            ...this.offreEditee,
            deadline: this.offreEditee.deadline ? new Date(this.offreEditee.deadline) : null,
            competencesRequises: Array.isArray(this.offreEditee.competencesRequises) ? this.offreEditee.competencesRequises : []
        };

        this.apiService.modifierOffreEmploi(this.offreEditee.id, payload).subscribe({
            next: () => {
                this.successMessage = 'Offre mise a jour.';
                this.offreEditee = null;
                this.saving = false;
                this.chargerOffres();
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = 'Erreur lors de la mise a jour.';
                this.saving = false;
            }
        });
    }

    supprimer(offre: any): void {
        if (!offre?.id) { return; }
        if (!confirm(`Supprimer l'offre "${offre.titre}" ?`)) { return; }

        this.apiService.supprimerOffreEmploi(offre.id).subscribe({
            next: () => {
                this.successMessage = 'Offre supprimee.';
                this.chargerOffres();
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = 'Erreur lors de la suppression.';
            }
        });
    }

    ouvrirInterview(offre: any): void {
        if (!offre?.id) {
            return;
        }

        this.router.navigate(['/recruiter-dashboard/interviews'], {
            queryParams: {
                createFromJob: '1',
                offreId: offre.id,
                poste: offre.titre || '',
                description: offre.description || '',
                localisation: offre.location || '',
                contrat: offre.typeContrat || ''
            }
        });
    }

    ouvrirDecision(offre: any): void {
        if (!offre?.id) {
            return;
        }

        this.decisionLoading = true;
        this.decisionError = '';
        this.decisionReport = null;

        this.apiService.getCandidaturesByOffre(offre.id).subscribe({
            next: (candidatures) => {
                const candidateRequests = (Array.isArray(candidatures) ? candidatures : []).map((candidature: any) => {
                    const candidateId = Number(candidature?.candidatId ?? candidature?.candidat?.id ?? 0);

                    if (!Number.isFinite(candidateId) || candidateId <= 0) {
                        return of({ key: this.getCandidateKey(candidature), interviews: [] as any[] });
                    }

                    return this.apiService.getEntretiensByCandidat(candidateId).pipe(
                        map((interviews) => Array.isArray(interviews) ? interviews : []),
                        switchMap((interviews) => this.enrichInterviewsWithScores(interviews)),
                        map((interviews) => ({
                            key: this.getCandidateKey(candidature),
                            interviews
                        })),
                        catchError((error) => {
                            console.error('Erreur chargement entretiens du candidat:', error);
                            return of({ key: this.getCandidateKey(candidature), interviews: [] as any[] });
                        })
                    );
                });

                if (!candidateRequests.length) {
                    this.finishDecisionReport(offre, [], [], new Map<string, any[]>());
                    return;
                }

                forkJoin(candidateRequests).subscribe({
                    next: (candidateInterviewSets) => {
                        const interviewMap = new Map<string, any[]>();
                        (candidateInterviewSets || []).forEach((entry: any) => {
                            interviewMap.set(String(entry?.key || ''), Array.isArray(entry?.interviews) ? entry.interviews : []);
                        });

                        const recruiterId = Number(localStorage.getItem('recruteurId'));
                        if (!Number.isFinite(recruiterId) || recruiterId <= 0) {
                            this.finishDecisionReport(offre, candidatures || [], [], interviewMap);
                            return;
                        }

                        this.apiService.getEntretiensByRecruteur(recruiterId).subscribe({
                            next: (entretiens) => {
                                this.enrichInterviewsWithScores(entretiens || []).subscribe({
                                    next: (scoredEntretiens: any[]) => {
                                        this.finishDecisionReport(offre, candidatures || [], scoredEntretiens || [], interviewMap);
                                    },
                                    error: () => {
                                        this.finishDecisionReport(offre, candidatures || [], entretiens || [], interviewMap);
                                    }
                                });
                            },
                            error: (error) => {
                                console.error('Erreur chargement entretiens pour le rapport de décision:', error);
                                this.finishDecisionReport(offre, candidatures || [], [], interviewMap);
                            }
                        });
                    },
                    error: (error) => {
                        console.error('Erreur chargement des entretiens candidats:', error);
                        this.finishDecisionReport(offre, candidatures || [], [], new Map<string, any[]>());
                    }
                });
            },
            error: (error) => {
                console.error('Erreur chargement candidatures pour le rapport de décision:', error);
                this.decisionError = 'Impossible de charger le rapport de décision.';
                this.decisionLoading = false;
            }
        });
    }

    fermerDecision(): void {
        this.decisionReport = null;
        this.decisionError = '';
        this.decisionLoading = false;
    }

    formatDate(value: any): string {
        if (!value) { return '-'; }
        return new Date(value).toLocaleDateString('fr-FR');
    }

    get requiredSkillsText(): string {
        const skills = this.normalizeSkills(this.getOfferSkillsSource(this.decisionReport?.offre));
        return skills.length ? skills.join(', ') : 'Aucune compétence requise indiquée';
    }

    formatExperienceYears(value: number): string {
        if (!Number.isFinite(value)) {
            return '0';
        }

        return `${Math.max(0, Math.floor(value))}`;
    }

    private finishDecisionReport(offre: any, candidatures: any[], entretiens: any[], candidateInterviewMap: Map<string, any[]> = new Map<string, any[]>()): void {
        this.decisionReport = this.buildDecisionReport(offre, candidatures, entretiens, candidateInterviewMap);
        this.decisionLoading = false;
    }

    private buildDecisionReport(offre: any, candidatures: any[], entretiens: any[], candidateInterviewMap: Map<string, any[]>): DecisionReport {
        const rows = (Array.isArray(candidatures) ? candidatures : []).map((candidature: any) => {
            const offreSkills = this.normalizeSkills(this.getOfferSkillsSource(offre));
            const candidatSkills = this.normalizeSkills(candidature?.competences || candidature?.candidat?.competences);
            const matchingSkills = offreSkills.filter((skill) => this.getBestSkillSimilarity(skill, candidatSkills) >= 0.6);
            const missingSkills = offreSkills.filter((skill) => this.getBestSkillSimilarity(skill, candidatSkills) < 0.6);
            const key = this.getCandidateKey(candidature);
            const candidateInterviews = candidateInterviewMap.get(key) || [];
            const bestInterviewScore = this.getBestInterviewScore(offre?.id, candidature, candidateInterviews, entretiens);
            const candidatureFallbackScore = bestInterviewScore === null
                ? this.extractCandidatureInterviewScore(candidature)
                : null;
            const interviewScore = bestInterviewScore ?? candidatureFallbackScore;
            const experienceYears = this.normalizeExperienceYears(this.extractExperienceYearsFromCandidature(candidature));
            const competenceRatio = this.computeCompetenceRatio(offreSkills, candidatSkills);
            const tauxCorrespondance = offreSkills.length > 0
                ? Math.round(competenceRatio * 100)
                : (candidatSkills.length > 0 ? 100 : 0);
            const scoreCompetence = Math.min(100, Math.max(0, tauxCorrespondance));
            const scoreExperience = this.normalizeExperienceScore(experienceYears);
            const scoreFinal = this.calculateFinalScore(interviewScore, scoreCompetence, scoreExperience);

            this.debugDecisionScore('DecisionReportRow', {
                candidat: this.getCandidatLabel(candidature),
                candidatureId: candidature?.id ?? null,
                candidateKey: key,
                candidateInterviewsCount: Array.isArray(candidateInterviews) ? candidateInterviews.length : 0,
                bestInterviewScore,
                candidatureFallbackScore,
                finalInterviewScore: interviewScore
            });

            return {
                candidatureId: candidature?.id ?? null,
                candidatNom: this.getCandidatLabel(candidature),
                candidatureStatut: String(candidature?.statut || 'EN_ATTENTE'),
                competencesOffre: offreSkills,
                competencesCandidat: candidatSkills,
                competencesCorrespondantes: matchingSkills,
                competencesManquantes: missingSkills,
                tauxCorrespondance,
                scoreEntretien: interviewScore,
                scoreCompetence,
                scoreExperience,
                scoreFinal,
                experienceAnnees: experienceYears,
                rang: 0,
                decision: '',
                recommandation: ''
            } as DecisionRow;
        });

        rows.sort((a, b) => {
            const scoreDiff = b.scoreFinal - a.scoreFinal;
            if (scoreDiff !== 0) { return scoreDiff; }

            const matchDiff = b.tauxCorrespondance - a.tauxCorrespondance;
            if (matchDiff !== 0) { return matchDiff; }

            const scoreA = a.scoreEntretien ?? -1;
            const scoreB = b.scoreEntretien ?? -1;
            if (scoreB !== scoreA) { return scoreB - scoreA; }

            const expDiff = b.experienceAnnees - a.experienceAnnees;
            if (expDiff !== 0) { return expDiff; }

            return a.candidatNom.localeCompare(b.candidatNom, 'fr', { sensitivity: 'base' });
        });

        rows.forEach((row, index) => {
            row.rang = index + 1;
            row.decision = this.buildDecisionLabel(row, index === 0);
            row.recommandation = this.buildRecommendation(row);
        });
    
        return {
            offre,
            candidats: rows,
            candidatRecommande: rows.length > 0 ? rows[0] : null,
            totalCandidatures: rows.length,
            totalEntretiens: entretiens.length
        };
    }

    private buildDecisionLabel(row: DecisionRow, isTopCandidate = false): string {
        if (row.scoreEntretien === null) {
            return 'Entretien à compléter';
        }

        if (row.scoreEntretien < 50) {
            return 'Risque entretien';
        }

        if (row.scoreCompetence < 40) {
            return 'Compétences à renforcer';
        }

        if (row.scoreFinal >= 80) {
            return 'Choix final recommandé';
        }

        if (isTopCandidate && row.scoreFinal >= 65) {
            return 'Meilleur profil actuel';
        }

        if (row.scoreFinal >= 65) {
            return 'Très bon profil';
        }

        if (row.scoreFinal >= 50) {
            return 'Profil à renforcer';
        }

        return 'À comparer';
    }

    private buildRecommendation(row: DecisionRow): string {
        if (row.scoreEntretien === null) {
            return 'Planifier ou finaliser l\'entretien pour une décision fiable.';
        }

        if (row.scoreEntretien < 50) {
            return 'Priorité: retravailler la préparation entretien (communication + résolution).';
        }

        if (row.scoreCompetence < 40) {
            return 'Priorité: montée en compétences sur les exigences clés du poste.';
        }

        if (row.scoreFinal >= 80) {
            return 'Recommandation: avancer vers l\'offre finale ou une dernière validation RH.';
        }

        if (row.scoreFinal >= 65) {
            return 'Recommandation: shortlist + entretien complémentaire ciblé.';
        }

        return 'Recommandation: conserver en backup et proposer un plan d\'amélioration.';
    }

    private getCandidatLabel(candidature: any): string {
        return String(
            candidature?.nomComplet ||
            candidature?.candidatNom ||
            candidature?.candidat?.nomComplet ||
            candidature?.candidat?.nom ||
            'Candidat'
        );
    }

    private getBestInterviewScore(offreId: number, candidature: any, candidateInterviews: any[], fallbackEntretiens: any[]): number | null {
        const candidateKeys = this.getCandidateKeys(candidature);
        const directInterviews = (Array.isArray(candidateInterviews) ? candidateInterviews : []);
        const matchedDirect = directInterviews
            .filter((entretien) => this.matchesInterview(entretien, offreId, candidateKeys));

        const directCandidateScores = matchedDirect
            .map((entretien) => this.extractInterviewScore(entretien))
            .filter((score): score is number => score !== null)
            .filter((score) => Number.isFinite(score));

        if (directCandidateScores.length) {
            const chosen = Math.max(...directCandidateScores);
            this.debugDecisionScore('InterviewScoreSource:direct', {
                candidat: this.getCandidatLabel(candidature),
                candidateKeys: Array.from(candidateKeys),
                chosen,
                directInterviews: matchedDirect.map((entretien) => this.summarizeInterviewForDebug(entretien))
            });
            return chosen;
        }

        this.debugDecisionScore('InterviewScoreSource:direct-unmatched', {
            candidat: this.getCandidatLabel(candidature),
            candidateKeys: Array.from(candidateKeys),
            directCount: directInterviews.length,
            directInterviews: directInterviews.map((entretien) => this.summarizeInterviewForDebug(entretien))
        });

        const matchedFallback = (Array.isArray(fallbackEntretiens) ? fallbackEntretiens : [])
            .filter((entretien) => this.matchesInterview(entretien, offreId, candidateKeys))
;

        const fallbackScores = matchedFallback
            .map((entretien) => this.extractInterviewScore(entretien))
            .filter((score): score is number => score !== null)
            .filter((score) => Number.isFinite(score));

        if (!fallbackScores.length) {
            this.debugDecisionScore('InterviewScoreSource:none', {
                candidat: this.getCandidatLabel(candidature),
                candidateKeys: Array.from(candidateKeys),
                matchedFallbackCount: matchedFallback.length
            });
            return null;
        }

        const chosen = Math.max(...fallbackScores);
        this.debugDecisionScore('InterviewScoreSource:fallback', {
            candidat: this.getCandidatLabel(candidature),
            candidateKeys: Array.from(candidateKeys),
            chosen,
            matchedFallback: matchedFallback.map((entretien) => this.summarizeInterviewForDebug(entretien))
        });
        return chosen;
    }

    private summarizeInterviewForDebug(entretien: any): any {
        return {
            id: entretien?.id ?? null,
            candidatId: entretien?.candidatId ?? entretien?.candidat?.id ?? entretien?.candidature?.candidatId ?? null,
            candidatureId: entretien?.candidatureId ?? entretien?.candidature?.id ?? null,
            offreId: entretien?.offreId ?? entretien?.offre?.id ?? entretien?.offreEmploi?.id ?? null,
            score: this.extractInterviewScore(entretien)
        };
    }

    private isDecisionDebugEnabled(): boolean {
        return localStorage.getItem('debugDecisionScore') === '1';
    }

    private debugDecisionScore(context: string, payload: any): void {
        if (!this.isDecisionDebugEnabled()) {
            return;
        }

        console.log(`[DecisionScoreDebug] ${context}`, payload);
    }

    private enrichInterviewsWithScores(interviews: any[]): any {
        const list = Array.isArray(interviews) ? interviews : [];
        if (!list.length) {
            return of([]);
        }

        const requests = list.map((entretien: any) => {
            const existing = this.extractInterviewScore(entretien);
            if (existing !== null) {
                return of({ ...entretien, score: existing });
            }

            const entretienId = Number(entretien?.id);
            if (!Number.isFinite(entretienId) || entretienId <= 0) {
                return of(entretien);
            }

            return this.apiService.getResultat(entretienId).pipe(
                map((resultat: any) => {
                    const resolved = this.extractInterviewScore({ ...entretien, resultat });
                    return resolved !== null ? { ...entretien, score: resolved, resultat } : entretien;
                }),
                catchError(() => of(entretien))
            );
        });

        return forkJoin(requests);
    }

    private extractInterviewScore(entretien: any): number | null {
        const raw = entretien?.score ??
            entretien?.resultat?.score ??
            entretien?.resultat?.scoreFinal ??
            entretien?.resultat?.note ??
            entretien?.resultat?.scoreGlobale ??
            entretien?.resultat?.scoreGlobal ??
            entretien?.resultat?.noteFinale ??
            entretien?.result?.score ??
            entretien?.result?.note ??
            entretien?.evaluation?.score ??
            entretien?.evaluation?.note ??
            entretien?.scoreFinal ??
            entretien?.note ??
            entretien?.resultScore ??
            entretien?.scoreEntretien ??
            entretien?.noteEntretien;

        const direct = this.parseScoreValue(raw);
        if (direct !== null) {
            return direct;
        }

        const totalQuestions = Number(entretien?.totalQuestions ?? entretien?.resultat?.totalQuestions ?? 0);
        const bonnesReponses = Number(entretien?.bonnesReponses ?? entretien?.resultat?.bonnesReponses ?? 0);
        if (Number.isFinite(totalQuestions) && totalQuestions > 0 && Number.isFinite(bonnesReponses) && bonnesReponses >= 0) {
            const computed = Math.round((bonnesReponses / totalQuestions) * 100);
            return Math.max(0, Math.min(100, computed));
        }

        const fromDecision = this.extractScoreFromDecision(entretien?.decision ?? entretien?.resultat?.decision);
        if (fromDecision !== null) {
            return fromDecision;
        }

        const componentScores = [
            this.parseScoreValue(entretien?.scoreTechnique),
            this.parseScoreValue(entretien?.scoreCommunication),
            this.parseScoreValue(entretien?.scoreProbleme),
            this.parseScoreValue(entretien?.scoreProblemSolving),
            this.parseScoreValue(entretien?.scoreCulture),
            this.parseScoreValue(entretien?.scoreGlobal)
        ].filter((value): value is number => value !== null);

        if (componentScores.length) {
            const avg = componentScores.reduce((sum, value) => sum + value, 0) / componentScores.length;
            return Math.max(0, Math.min(100, Math.round(avg)));
        }

        return null;
    }

    private extractScoreFromDecision(value: any): number | null {
        const text = String(value || '').trim();
        if (!text) {
            return null;
        }

        const scoreMatch = text.match(/score\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%?/i);
        if (scoreMatch?.[1]) {
            const parsed = Number.parseFloat(scoreMatch[1].replace(',', '.'));
            if (Number.isFinite(parsed)) {
                return Math.max(0, Math.min(100, Math.round(parsed)));
            }
        }

        return null;
    }

    private parseScoreValue(value: any): number | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const numericDirect = Number(value);
        if (Number.isFinite(numericDirect)) {
            return Math.max(0, Math.min(100, Math.round(numericDirect)));
        }

        const text = String(value).trim();
        if (!text) {
            return null;
        }

        // Accept formats like "78/100", "78 %", "note: 78".
        const slashMatch = text.match(/(\d+(?:[.,]\d+)?)\s*\/\s*100/i);
        if (slashMatch?.[1]) {
            const slashValue = Number.parseFloat(slashMatch[1].replace(',', '.'));
            if (Number.isFinite(slashValue)) {
                return Math.max(0, Math.min(100, Math.round(slashValue)));
            }
        }

        const firstNumberMatch = text.match(/(\d+(?:[.,]\d+)?)/);
        if (firstNumberMatch?.[1]) {
            const extracted = Number.parseFloat(firstNumberMatch[1].replace(',', '.'));
            if (Number.isFinite(extracted)) {
                return Math.max(0, Math.min(100, Math.round(extracted)));
            }
        }

        return null;
    }

    private matchesInterview(entretien: any, offreId: number, candidateKeys: Set<string>): boolean {
        const entretienOffreId = Number(
            entretien?.offreId ?? entretien?.offre?.id ?? entretien?.offreEmploi?.id ?? entretien?.jobOfferId ?? 0
        );

        // Some backends do not return offerId on interview payload; only enforce when interview actually carries one.
        if (Number.isFinite(offreId) && offreId > 0 && Number.isFinite(entretienOffreId) && entretienOffreId > 0 && entretienOffreId !== offreId) {
            return false;
        }

        const entretienCandidateKeys = this.getCandidateKeys(entretien);
        for (const key of candidateKeys) {
            if (entretienCandidateKeys.has(key)) {
                return true;
            }
        }

        return false;
    }

    private getCandidateKeys(source: any): Set<string> {
        const keys = new Set<string>();
        const inferredCandidatureId = this.isLikelyCandidature(source) ? Number(source?.id ?? 0) : 0;
        const candidatureId = Number(source?.candidatureId ?? source?.idCandidature ?? source?.candidature?.id ?? inferredCandidatureId ?? 0);
        if (Number.isFinite(candidatureId) && candidatureId > 0) {
            keys.add(`candidature:${candidatureId}`);
        }

        const id = Number(
            source?.candidatId ??
            source?.candidat?.id ??
            source?.candidat?.candidatId ??
            source?.candidature?.candidatId ??
            source?.candidature?.candidat?.id ??
            source?.candidature?.candidat?.candidatId ??
            0
        );
        if (Number.isFinite(id) && id > 0) {
            keys.add(`id:${id}`);
        }

        const email = this.normalizeText(
            source?.email ??
            source?.candidat?.email ??
            source?.candidature?.email ??
            source?.candidature?.candidat?.email ??
            ''
        );
        if (email) {
            keys.add(`email:${email}`);
        }

        const label = this.normalizeText(
            source?.candidat?.nomComplet ??
            source?.candidature?.candidat?.nomComplet ??
            source?.candidature?.candidatNom ??
            source?.candidatNom ??
            this.getCandidatLabel(source)
        );
        if (label) {
            keys.add(`name:${label}`);
        }

        return keys;
    }

    private isLikelyCandidature(source: any): boolean {
        if (!source || typeof source !== 'object') {
            return false;
        }

        return source?.statut !== undefined ||
            source?.dateCandidature !== undefined ||
            source?.offreEmploi !== undefined ||
            source?.lettreMotivation !== undefined ||
            source?.cv !== undefined;
    }

    private extractCandidatureInterviewScore(candidature: any): number | null {
        const raw = candidature?.scoreEntretien ??
            candidature?.entretien?.score ??
            candidature?.entretien?.scoreFinal ??
            candidature?.entretien?.note ??
            candidature?.resultatEntretien?.score ??
            candidature?.resultatEntretien?.scoreFinal ??
            candidature?.resultatEntretien?.note;

        return this.parseScoreValue(raw);
    }

    private normalizeSkills(value: any): string[] {
        if (!value) {
            return [];
        }

        const rawValues = Array.isArray(value)
            ? value
            : String(value).split(/[,;\n|\/]+/);

        return rawValues
            .map((item) => this.normalizeText(item))
            .filter((item) => !!item);
    }

    private computeCompetenceRatio(requiredSkills: string[], candidateSkills: string[]): number {
        if (!requiredSkills.length) {
            return candidateSkills.length > 0 ? 1 : 0;
        }

        let total = 0;
        for (const required of requiredSkills) {
            total += this.getBestSkillSimilarity(required, candidateSkills);
        }

        return Math.max(0, Math.min(1, total / requiredSkills.length));
    }

    private getBestSkillSimilarity(requiredSkill: string, candidateSkills: string[]): number {
        if (!candidateSkills.length) {
            return 0;
        }

        return candidateSkills.reduce((best, candidateSkill) => {
            const current = this.skillSimilarity(requiredSkill, candidateSkill);
            return current > best ? current : best;
        }, 0);
    }

    private skillSimilarity(requiredSkill: string, candidateSkill: string): number {
        const req = this.normalizeText(requiredSkill);
        const cand = this.normalizeText(candidateSkill);
        if (!req || !cand) {
            return 0;
        }

        if (req === cand) {
            return 1;
        }

        if (req.includes(cand) || cand.includes(req)) {
            return 0.75;
        }

        const reqTokens = req.split(/[\s\-_.+]+/).filter(Boolean);
        const candTokens = cand.split(/[\s\-_.+]+/).filter(Boolean);
        if (!reqTokens.length || !candTokens.length) {
            return 0;
        }

        const reqSet = new Set(reqTokens);
        const candSet = new Set(candTokens);
        let intersection = 0;
        reqSet.forEach((token) => {
            if (candSet.has(token)) {
                intersection += 1;
            }
        });

        const union = new Set([...reqSet, ...candSet]).size;
        const jaccard = union > 0 ? intersection / union : 0;
        return jaccard >= 0.5 ? 0.6 : (jaccard >= 0.3 ? 0.4 : 0);
    }

    private skillMatches(requiredSkill: string, candidateSkills: string[]): boolean {
        const normalizedRequired = this.normalizeText(requiredSkill);
        return candidateSkills.some((skill) => {
            return skill === normalizedRequired || skill.includes(normalizedRequired) || normalizedRequired.includes(skill);
        });
    }

    private extractExperienceYearsFromCandidature(candidature: any): number {
        const experienceSources = [
            candidature?.experience,
            candidature?.experiences,
            candidature?.candidat?.experience,
            candidature?.candidat?.experiences
        ];

        let totalYears = 0;

        for (const source of experienceSources) {
            totalYears += this.extractExperienceYears(source);
        }

        return Math.max(0, Number(totalYears.toFixed(1)));
    }

    private normalizeExperienceYears(value: number): number {
        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.max(0, Math.floor(value));
    }

    private extractExperienceYears(value: any): number {
        if (!value) {
            return 0;
        }

        if (Array.isArray(value)) {
            return value.reduce((total, entry) => total + this.extractExperienceYearsFromEntry(entry), 0);
        }

        if (typeof value === 'object') {
            return this.extractExperienceYearsFromEntry(value);
        }

        const segments = String(value)
            .split(/\n\s*\n|\r\n\s*\r\n/)
            .map((segment) => segment.trim())
            .filter((segment) => !!segment);

        const totalYears = segments.reduce((total, segment) => total + this.extractExperienceYearsFromSegment(segment), 0);
        return Math.max(0, Number(totalYears.toFixed(1)));
    }

    private extractExperienceYearsFromEntry(entry: any): number {
        if (!entry) {
            return 0;
        }

        const explicitYears = this.parseNumericExperienceValue(entry?.years ?? entry?.year ?? entry?.experienceYears ?? entry?.annees);
        if (explicitYears !== null) {
            return explicitYears;
        }

        const explicitMonths = this.parseNumericExperienceValue(entry?.months ?? entry?.month ?? entry?.experienceMonths ?? entry?.mois);
        if (explicitMonths !== null) {
            return explicitMonths / 12;
        }

        const periodText = String(
            entry?.periode ||
            entry?.period ||
            entry?.date ||
            entry?.duration ||
            entry?.description ||
            ''
        ).trim();

        if (periodText) {
            const parsed = this.extractExperienceYearsFromSegment(periodText);
            if (parsed > 0) {
                return parsed;
            }
        }

        const start = this.toDate(entry?.startDate || entry?.dateDebut || entry?.debut);
        const end = this.toDate(entry?.endDate || entry?.dateFin || entry?.fin || new Date());
        if (start && end && end.getTime() >= start.getTime()) {
            const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            return Math.max(0, diffMonths / 12);
        }

        return this.extractExperienceYearsFromSegment(String(entry?.poste || entry?.entreprise || entry?.description || ''));
    }

    private parseNumericExperienceValue(value: any): number | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsed = Number.parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
    }

    private extractExperienceYearsFromSegment(segment: string): number {
        const periodText = this.extractPeriodText(segment);
        if (!periodText) {
            return 0;
        }

        const normalized = periodText.toLowerCase().replace(/\s+/g, ' ').trim();

        const monthsMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:mois|months?)/i);
        if (monthsMatch?.[1]) {
            return Number.parseFloat(monthsMatch[1].replace(',', '.')) / 12;
        }

        const yearsMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:ans?|an|years?|yrs?)/i);
        if (yearsMatch?.[1]) {
            return Number.parseFloat(yearsMatch[1].replace(',', '.'));
        }

        const rangeMatch = normalized.match(/(?:de\s*)?(\d{4})(?:\/(\d{1,2}))?\s*(?:-|to|à|a|\/|jusqu['’]a)\s*(\d{4})(?:\/(\d{1,2}))?/i);
        if (rangeMatch?.[1] && rangeMatch?.[3]) {
            const startYear = Number(rangeMatch[1]);
            const endYear = Number(rangeMatch[3]);
            const startMonth = Number(rangeMatch[2] || 1) - 1;
            const endMonth = Number(rangeMatch[4] || 12) - 1;
            const startDate = new Date(startYear, startMonth, 1);
            const endDate = new Date(endYear, endMonth, 1);
            const diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
            return Math.max(0, diffMonths / 12);
        }

        return 0;
    }

    private extractPeriodText(segment: string): string {
        const parenthesisMatch = segment.match(/\(([^)]+)\)/);
        if (parenthesisMatch?.[1]) {
            return parenthesisMatch[1].trim();
        }

        return segment;
    }

    private toDate(value: any): Date | null {
        if (!value) {
            return null;
        }

        const parsed = new Date(value);
        return Number.isFinite(parsed.getTime()) ? parsed : null;
    }

    private getOfferSkillsSource(offre: any): any {
        return offre?.competencesRequises || offre?.competences || offre?.skills || '';
    }

    private getCandidateKey(source: any): string {
        const id = Number(source?.candidatId ?? source?.candidat?.id ?? 0);
        if (Number.isFinite(id) && id > 0) {
            return `id:${id}`;
        }

        const email = this.normalizeText(source?.email ?? source?.candidat?.email ?? '');
        if (email) {
            return `email:${email}`;
        }

        return `name:${this.normalizeText(this.getCandidatLabel(source))}`;
    }

    private normalizeExperienceScore(experienceYears: number): number {
        const normalizedYears = Number.isFinite(experienceYears) ? Math.max(0, experienceYears) : 0;
        return Math.min(100, Math.round((normalizedYears / 10) * 100));
    }

    private calculateFinalScore(scoreEntretien: number | null, scoreCompetence: number, scoreExperience: number): number {
        const interview = Number.isFinite(scoreEntretien ?? NaN) ? Number(scoreEntretien) : 0;
        return Math.round((interview * 0.5) + (scoreCompetence * 0.3) + (scoreExperience * 0.2));
    }

    private normalizeText(value: any): string {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    private toDateInputValue(value: any): string {
        const d = new Date(value);
        if (isNaN(d.getTime())) { return ''; }
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${d.getFullYear()}-${month}-${day}`;
    }
}
