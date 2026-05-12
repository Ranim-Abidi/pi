import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
//import { JobMatchingService, MLOffer, MLResponse } from '../services/job-matching.service';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Offer {
  id: string;
  titre: string;
  description: string;
  entreprise: string;
  location: string;
  salary: string;
  typeContrat: string;
  datePublication: string;
  dateLimite: string;
  competencesRequises: string[];
  domaine: string;
  source: 'static' | 'ml';
  statut?: string;
  image?: string;
  scoreMatch?: number;
  raison?: string;
}

export interface MLOffer {
  job_id: string;
  job_title: string;
  job_domain: string;
  job_location: string;
  job_skills: string;
  score_match: number;
  raison: string;
}

export interface MLResponse {
  domaine_detecte: string;
  confiance_domaine: number;
  offres: MLOffer[];
  competences_reconnues: string[];
  conseil: string;
}

@Injectable({
  providedIn: 'root'
})
export class MergedOffersService {
  
  // Toutes les offres statiques
  private staticOffers: Offer[] = [
    // ========== INFORMATIQUE ==========
    {
      id: 'STATIC_DEV_001',
      titre: 'Développeur Full Stack',
      description: 'Développement d\'applications web avec Java Spring Boot et Angular.',
      entreprise: 'TechSolutions Tunisie',
      location: 'Tunis',
      salary: '2500-3500',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      competencesRequises: ['Java', 'Spring Boot', 'Angular', 'React', 'SQL', 'Docker'],
      domaine: 'informatique',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_DEV_002',
      titre: 'Data Scientist',
      description: 'Analyse de données et création de modèles prédictifs.',
      entreprise: 'DataCorp',
      location: 'Sfax',
      salary: '3000-4000',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 25*24*60*60*1000).toISOString(),
      competencesRequises: ['Python', 'Pandas', 'TensorFlow', 'SQL', 'Machine Learning'],
      domaine: 'informatique',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_DEV_003',
      titre: 'DevOps Engineer',
      description: 'Gestion infrastructure cloud et CI/CD.',
      entreprise: 'CloudTech',
      location: 'Tunis',
      salary: '3500-4500',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 20*24*60*60*1000).toISOString(),
      competencesRequises: ['Docker', 'Kubernetes', 'Jenkins', 'AWS', 'Terraform'],
      domaine: 'informatique',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_DEV_004',
      titre: 'Ingénieur Full Stack - Spring/Angular',
      description: 'Développement avec Spring Boot et Angular.',
      entreprise: 'Digital Solutions',
      location: 'Tunis',
      salary: '2800-3800',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 28*24*60*60*1000).toISOString(),
      competencesRequises: ['Spring Boot', 'Angular', 'Java', 'TypeScript'],
      domaine: 'informatique',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_DEV_005',
      titre: 'Développeur Mobile Flutter',
      description: 'Applications mobiles cross-platform avec Flutter.',
      entreprise: 'MobileApp Studio',
      location: 'Sousse',
      salary: '2500-3500',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 22*24*60*60*1000).toISOString(),
      competencesRequises: ['Flutter', 'Dart', 'Firebase', 'REST API'],
      domaine: 'informatique',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_DEV_006',
      titre: 'Backend Developer',
      description: 'Développement d\'APIs RESTful avec Java Spring Boot.',
      entreprise: 'Backend Masters',
      location: 'Tunis',
      salary: '2800-3800',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 18*24*60*60*1000).toISOString(),
      competencesRequises: ['Java', 'Spring Boot', 'Microservices', 'REST API', 'PostgreSQL'],
      domaine: 'informatique',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_DEV_007',
      titre: 'Frontend Developer',
      description: 'Développement d\'interfaces utilisateur avec Angular et React.',
      entreprise: 'WebSolutions',
      location: 'Sousse',
      salary: '2200-3000',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 15*24*60*60*1000).toISOString(),
      competencesRequises: ['Angular', 'React', 'TypeScript', 'HTML5', 'CSS3'],
      domaine: 'informatique',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },

    // ========== SANTÉ ==========
    {
      id: 'STATIC_HEALTH_001',
      titre: 'Infirmier Diplômé d\'État',
      description: 'Soins aux patients et gestion des urgences.',
      entreprise: 'Clinique Les Oliviers',
      location: 'Monastir',
      salary: '1800-2200',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 28*24*60*60*1000).toISOString(),
      competencesRequises: ['Soins infirmiers', 'Urgences', 'Patient', 'Diplôme d\'état'],
      domaine: 'sante',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_HEALTH_002',
      titre: 'Médecin Généraliste',
      description: 'Consultations médicales et suivi des patients.',
      entreprise: 'Polyclinique du Sud',
      location: 'Sfax',
      salary: '4000-5000',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 35*24*60*60*1000).toISOString(),
      competencesRequises: ['Consultation', 'Diagnostic', 'Prescription', 'Patient'],
      domaine: 'sante',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_HEALTH_003',
      titre: 'Kinésithérapeute',
      description: 'Séances de rééducation et thérapie manuelle.',
      entreprise: 'Centre de Rééducation',
      location: 'Tunis',
      salary: '2000-2800',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 22*24*60*60*1000).toISOString(),
      competencesRequises: ['Kinésithérapie', 'Rééducation', 'Massage', 'Patient'],
      domaine: 'sante',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },

    // ========== FINANCE ==========
    {
      id: 'STATIC_FINANCE_001',
      titre: 'Comptable',
      description: 'Gestion comptable et fiscale de l\'entreprise.',
      entreprise: 'Fiduciaire Plus',
      location: 'Tunis',
      salary: '2000-2800',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 22*24*60*60*1000).toISOString(),
      competencesRequises: ['Comptabilité', 'Audit', 'Bilan', 'Fiscalité', 'Excel'],
      domaine: 'finance',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_FINANCE_002',
      titre: 'Auditeur Financier',
      description: 'Audit des comptes et conseil financier.',
      entreprise: 'AuditPlus',
      location: 'Tunis',
      salary: '3500-4500',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 25*24*60*60*1000).toISOString(),
      competencesRequises: ['Audit', 'Finance', 'Reporting', 'Consolidation', 'IFRS'],
      domaine: 'finance',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_FINANCE_003',
      titre: 'Contrôleur de Gestion',
      description: 'Pilotage budgétaire et analyse des performances.',
      entreprise: 'Groupe Industriel',
      location: 'Sfax',
      salary: '3000-4000',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 20*24*60*60*1000).toISOString(),
      competencesRequises: ['Contrôle de gestion', 'Budget', 'KPI', 'Reporting', 'Excel'],
      domaine: 'finance',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },

    // ========== MARKETING ==========
    {
      id: 'STATIC_MARKETING_001',
      titre: 'Digital Marketing Manager',
      description: 'Gestion des campagnes digitales et réseaux sociaux.',
      entreprise: 'Digital Agency',
      location: 'Tunis',
      salary: '2500-3500',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 18*24*60*60*1000).toISOString(),
      competencesRequises: ['SEO', 'SEA', 'Social Media', 'Google Ads', 'Analytics'],
      domaine: 'marketing',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_MARKETING_002',
      titre: 'Community Manager',
      description: 'Animation des communautés et création de contenu.',
      entreprise: 'SocialBoost',
      location: 'Sfax',
      salary: '1800-2500',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 20*24*60*60*1000).toISOString(),
      competencesRequises: ['Community Management', 'Réseaux sociaux', 'Création de contenu', 'Canva'],
      domaine: 'marketing',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },

    // ========== ENSEIGNEMENT ==========
    {
      id: 'STATIC_TEACHING_001',
      titre: 'Professeur de Langues',
      description: 'Enseignement des langues (Français, Anglais, Arabe)',
      entreprise: 'Institut International des Langues',
      location: 'Tunis',
      salary: '1800-2500',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 40*24*60*60*1000).toISOString(),
      competencesRequises: ['Français', 'Anglais', 'Arabe', 'Pédagogie', 'Enseignement'],
      domaine: 'enseignement',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    },
    {
      id: 'STATIC_TEACHING_002',
      titre: 'Maîtresse de Langues',
      description: 'Cours de langues pour adultes et professionnels.',
      entreprise: 'Centre de Formation',
      location: 'Tunis',
      salary: '2000-2800',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 35*24*60*60*1000).toISOString(),
      competencesRequises: ['Français', 'Anglais', 'Arabe', 'Pédagogie', 'Formation'],
      domaine: 'enseignement',
      source: 'static',
      statut: 'ACTIVE',
      image: 'default-company.png'
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * ★★★ MÉTHODE PRINCIPALE ★★★
   * Essaie d'abord le ML, sinon fallback local
   */
  getMLRecommendations(skills: string): Observable<Offer[]> {
    console.log('🚀 Appel au ML avec compétences:', skills);
    
    if (!skills || skills.trim().length === 0) {
      console.log('⚠️ Pas de compétences, retour offres statiques');
      return of(this.staticOffers);
    }
    
    // Appel direct à FastAPI
    return this.http.post<MLResponse>(`${environment.mlUrl}/matching/offres`, {
      candidate_skills: skills,
      candidate_experience: 3,
      top_n: 20
    }).pipe(
      map((response: MLResponse) => {
        console.log('✅ Réponse ML reçue:', response);
        console.log('📊 Domaine détecté:', response.domaine_detecte);
        return this.transformMLResponse(response);
      }),
      catchError((error) => {
        console.error('❌ Erreur ML, fallback local:', error);
        return this.getFilteredOffersByDescription(skills);
      })
    );
  }

  /**
   * Transforme la réponse du ML en format Offer
   */
  private transformMLResponse(response: MLResponse): Offer[] {
    return response.offres.map(mlOffer => ({
      id: mlOffer.job_id,
      titre: mlOffer.job_title,
      description: mlOffer.raison || `Recommandé avec ${mlOffer.score_match}% de compatibilité`,
      entreprise: this.extractCompanyFromTitle(mlOffer.job_title),
      location: mlOffer.job_location || 'Tunis',
      salary: 'À négocier',
      typeContrat: 'CDI',
      datePublication: new Date().toISOString(),
      dateLimite: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      competencesRequises: mlOffer.job_skills ? mlOffer.job_skills.split(',').map(s => s.trim()) : [],
      domaine: mlOffer.job_domain || response.domaine_detecte,
      source: 'ml',
      statut: 'ACTIVE',
      image: 'default-company.png',
      scoreMatch: mlOffer.score_match,
      raison: mlOffer.raison
    }));
  }

  private extractCompanyFromTitle(title: string): string {
    if (title.includes('chez')) {
      const match = title.match(/chez\s+([^\s]+)/);
      if (match) return match[1];
    }
    return 'Entreprise partenaire';
  }

  /**
   * Fallback: filtrage local par description (sans ML)
   */
  getFilteredOffersByDescription(description: string): Observable<Offer[]> {
    console.log('🔍 Fallback - Filtrage local par description:', description);
    
    if (!description || description.trim().length === 0) {
      return of([]);
    }
    
    const descriptionLower = description.toLowerCase();
    
    // Déterminer le domaine depuis la description
    let detectedDomain = this.detectDomainFromText(descriptionLower);
    console.log('🏷️ Domaine détecté:', detectedDomain);
    
    // Extraire les mots-clés
    const keywords = this.extractKeywords(descriptionLower);
    console.log('📝 Mots-clés extraits:', keywords);
    
    // Calculer le score pour chaque offre
    const scoredOffers = this.staticOffers.map(offer => {
      const score = this.calculateMatchScore(offer, descriptionLower, keywords, detectedDomain);
      return { ...offer, scoreMatch: score };
    });
    
    // Filtrer par domaine d'abord
    let filtered = scoredOffers;
    if (detectedDomain !== 'general') {
      filtered = scoredOffers.filter(offer => offer.domaine === detectedDomain);
      console.log(`📌 Filtrage par domaine ${detectedDomain}: ${filtered.length} offres`);
    }
    
    // Filtrer les scores > 0
    filtered = filtered.filter(offer => (offer.scoreMatch || 0) > 0);
    
    // Trier par score
    filtered.sort((a, b) => (b.scoreMatch || 0) - (a.scoreMatch || 0));
    
    console.log(`🎯 ${filtered.length} offres trouvées après filtrage`);
    filtered.forEach(o => {
      console.log(`  - ${o.titre} (${o.domaine}): ${o.scoreMatch}%`);
    });
    
    return of(filtered);
  }

  /**
   * Détecte le domaine à partir du texte
   */
  private detectDomainFromText(text: string): string {
    const domainKeywords: { [key: string]: string[] } = {
      'informatique': ['python', 'java', 'javascript', 'react', 'angular', 'spring', 'flutter', 'laravel', 'docker', 'kubernetes', 'sql', 'fullstack', 'backend', 'frontend', 'devops', 'data', 'machine learning', 'tensorflow', 'pytorch', 'c++', 'c#', 'php', 'html', 'css'],
      'sante': ['infirmier', 'infirmière', 'médecin', 'chirurgien', 'soins', 'patient', 'clinique', 'hôpital', 'urgence', 'diagnostic', 'traitement', 'médical', 'santé', 'pharmacien', 'kiné', 'sage-femme'],
      'finance': ['comptable', 'finance', 'audit', 'budget', 'bilan', 'compta', 'trésorerie', 'excel', 'sage', 'erp', 'reporting', 'kpi', 'contrôle', 'fiscalité', 'banque', 'assurance', 'investissement'],
      'marketing': ['marketing', 'digital', 'seo', 'sea', 'social media', 'community', 'branding', 'communication', 'content', 'publicité', 'campagne', 'réseaux sociaux'],
      'enseignement': ['enseignant', 'professeur', 'maître', 'pédagogie', 'cours', 'élève', 'étudiant', 'classe', 'école', 'collège', 'lycée', 'université', 'formation', 'didactique', 'langues', 'français', 'anglais', 'arabe']
    };
    
    let scores: { [key: string]: number } = {};
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) {
          score += 2;
        }
      }
      if (score > 0) {
        scores[domain] = score;
      }
    }
    
    if (Object.keys(scores).length === 0) {
      return 'general';
    }
    
    return Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /**
   * Extrait les mots-clés importants de la description
   */
  private extractKeywords(text: string): string[] {
    const allKeywords = [
      // Informatique
      'spring', 'angular', 'flutter', 'laravel', 'java', 'python', 'javascript',
      'react', 'vue', 'node', 'docker', 'kubernetes', 'sql', 'mongodb',
      'fullstack', 'full stack', 'backend', 'frontend', 'devops', 'data',
      'machine learning', 'tensorflow', 'pytorch', 'c++', 'c#', 'php', 'html', 'css',
      // Santé
      'infirmier', 'infirmière', 'médecin', 'chirurgien', 'soins', 'patient',
      'clinique', 'hôpital', 'urgence', 'diagnostic', 'traitement', 'médical',
      'pharmacien', 'kiné', 'sage-femme',
      // Finance
      'comptable', 'finance', 'audit', 'budget', 'bilan', 'compta', 'trésorerie',
      'excel', 'sage', 'erp', 'reporting', 'kpi', 'contrôle', 'fiscalité',
      // Marketing
      'marketing', 'digital', 'seo', 'sea', 'social media', 'community',
      'branding', 'communication', 'content',
      // Enseignement
      'enseignant', 'professeur', 'pédagogie', 'cours', 'élève', 'étudiant',
      'classe', 'école', 'formation', 'didactique', 'langues', 'français',
      'anglais', 'arabe'
    ];
    
    const foundKeywords: string[] = [];
    
    for (const keyword of allKeywords) {
      if (text.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    
    return foundKeywords;
  }

  /**
   * Calcule le score de match entre la description et une offre
   */
  private calculateMatchScore(offer: Offer, description: string, keywords: string[], detectedDomain: string): number {
    let score = 0;
    
    // Vérifier les mots-clés dans l'offre
    const offerText = (offer.titre + ' ' + offer.description + ' ' + offer.competencesRequises.join(' ')).toLowerCase();
    
    for (const keyword of keywords) {
      if (offerText.includes(keyword)) {
        score += 20;
      }
    }
    
    // Bonus si le domaine correspond
    if (offer.domaine === detectedDomain && detectedDomain !== 'general') {
      score += 30;
    }
    
    // Pénalité si domaine différent
    if (offer.domaine !== detectedDomain && detectedDomain !== 'general') {
      score -= 50;
    }
    
    return Math.max(0, Math.min(score, 100));
  }

  getStaticOffers(): Observable<Offer[]> {
    return of(this.staticOffers);
  }
}