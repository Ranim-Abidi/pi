import { Formation } from './formation.model';
import { Candidat } from './candidat.model';

export interface Feedback {
  id: number;
  note: number;
  commentaire: string;
  dateCreation: string;
  dateModification: string;
  formation?: Formation;
  parcours?: any;
  candidat?: Candidat;
}

export interface FeedbackCreatePayload {
  note: number;
  commentaire: string;
  formation?: { id: number };
  parcours?: { id: number };
  candidat: { id: number };
}

export interface FeedbackUpdatePayload {
  note: number;
  commentaire: string;
}

export interface FeedbackStats {
  moyenne: number;
  total: number;
}