export interface Competence {
  id: number;
  nom: string;
  niveau: string;
  type: string;
}

export interface Formation {
  id: number;
  titre: string;
  categorie: string;
  plateforme: string;
  statut: 'Disponible' | 'Archivée' | 'Bientôt' | string;
  duree: string;
  niveau: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert' | string;
  competences?: Competence[];

  lienExterne?:   string;   
  playlistId?:    string;   
  youtubeId?:     string;   
  hasEditor?:     boolean;  
  stackBlitzUrl?: string;   
  writtenUrl?:    string;   
  description?:   string;   
  imageUrl?:      string;   

  badge?:         string;
  totalInscrits?: number;
  noteMoyenne?:   number;
  tauxCompletion?:number;
  scorePopularite?:number;
}

export interface FormationStats {
  formationId:    number;
  titre:          string;
  categorie:      string;
  niveau:         string;
  statut:         string;
  badge:          string | null;
  totalInscrits:  number;
  noteMoyenne:    number;
  totalCertifies: number;
  totalTermines:  number;
  tauxCompletion: number;
  scorePopularite:number;
}

export interface FormationSuggestion {
  playlistId:     string;   
  titre:          string;
  thumbnail:      string;
  chaineYoutube:  string;
  writtenUrl:     string;
  categorie:      string;
  niveau:         string;
  nbVideos:       number;  
  dureeTotale?:   string;   
}

export interface YoutubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  position: number;
}
export interface DocSuggestion {
  id:         string;
  titre:      string;
  source:     string;     
  sourceType: string;     
  url:        string;
}