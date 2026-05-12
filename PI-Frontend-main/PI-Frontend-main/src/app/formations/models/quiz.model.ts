import { NiveauOrdre } from './parcours.model';

export interface QuizQuestion {
  id: number;
  enonce: string;
  choix: string[];
}

export interface QuizNiveau {
  id: number;
  niveau: NiveauOrdre;
  niveauLabel: string;
  tentative: number;
  questions: QuizQuestion[];
  seuilRequis: number;
}

export interface CorrectionQuestion {
  questionId: number;
  enonce: string;
  reponseCandidat: string;
  bonneReponse: string;
  correct: boolean;
  explication: string;
}

export interface QuizResultat {
  score: number;
  seuilRequis: number;
  reussi: boolean;
  needsFeedback: 'NONE' | 'MICRO' | 'MACRO';
  nextNiveauLabel: string | null;
  niveauSuivantDebloque: NiveauOrdre | null;
  niveau: NiveauOrdre;
  message: string;
  inscriptionId: number;
  corrections: CorrectionQuestion[];
}

export interface QuizGenerationRequest {
  inscriptionParcoursId: number;
  niveau: NiveauOrdre;
  titreFormation: string;
  nombreQuestions: number;
}

export interface QuizSoumissionDTO {
  quizNiveauId: number;
  reponses: { [key: number]: string };
}

export interface QuizHistorique {
  id: number;
  niveau: NiveauOrdre;
  tentative: number;
  score: number;
  reussi: boolean;
  dateTentative: string;
}
