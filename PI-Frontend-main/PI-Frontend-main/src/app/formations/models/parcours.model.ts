import { Formation } from './formation.model';

export type NiveauOrdre = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'EXPERT';

export interface ParcoursFormation {
  id: number;
  titre: string;
  categorie: string;
  statut?: string;
  imageUrl?: string;
  description?: string;
  niveauDebutant?:      Formation;
  niveauIntermediaire?: Formation;
  niveauAvance?:        Formation;
  niveauExpert?:        Formation;
  totalInscrits?:       number;
  scorePopularite?:     number;
}

export interface InscriptionParcours {
  id: number;
  parcours: ParcoursFormation;
  candidat?: any;
  niveauActuel: NiveauOrdre;
  statut: 'EN_COURS' | 'TERMINE';
  dateInscription: string;
  evaluationParcoursRequise?: boolean;
}

export const NIVEAUX_LABELS: Record<NiveauOrdre, string> = {
  DEBUTANT:       'Débutant',
  INTERMEDIAIRE:  'Intermédiaire',
  AVANCE:         'Avancé',
  EXPERT:         'Expert'
};

export const NIVEAUX_SEUILS: Record<NiveauOrdre, number> = {
  DEBUTANT:       50,
  INTERMEDIAIRE:  60,
  AVANCE:         70,
  EXPERT:         70
};

export const NIVEAUX_ORDERED: NiveauOrdre[] = [
  'DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT'
];
