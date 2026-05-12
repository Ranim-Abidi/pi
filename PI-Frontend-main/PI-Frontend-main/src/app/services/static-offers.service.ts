// src/app/common/services/static-offers.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface StaticOffer {
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
    source: 'static';
    statut: string;
    image: string;
}

@Injectable({
    providedIn: 'root'
})
export class StaticOffersService {
    
    private staticOffers: StaticOffer[] = [
        // ========== INFORMATIQUE ==========
        {
            id: 'STATIC_DEV_001',
            titre: 'Développeur Full Stack',
            description: 'Développement d\'applications web full stack avec Java Spring Boot et Angular.',
            entreprise: 'TechSolutions Tunisie',
            location: 'Tunis',
            salary: '2500-3500',
            typeContrat: 'CDI',
            datePublication: new Date().toISOString(),
            dateLimite: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            competencesRequises: ['Python', 'Java', 'Spring Boot', 'React', 'SQL', 'Docker'],
            domaine: 'informatique',
            source: 'static',
            statut: 'ACTIVE',
            image: 'default-company.png'
        },
        {
            id: 'STATIC_DEV_002',
            titre: 'Data Scientist',
            description: 'Analyse de données et création de modèles prédictifs.',
            entreprise: 'DataCorp Tunisia',
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
            description: 'Gestion de l\'infrastructure cloud et déploiement continu.',
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
        // ========== SANTÉ ==========
        {
            id: 'STATIC_HEALTH_001',
            titre: 'Infirmier Diplômé d\'État',
            description: 'Soins infirmiers aux patients hospitalisés. Gestion des urgences.',
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
        // ========== MARKETING ==========
        {
            id: 'STATIC_MARKETING_001',
            titre: 'Digital Marketing Manager',
            description: 'Gestion des campagnes digitales et réseaux sociaux.',
            entreprise: 'Digital Agency Tunis',
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
        }
    ];

    constructor() {}

    getAllStaticOffers(): Observable<StaticOffer[]> {
        return of(this.staticOffers);
    }
}