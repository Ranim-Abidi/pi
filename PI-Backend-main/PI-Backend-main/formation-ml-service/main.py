import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
import json


try:
    from sentence_transformers import SentenceTransformer, util
    SBERT_AVAILABLE = True
except ImportError:
    SBERT_AVAILABLE = False
    print("⚠️  sentence-transformers non installé. Fallback sur TF-IDF amélioré.")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sk_cosine
    import pandas as pd
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

app = FastAPI(
    title="Formation ML Recommendation Service v2",
    description="Recommandation intelligente avec embeddings sémantiques",
    version="2.0.0"
)

ML_INTERNAL_API_KEY = os.getenv("ML_INTERNAL_API_KEY", "").strip()
ML_CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ML_CORS_ORIGINS",
        "http://localhost:4200,http://127.0.0.1:4200,http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ML_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _internal_api_key_guard(request: Request, call_next):
    path = request.url.path
    if path in ("/health", "/docs", "/openapi.json", "/redoc") or path.startswith("/static"):
        return await call_next(request)
    if request.method == "OPTIONS":
        return await call_next(request)
    if ML_INTERNAL_API_KEY and request.headers.get("x-internal-api-key") != ML_INTERNAL_API_KEY:
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


CAREER_PATHS: Dict[str, Dict[str, int]] = {
    "Full Stack Developer": {
        "HTML": 2, "CSS": 2, "JavaScript": 3, "TypeScript": 2,
        "React": 3, "Node.js": 3, "SQL": 2, "REST API": 2,
        "Git": 2, "Angular": 1, "Spring Boot": 1, "Docker": 1
    },
    "Backend Developer": {
        "Java": 2, "Spring Boot": 3, "Node.js": 2, "Python": 2,
        "SQL": 3, "NoSQL": 2, "REST API": 3, "Microservices": 2,
        "Docker": 2, "Kubernetes": 1, "Git": 2, "Testing": 1
    },
    "Frontend Developer": {
        "HTML": 3, "CSS": 3, "JavaScript": 3, "TypeScript": 2,
        "Angular": 2, "React": 2, "Vue.js": 2, "SASS": 1,
        "Tailwind": 1, "Figma": 1, "Webpack": 1, "Git": 2
    },
    "Data Scientist": {
        "Python": 3, "SQL": 2, "Machine Learning": 3, "Statistics": 3,
        "Pandas": 2, "Scikit-Learn": 2, "Deep Learning": 2,
        "Data Visualization": 2, "NumPy": 2, "Jupyter": 1, "R": 1
    },
    "Data Engineer": {
        "Python": 3, "SQL": 3, "Big Data": 3, "Spark": 2,
        "Hadoop": 2, "ETL": 3, "Kafka": 2, "NoSQL": 2,
        "Cloud Storage": 2, "Airflow": 2, "dbt": 1
    },
    "DevOps Engineer": {
        "Docker": 3, "Kubernetes": 3, "Ansible": 2, "Terraform": 2,
        "AWS": 2, "Linux": 3, "CI/CD": 3, "Jenkins": 2,
        "Prometheus": 1, "Git": 2, "Bash": 2, "Networking": 1
    },
    "Cloud Architect": {
        "AWS": 3, "Azure": 2, "GCP": 2, "Cloud Security": 3,
        "Infrastructure as Code": 3, "Networking": 2, "Serverless": 2,
        "Kubernetes": 2, "Terraform": 2, "Cost Optimization": 1
    },
    "Mobile Developer": {
        "Flutter": 2, "Dart": 2, "React Native": 2, "Android": 2,
        "iOS": 2, "Firebase": 2, "Swift": 2, "Kotlin": 2,
        "REST API": 2, "Git": 2, "UI Design": 1
    },
    "Cybersecurity Analyst": {
        "Network Security": 3, "Cryptography": 2, "Ethical Hacking": 3,
        "Linux": 2, "OWASP": 2, "SIEM": 2, "Incident Response": 3,
        "Penetration Testing": 2, "Firewall": 1, "Python": 1
    },
    "AI Engineer": {
        "Python": 3, "Deep Learning": 3, "NLP": 2, "Computer Vision": 2,
        "TensorFlow": 2, "PyTorch": 2, "Machine Learning": 3,
        "Neural Networks": 2, "MLOps": 2, "Docker": 1, "API": 1
    },
    "UI/UX Designer": {
        "Figma": 3, "Adobe XD": 2, "User Research": 3, "Wireframing": 3,
        "Prototyping": 2, "Design Systems": 2, "Typography": 2,
        "Color Theory": 2, "Accessibility": 1, "HTML": 1, "CSS": 1
    },
    "Product Manager": {
        "Agile": 3, "Scrum": 2, "Product Roadmap": 3, "User Stories": 2,
        "Market Research": 2, "Analytics": 2, "Communication": 3,
        "Leadership": 2, "OKR": 2, "SQL": 1, "Figma": 1
    },
    "QA Automation Engineer": {
        "Selenium": 2, "JUnit": 2, "Cypress": 2, "Python": 2,
        "Testing Strategies": 3, "Automation": 3, "Git": 2,
        "Jenkins": 2, "API Testing": 2, "Performance Testing": 1
    }
}

SKILL_SYNONYMS: Dict[str, List[str]] = {
    "JavaScript": ["JS", "ECMAScript", "ES6", "ES2015", "Vanilla JS"],
    "TypeScript": ["TS"],
    "Python": ["Python3", "Python 3", "py"],
    "Machine Learning": ["ML", "apprentissage automatique", "statistical learning"],
    "Deep Learning": ["DL", "neural networks", "réseaux de neurones"],
    "SQL": ["MySQL", "PostgreSQL", "MariaDB", "Oracle SQL", "T-SQL"],
    "NoSQL": ["MongoDB", "Cassandra", "Redis", "CouchDB", "Firebase"],
    "React": ["ReactJS", "React.js"],
    "Node.js": ["NodeJS", "Node", "Express.js"],
    "Docker": ["containerization", "container"],
    "Kubernetes": ["K8s"],
    "CI/CD": ["continuous integration", "continuous deployment", "pipeline", "GitLab CI", "GitHub Actions"],
    "REST API": ["RESTful", "REST", "API REST", "HTTP API"],
    "AWS": ["Amazon Web Services", "Amazon Cloud"],
    "Azure": ["Microsoft Azure"],
    "GCP": ["Google Cloud", "Google Cloud Platform"],
    "Git": ["GitHub", "GitLab", "version control", "versioning"],
    "Agile": ["Agile methodology", "méthode agile"],
    "NLP": ["Natural Language Processing", "traitement du langage naturel"],
    "Computer Vision": ["CV", "image recognition", "vision par ordinateur"],
    "ETL": ["Extract Transform Load", "data pipeline"],
    "Spring Boot": ["Spring", "Spring Framework"],
    "Flutter": ["Dart Flutter"],
    "Figma": ["Figma design"],
    "Tailwind": ["Tailwind CSS", "TailwindCSS"],
    "SASS": ["SCSS", "CSS preprocessor"],
    "Pandas": ["pandas library", "data frames"],
    "TensorFlow": ["TF", "Tensorflow"],
    "PyTorch": ["Torch"],
}


class SemanticSkillMatcher:
    """
    Moteur de matching sémantique.
    Priorité 1 : Sentence-BERT (vrai ML, comprend le sens)
    Priorité 2 : TF-IDF + synonymes améliorés (fallback robuste)
    """

    def __init__(self):
        self.sbert_model = None
        self._skill_embeddings_cache: Dict[str, np.ndarray] = {}
        self.tfidf = None
        self._load_model()

    def _load_model(self):
        if SBERT_AVAILABLE:
            try:
                print("🔄 Chargement du modèle Sentence-BERT (all-MiniLM-L6-v2)...")
                # Modèle léger (80MB), multilingue et rapide
                self.sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
                print("✅ Sentence-BERT chargé avec succès !")
            except Exception as e:
                print(f"⚠️  Erreur BERT: {e}. Fallback TF-IDF.")
                self.sbert_model = None

        if self.sbert_model is None and SKLEARN_AVAILABLE:
            print("🔄 Initialisation TF-IDF amélioré...")
            self.tfidf = TfidfVectorizer(
                ngram_range=(1, 2),
                analyzer='word',
                stop_words='english',
                max_features=10000,
                sublinear_tf=True  # log(TF) pour réduire l'impact des mots fréquents
            )
            # Entraîner sur tout le vocabulaire connu
            all_skills = self._build_training_corpus()
            self.tfidf.fit(all_skills)
            print("✅ TF-IDF amélioré entraîné !")

    def _build_training_corpus(self) -> List[str]:
        """Construit un corpus riche à partir des CAREER_PATHS + synonymes."""
        corpus = []
        for job, skills in CAREER_PATHS.items():
            corpus.append(job)
            for skill in skills.keys():
                corpus.append(skill)
                # Ajouter synonymes
                for canonical, syns in SKILL_SYNONYMS.items():
                    if skill == canonical:
                        corpus.extend(syns)
        return corpus

    def _get_embedding(self, text: str) -> np.ndarray:
        """Retourne l'embedding vectoriel d'un texte."""
        if text in self._skill_embeddings_cache:
            return self._skill_embeddings_cache[text]

        if self.sbert_model:
            emb = self.sbert_model.encode(text, convert_to_numpy=True)
        elif self.tfidf:
            emb = self.tfidf.transform([text]).toarray()[0]
        else:
            # Fallback ultime : one-hot basique
            emb = np.array([hash(text) % 1000])

        self._skill_embeddings_cache[text] = emb
        return emb

    def _normalize_skill(self, skill: str) -> str:
        """Normalise un skill en cherchant dans les synonymes."""
        skill_lower = skill.lower().strip()
        for canonical, syns in SKILL_SYNONYMS.items():
            if skill_lower == canonical.lower():
                return canonical
            for syn in syns:
                if skill_lower == syn.lower():
                    return canonical
        return skill  # Retourne tel quel si pas trouvé

    def skill_similarity(self, skill_a: str, skill_b: str) -> float:
        """
        Calcule la similarité sémantique entre deux compétences.
        Retourne un score entre 0 et 1.
        """
        # 1. Matching exact normalisé
        norm_a = self._normalize_skill(skill_a)
        norm_b = self._normalize_skill(skill_b)

        if norm_a.lower() == norm_b.lower():
            return 1.0

        # 2. Vérification synonymes croisés
        syns_a = set()
        syns_a.add(norm_a.lower())
        for canonical, syns in SKILL_SYNONYMS.items():
            if norm_a.lower() == canonical.lower() or norm_a.lower() in [s.lower() for s in syns]:
                syns_a.add(canonical.lower())
                syns_a.update([s.lower() for s in syns])

        if norm_b.lower() in syns_a:
            return 0.95  # Synonyme = très haute similarité

        # 3. Similarité sémantique via embeddings
        emb_a = self._get_embedding(norm_a)
        emb_b = self._get_embedding(norm_b)

        if emb_a.shape != emb_b.shape:
            return 0.0

        # Cosine similarity
        norm_val = np.linalg.norm(emb_a) * np.linalg.norm(emb_b)
        if norm_val == 0:
            return 0.0

        similarity = float(np.dot(emb_a, emb_b) / norm_val)
        return max(0.0, min(1.0, similarity))

    def match_skill_to_list(
        self,
        candidate_skill: str,
        target_skills: List[str],
        threshold: float = 0.55
    ) -> Optional[tuple]:
        """
        Vérifie si un skill candidat correspond à l'un des skills cibles.
        Retourne (matched_skill, confidence) ou None.
        """
        best_match = None
        best_score = threshold  # Seuil minimum

        for target in target_skills:
            score = self.skill_similarity(candidate_skill, target)
            if score > best_score:
                best_score = score
                best_match = target

        return (best_match, best_score) if best_match else None

    def embed_text(self, text: str) -> np.ndarray:
        """Embedding d'un texte long (description de formation)."""
        return self._get_embedding(text)

    def texts_cosine_similarity(self, text_a: str, text_b: str) -> float:
        """Similarité entre deux textes."""
        emb_a = self.embed_text(text_a)
        emb_b = self.embed_text(text_b)
        if emb_a.shape != emb_b.shape or np.linalg.norm(emb_a) == 0:
            return 0.0
        return float(np.dot(emb_a, emb_b) / (np.linalg.norm(emb_a) * np.linalg.norm(emb_b)))


# Instance globale du matcher
matcher = SemanticSkillMatcher()


class FormationData(BaseModel):
    id: int
    titre: str
    description: Optional[str] = ""
    competences: List[str] = []
    categorie: Optional[str] = ""
    niveau: Optional[str] = ""

class RecommendationRequest(BaseModel):
    candidat_competences: List[str]
    candidat_niveau: Optional[str] = ""
    formations_terminees_ids: List[int] = []
    formations_disponibles: List[FormationData]

class RecommendationResult(BaseModel):
    formation_id: int
    score_match: float
    raisons: List[str]
    competences_couvertes: List[str] = []

class SkillGapRequest(BaseModel):
    candidat_competences: List[str]
    target_job: str
    formations_terminees_ids: List[int] = []
    formations_disponibles: List[FormationData]

class SkillMatch(BaseModel):
    skill: str           # Skill requis pour le métier
    candidate_skill: str  # Ce que le candidat a déclaré
    confidence: float     # Score de confiance (0-1)
    weight: int           # Importance pour le métier (1-3)

class SkillGapResponse(BaseModel):
    job_title: str
    match_percentage: float           # Score pondéré (tient compte du poids)
    matching_skills: List[SkillMatch]  # Skills que le candidat possède (avec mapping)
    missing_skills: List[dict]         # Skills manquants + leur importance
    recommended_formations: List[RecommendationResult]
    model_used: str                    # "sentence-bert" ou "tfidf-enhanced"


@app.post("/recommend", response_model=List[RecommendationResult])
async def recommend_formations(req: RecommendationRequest):
    """
    Recommande des formations basées sur le profil du candidat.
    Utilise les embeddings sémantiques pour comparer compétences ↔ formations.
    """
    if not req.formations_disponibles:
        return []

    terminees_set = set(req.formations_terminees_ids)

    # ── 1. Construire le profil textuel enrichi ─────────────────────
    profile_parts = list(req.candidat_competences)
    if req.candidat_niveau:
        profile_parts.append(req.candidat_niveau)

    # Enrichir avec le contexte des formations déjà terminées
    for f in req.formations_disponibles:
        if f.id in terminees_set:
            profile_parts.append(f.titre)
            profile_parts.extend(f.competences)
            if f.categorie:
                profile_parts.append(f.categorie)

    profile_text = " ".join(p for p in profile_parts if p).strip()
    if not profile_text:
        profile_text = "general training"

    # ── 2. Calculer les scores pour chaque formation ─────────────────
    results = []
    terminees_categories = {
        f.categorie for f in req.formations_disponibles
        if f.id in terminees_set and f.categorie
    }

    for formation in req.formations_disponibles:
        if formation.id in terminees_set:
            continue

        # ── Prparation des textes
        titre_lower = formation.titre.lower()
        cat_lower = (formation.categorie or "").lower()
        
        # ── 1. Score Skill-to-Formation (Prcision maximale)
        # On regarde comment CHAQUE skill du candidat matche avec la formation
        individual_scores = []
        matched_skills = []
        
        for cand_skill in req.candidat_competences:
            cs_lower = cand_skill.lower().strip()
            
            # Bonus matching exact de mot-cl (trs puissant)
            keyword_bonus = 0.0
            if cs_lower in titre_lower or cs_lower in cat_lower:
                keyword_bonus = 0.4
            
            # Similarit smantique avec le titre et les comptences de la formation
            # On prend le meilleur match entre (Candidat Skill) et (Titre, Catgorie, Comptences Formation)
            best_sim = 0.0
            
            # Comparaison avec le titre
            sim_titre = matcher.skill_similarity(cand_skill, formation.titre)
            best_sim = max(best_sim, sim_titre)
            
            # Comparaison avec les skills dclars de la formation
            for f_skill in formation.competences:
                sim_fs = matcher.skill_similarity(cand_skill, f_skill)
                best_sim = max(best_sim, sim_fs)
            
            # Score pour cette comptence prcise
            skill_total = max(best_sim, keyword_bonus)
            if skill_total > 0.45:
                matched_skills.append(cand_skill)
            
            individual_scores.append(skill_total)

        # Score de prcision (le top des matches)
        # On prend la moyenne des 2 meilleures comptences pour ne pas diluer si le candidat a trop de skills
        top_scores = sorted(individual_scores, reverse=True)[:2]
        precision_score = np.mean(top_scores) if top_scores else 0.0

        # ── 2. Score Global (Contexte)
        formation_text = f"{formation.titre} {formation.description} {' '.join(formation.competences)} {formation.categorie}"
        semantic_global = matcher.texts_cosine_similarity(profile_text, formation_text)

        # ── 3. Combinaison et Scaling Non-Linaire
        # Formule : 70% prcision + 30% contexte global
        raw_score = (0.7 * precision_score) + (0.3 * semantic_global)
        
        # Scaling pour rendre les scores plus "humains" (0.3 -> 0.6, 0.5 -> 0.8)
        if raw_score > 0:
            # Courbe de boost : racine carre pour gonfler les scores moyens
            boosted_score = np.sqrt(raw_score) * 0.95
            score_pct = round(min(boosted_score * 100, 100.0), 1)
        else:
            score_pct = 0.0

        # ── 4. Filtre et Raisons
        # On ne garde que si > 15% pour viter le bruit (ex: .NET pour un profil Linux)
        if score_pct >= 15.0:
            raisons = _generate_raisons(score_pct, matched_skills, formation)
            
            results.append(RecommendationResult(
                formation_id=formation.id,
                score_match=score_pct,
                raisons=raisons,
                competences_couvertes=list(set(matched_skills))[:5]
            ))

    results.sort(key=lambda x: x.score_match, reverse=True)
    return results[:10]


def _generate_raisons(score: float, matched_skills: List[str], formation: FormationData) -> List[str]:
    raisons = []
    if matched_skills:
        skills_str = ", ".join(matched_skills[:2])
        raisons.append(f"En lien direct avec vos comptences en : {skills_str}")
    
    if score >= 85:
        raisons.append("Match parfait pour votre progression.")
    elif score >= 65:
        raisons.append("Fortement recommand pour votre profil.")
    elif score >= 40:
        raisons.append("Bonne opportunit pour monter en comptence.")
    else:
        raisons.append("Complmentaire  votre parcours actuel.")
        
    return raisons

@app.post("/analyze-gap", response_model=SkillGapResponse)
async def analyze_skill_gap(req: SkillGapRequest):
    """
    Analyse le gap de compétences entre le candidat et un métier cible.
    Matching sémantique : comprend JS≈JavaScript, ML≈Machine Learning, etc.
    """
    if req.target_job not in CAREER_PATHS:
        raise HTTPException(
            status_code=404,
            detail=f"Métier '{req.target_job}' introuvable. Disponibles : {list(CAREER_PATHS.keys())}"
        )

    required_skills_weighted = CAREER_PATHS[req.target_job]  # {skill: weight}
    required_skills = list(required_skills_weighted.keys())

    # ── 1. Matching sémantique pour chaque skill requis ──────────────
    matching_skills: List[SkillMatch] = []
    missing_skills: List[dict] = []

    total_weight = sum(required_skills_weighted.values())
    matched_weight = 0

    for required_skill in required_skills:
        weight = required_skills_weighted[required_skill]
        found = False

        # Chercher dans les compétences du candidat
        best_cand_skill = None
        best_confidence = 0.0

        for cand_skill in req.candidat_competences:
            sim = matcher.skill_similarity(cand_skill, required_skill)
            if sim > best_confidence:
                best_confidence = sim
                best_cand_skill = cand_skill

        # Seuil adaptatif selon l'importance du skill
        threshold = 0.55 if weight >= 2 else 0.50

        if best_confidence >= threshold and best_cand_skill:
            matching_skills.append(SkillMatch(
                skill=required_skill,
                candidate_skill=best_cand_skill,
                confidence=round(best_confidence, 3),
                weight=weight
            ))
            matched_weight += weight * best_confidence  # Pondéré par confiance
            found = True

        if not found:
            missing_skills.append({
                "skill": required_skill,
                "weight": weight,
                "importance": {1: "Utile", 2: "Important", 3: "Essentiel"}[weight]
            })

    # ── 2. Score pondéré (meilleur que simple %) ─────────────────────
    match_percentage = (matched_weight / total_weight * 100) if total_weight > 0 else 0
    match_percentage = round(min(match_percentage, 100.0), 1)

    # ── 3. Recommander les formations qui couvrent les gaps ──────────
    missing_skill_names = [m["skill"] for m in missing_skills]
    recommended = _recommend_for_gap(
        missing_skills=missing_skill_names,
        formations=req.formations_disponibles,
        terminees_ids=set(req.formations_terminees_ids)
    )

    # Trier les skills manquants par importance décroissante
    missing_skills.sort(key=lambda x: x["weight"], reverse=True)

    model_name = "sentence-bert" if matcher.sbert_model else "tfidf-enhanced"

    return SkillGapResponse(
        job_title=req.target_job,
        match_percentage=match_percentage,
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        recommended_formations=recommended[:5],
        model_used=model_name
    )


def _recommend_for_gap(
    missing_skills: List[str],
    formations: List[FormationData],
    terminees_ids: set
) -> List[RecommendationResult]:
    """Recommande des formations pour combler les skills manquants."""
    if not missing_skills or not formations:
        return []

    results = []
    missing_text = " ".join(missing_skills)

    for formation in formations:
        if formation.id in terminees_ids:
            continue

        formation_text = " ".join(filter(None, [
            formation.titre,
            " ".join(formation.competences),
            formation.description
        ]))

        # Score sémantique entre skills manquants et formation
        score = matcher.texts_cosine_similarity(missing_text, formation_text)

        # Skill-to-skill précis
        covered = []
        for missing in missing_skills:
            for form_skill in formation.competences:
                sim = matcher.skill_similarity(missing, form_skill)
                if sim > 0.55:
                    covered.append(missing)
                    break

        # Bonus pour chaque skill manquant couvert
        coverage_bonus = len(covered) * 0.08
        final_score = min((score + coverage_bonus) * 100, 99.0)

        if final_score > 5:
            raisons = []
            if covered:
                raisons.append(f"Comble vos lacunes en : {', '.join(covered[:3])}")
            else:
                raisons.append("Correspond à votre objectif de carrière")

            results.append(RecommendationResult(
                formation_id=formation.id,
                score_match=round(final_score, 1),
                raisons=raisons,
                competences_couvertes=covered
            ))

    results.sort(key=lambda x: x.score_match, reverse=True)
    return results



@app.get("/careers")
def get_career_paths():
    """Liste tous les métiers disponibles avec leurs skills pondérés."""
    return {
        job: {
            "skills": {
                skill: {
                    "weight": w,
                    "importance": {1: "Utile", 2: "Important", 3: "Essentiel"}[w]
                }
                for skill, w in skills.items()
            },
            "total_skills": len(skills),
            "essential_skills": [s for s, w in skills.items() if w == 3]
        }
        for job, skills in CAREER_PATHS.items()
    }

@app.get("/skill-similarity")
def test_similarity(skill_a: str, skill_b: str):
    """Teste la similarité entre deux compétences (debug/démo)."""
    score = matcher.skill_similarity(skill_a, skill_b)
    return {
        "skill_a": skill_a,
        "skill_b": skill_b,
        "similarity": round(score, 4),
        "interpretation": (
            "Identique/Synonyme" if score > 0.9 else
            "Très similaire" if score > 0.75 else
            "Similaire" if score > 0.55 else
            "Peu similaire" if score > 0.3 else
            "Différent"
        ),
        "model_used": "sentence-bert" if matcher.sbert_model else "tfidf-enhanced"
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model": "sentence-bert" if matcher.sbert_model else "tfidf-enhanced",
        "sbert_available": SBERT_AVAILABLE and matcher.sbert_model is not None,
        "sklearn_available": SKLEARN_AVAILABLE,
        "careers_count": len(CAREER_PATHS),
        "cache_size": len(matcher._skill_embeddings_cache)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)