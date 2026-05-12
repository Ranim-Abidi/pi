import { Formation } from './formation.model';
import { Certificat } from './certificat.model';
import { Candidat } from './candidat.model';

export interface Inscription {
  id: number;
  dateInscription: string;
  statut: 'EnCours' | 'Terminé' | 'Abandonné';
  progression: number;
  formation: Formation;
  candidat?: Candidat;
  certificat?: Certificat;
  parcoursId?: number | null;
  niveau?: string | null;
  niveauContext?: string | null;
}

export interface InscriptionCreatePayload {
  candidat: { id: number };
  formation: { id: number };
}