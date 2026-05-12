import requests
import json

BASE_URL = "http://localhost:5000"

def print_section(title: str):
    print(f"\n{'═'*60}")
    print(f"  {title}")
    print('═'*60)

def test_semantic_similarity():
    """Démontre que le nouveau modèle comprend les synonymes."""
    print_section("TEST 1 : Matching Sémantique (Synonymes)")

    pairs = [
        ("JS", "JavaScript"),
        ("ML", "Machine Learning"),
        ("Python", "Python3"),
        ("Node.js", "NodeJS"),
        ("K8s", "Kubernetes"),
        ("React", "Angular"),
        ("Python", "Java"),
        ("Docker", "Containers"),
    ]

    for skill_a, skill_b in pairs:
        try:
            r = requests.get(f"{BASE_URL}/skill-similarity", params={"skill_a": skill_a, "skill_b": skill_b})
            data = r.json()
            bar = "█" * int(data["similarity"] * 20)
            print(f"  {skill_a:20} ↔ {skill_b:20} | {bar:20} {data['similarity']:.3f} ({data['interpretation']})")
        except Exception as e:
            print(f"  ⚠️  Erreur: {e}")

def test_skill_gap_analysis():
    """Teste l'analyse de gap avec un profil réel."""
    print_section("TEST 2 : Analyse Gap — Data Scientist avec profil partiel")

    # Candidat qui dit "ML" au lieu de "Machine Learning", "JS" au lieu de "JavaScript"
    payload = {
        "candidat_competences": ["Python", "SQL", "ML", "Stats", "pandas"],
        "target_job": "Data Scientist",
        "formations_terminees_ids": [],
        "formations_disponibles": [
            {
                "id": 1,
                "titre": "Deep Learning avec TensorFlow",
                "description": "Apprenez les réseaux de neurones profonds",
                "competences": ["Deep Learning", "TensorFlow", "Python", "Neural Networks"],
                "categorie": "IA",
                "niveau": "Avancé"
            },
            {
                "id": 2,
                "titre": "Scikit-Learn pour le Machine Learning",
                "description": "Algorithmes de ML pratiques",
                "competences": ["Scikit-Learn", "Machine Learning", "Python", "Statistics"],
                "categorie": "Data Science",
                "niveau": "Intermédiaire"
            },
            {
                "id": 3,
                "titre": "Data Visualization avec Matplotlib",
                "description": "Créez des visualisations impactantes",
                "competences": ["Data Visualization", "Python", "Matplotlib", "Seaborn"],
                "categorie": "Data Science",
                "niveau": "Débutant"
            },
        ]
    }

    try:
        r = requests.post(f"{BASE_URL}/analyze-gap", json=payload)
        data = r.json()

        print(f"\n  Métier cible   : {data['job_title']}")
        print(f"  Modèle utilisé : {data['model_used']}")
        print(f"  Match pondéré  : {data['match_percentage']}%")

        print(f"\n  ✅ Skills MATCHÉS ({len(data['matching_skills'])}) :")
        for m in data['matching_skills']:
            stars = "⭐" * m["weight"]
            print(f"     {stars} '{m['candidate_skill']}' → '{m['skill']}' (confiance: {m['confidence']:.2f})")

        print(f"\n  ❌ Skills MANQUANTS ({len(data['missing_skills'])}) :")
        for m in data['missing_skills']:
            stars = "⭐" * m["weight"]
            print(f"     {stars} {m['skill']} ({m['importance']})")

        print(f"\n  📚 Formations recommandées :")
        for f in data['recommended_formations']:
            print(f"     ID {f['formation_id']}: score {f['score_match']}% — {f['raisons'][0]}")

    except Exception as e:
        print(f"  ⚠️  Erreur: {e}")

def test_recommend():
    """Teste les recommandations de formations."""
    print_section("TEST 3 : Recommandations — Profil DevOps débutant")

    payload = {
        "candidat_competences": ["Linux", "Python", "Docker"],
        "candidat_niveau": "Intermédiaire",
        "formations_terminees_ids": [1],
        "formations_disponibles": [
            {"id": 1, "titre": "Docker Fundamentals", "competences": ["Docker", "Linux"], "categorie": "DevOps", "niveau": "Débutant", "description": ""},
            {"id": 2, "titre": "Kubernetes Avancé", "competences": ["Kubernetes", "Docker", "K8s"], "categorie": "DevOps", "niveau": "Avancé", "description": ""},
            {"id": 3, "titre": "CI/CD avec Jenkins", "competences": ["Jenkins", "CI/CD", "Git", "DevOps"], "categorie": "DevOps", "niveau": "Intermédiaire", "description": ""},
            {"id": 4, "titre": "Introduction au Machine Learning", "competences": ["Python", "Machine Learning"], "categorie": "Data Science", "niveau": "Débutant", "description": ""},
            {"id": 5, "titre": "Terraform Infrastructure as Code", "competences": ["Terraform", "AWS", "Infrastructure as Code"], "categorie": "Cloud", "niveau": "Intermédiaire", "description": ""},
        ]
    }

    try:
        r = requests.post(f"{BASE_URL}/recommend", json=payload)
        data = r.json()

        print(f"\n  Top {len(data)} formations recommandées :")
        for f in data:
            bar = "█" * int(f['score_match'] / 5)
            print(f"  ID {f['formation_id']} | {bar:20} {f['score_match']:5.1f}%")
            if f['competences_couvertes']:
                print(f"         Compétences couvertes: {', '.join(f['competences_couvertes'])}")
            for r in f['raisons']:
                print(f"         → {r}")

    except Exception as e:
        print(f"  ⚠️  Erreur: {e}")

def test_health():
    print_section("SANTÉ DU SERVICE")
    try:
        r = requests.get(f"{BASE_URL}/health")
        data = r.json()
        model_icon = "🧠" if data.get("sbert_available") else "📊"
        print(f"\n  Status         : {data['status']}")
        print(f"  {model_icon} Modèle actif : {data['model']}")
        print(f"  BERT disponible: {data['sbert_available']}")
        print(f"  Métiers en DB  : {data['careers_count']}")
    except Exception as e:
        print(f"  ⚠️  Service non accessible. Lancez d'abord: uvicorn main:app --port 5000")

if __name__ == "__main__":
    print("\n🚀 DÉMONSTRATION — ML v2 avec Embeddings Sémantiques")
    test_health()
    test_semantic_similarity()
    test_skill_gap_analysis()
    test_recommend()
    print(f"\n{'═'*60}")
    print("  Docs API disponibles sur : http://localhost:5000/docs")
    print('═'*60)
