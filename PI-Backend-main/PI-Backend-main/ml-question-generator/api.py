# Moved from jove/src/api.py into backend folder.
# This service is consumed by Angular via the /ml proxy (localhost:8000).
import json
import os
import random
import re
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from pydantic import BaseModel

try:
    import torch
except Exception:
    torch = None

try:
    from dataset import QuestionTokenizer
    from model import QuestionGeneratorModel
except Exception:
    QuestionTokenizer = None
    QuestionGeneratorModel = None


BASE_DIR = Path(__file__).resolve().parent

# Paths for local model (optional)
VOCAB_PATH = BASE_DIR / "saved_model" / "vocab.json"
MODEL_PATH = BASE_DIR / "saved_model" / "model.pt"

# Dataset path: by default we keep using the existing Angular dataset location.
# You can override by setting QUESTIONS_DATA_DIR.
DEFAULT_DATA_DIR = os.getenv("QUESTIONS_DATA_DIR", "").strip()
if DEFAULT_DATA_DIR:
    data_dir = Path(DEFAULT_DATA_DIR)
else:
    data_dir = Path(
        r"C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove\src\app\Nesrineai\data"
    )

SEED_DATASET_PATH = data_dir / "questions.json"
EXPANDED_DATASET_PATH = data_dir / "questions_expanded.json"

HF_API_URL = os.getenv(
    "HF_API_URL",
    "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta",
).strip()
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "").strip()
HF_TIMEOUT = max(5, int(os.getenv("HF_TIMEOUT", "60")))
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
DEFAULT_AI_PROVIDER = "groq" if GROQ_API_KEY else "huggingface"
AI_PROVIDER = os.getenv("AI_QUESTION_PROVIDER", DEFAULT_AI_PROVIDER).strip().lower()

ML_INTERNAL_API_KEY = os.getenv("ML_INTERNAL_API_KEY", "").strip()
ML_CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ML_CORS_ORIGINS",
        "http://localhost:4200,http://127.0.0.1:4200,http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if o.strip()
]

DEVICE = "cpu"
MODEL_READY = False
tokenizer = None
model = None

if torch is not None:
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

if (
    torch is not None
    and QuestionTokenizer is not None
    and QuestionGeneratorModel is not None
    and VOCAB_PATH.exists()
    and MODEL_PATH.exists()
):
    try:
        tokenizer = QuestionTokenizer.load(str(VOCAB_PATH))
        model = QuestionGeneratorModel(
            vocab_size=len(tokenizer.token2id),
            d_model=256,
            nhead=8,
            num_encoder_layers=4,
            num_decoder_layers=4,
            dim_feedforward=512,
        ).to(DEVICE)
        model.load_state_dict(torch.load(str(MODEL_PATH), map_location=DEVICE))
        model.eval()
        MODEL_READY = True
    except Exception:
        MODEL_READY = False

app = FastAPI(title="AI Question Generator")
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


class GenerateRequest(BaseModel):
    domaine: str
    categorie: str
    niveau: str
    type: str
    theme: str = ""
    nombre: int = 3
    temperature: float = 0.7


class QuestionOut(BaseModel):
    contenu: str
    type: str
    points: int
    theme: str
    choix: list


OFF_TOPIC_KEYWORDS = [
    "beaute",
    "beauté",
    "maquillage",
    "coiffure",
    "mode",
    "fashion",
    "sport",
    "voyage",
    "cuisine",
    "recette",
    "musique",
    "cinema",
    "film",
    "serie",
    "gaming",
    "jeu",
    "jardinage",
    "animaux",
    "astrologie",
    "divertissement",
]

THEME_SPECIFICS = {
    "sql": {
        "keywords": [
            "sql",
            "join",
            "index",
            "transaction",
            "requete",
            "database",
            "bdd",
            "schema",
            "trigger",
            "index",
            "optimize",
            "trigger",
        ],
        "avoid_generic": ["select", "from", "where"],
        "good_questions_keywords": ["index", "join", "transaction", "normalization", "performance"],
        "examples": [
            "Quand choisir INNER JOIN ou LEFT JOIN pour optimiser une requete complexe ?",
            "Comment indexer une table pour accelerer une recherche multi-criteres sur plusieurs colonnes ?",
            "Comment detecter et resoudre un scan complet de table dans SQL ?",
        ],
    },
    "angular": {
        "keywords": [
            "angular",
            "component",
            "service",
            "rxjs",
            "typescript",
            "directive",
            "template",
            "module",
            "resolver",
            "interceptor",
            "observable",
        ],
        "avoid_generic": ["app", "component", "service"],
        "good_questions_keywords": ["rxjs", "unsubscribe", "trackby", "resolver", "interceptor", "change detection"],
        "examples": [
            "Comment optimiser le rendu d une liste Angular avec 10000 elements en utilisant trackBy ?",
            "Quand preferer un Resolver plutot qu un appel API dans ngOnInit pour eviter les fuites memoire ?",
            "Comment gerer proprement les fuites de souscriptions RxJS dans un component qui change souvent ?",
        ],
    },
    "javascript": {
        "keywords": ["javascript", "js", "closure", "promise", "async", "await", "event loop", "prototype", "callback"],
        "avoid_generic": ["javascript", "js", "code"],
        "good_questions_keywords": ["closure", "promise", "async await", "event loop", "prototype", "callback"],
        "examples": [
            "Comment expliquer une closure JavaScript avec un cas concret d encapsulation ?",
            "Quelle difference entre Promise, async/await et callback dans une application JavaScript ?",
            "Comment fonctionne l event loop et pourquoi cela impacte les operations asynchrones ?",
        ],
    },
    "java": {
        "keywords": ["java", "jvm", "exception", "interface", "abstract", "stream", "lambda"],
        "avoid_generic": ["java", "class", "method"],
        "good_questions_keywords": ["exception handling", "SOLID", "optional", "stream api", "generics"],
        "examples": [
            "Quand preferer une interface a une classe abstraite en Java et pourquoi ?",
            "Comment differentier les exceptions checked, unchecked et les erreurs en Java ?",
            "Comment utiliser Optional pour eviter les NullPointerException sans abuse ?",
        ],
    },
    "python": {
        "keywords": ["python", "decorator", "generator", "context manager", "virtual env", "pandas", "async"],
        "avoid_generic": ["python", "function", "variable"],
        "good_questions_keywords": ["decorator", "async", "context manager", "comprehension", "generator", "virtual env"],
        "examples": [
            "Quand utiliser une list comprehension plutot qu une boucle classique en Python ?",
            "Quels pieges eviter avec les arguments mutables par defaut en Python ?",
            "Comment utiliser proprement les decorateurs pour ajouter des fonctionnalites ?",
        ],
    },
    "spring": {
        "keywords": ["spring", "spring boot", "bean", "transactional", "controller", "repository", "service"],
        "avoid_generic": ["spring", "bean", "controller"],
        "good_questions_keywords": ["transactional", "security", "cache", "rest", "dependency injection"],
        "examples": [
            "Quand utiliser @Transactional et quelles sont les pieges courants ?",
            "Comment separer proprement les responsabilites entre Controller, Service et Repository ?",
            "Comment implementer un handler global d erreur avec Spring et @ControllerAdvice ?",
        ],
    },
}


def _normalize_level_for_seed(level: str) -> str:
    mapping = {
        "DEBUTANT": "Junior",
        "INTERMEDIAIRE": "Intermediate",
        "AVANCE": "Senior",
        "EXPERT": "Expert",
    }
    raw = (level or "").strip().upper()
    return mapping.get(raw, level or "Intermediate")


def _get_theme_key_for_specifics(theme: str) -> str | None:
    if not theme:
        return None
    normalized = theme.strip().lower().replace(" ", "").replace("_", "")
    for key in THEME_SPECIFICS.keys():
        if key in normalized or normalized in key:
            return key
    return None


def _get_theme_info(theme: str) -> dict | None:
    key = _get_theme_key_for_specifics(theme)
    return THEME_SPECIFICS.get(key) if key else None


def _build_generation_prompt(req: GenerateRequest) -> str:
    domain = (req.domaine or "INFORMATIQUE").strip().upper()
    category = (req.categorie or "TECHNIQUE").strip().upper()
    level = _normalize_level_for_seed(req.niveau)
    q_type = (req.type or "QCM").strip().upper()
    theme = (req.theme or "general").strip()

    return (
        "Tu es un expert en conception de questions d'entretien et d'evaluation. "
        "Genere UNIQUEMENT un JSON valide, sans texte additionnel, sans markdown, sans explication. "
        "Le JSON doit correspondre au schema suivant: {contenu, type, points, theme, choix}. "
        "Toutes les questions doivent etre en francais, precises, professionnelles, non ambigues et adaptees au poste. "
        "Evite les questions trop generales ou du type definissez...; privilegie des cas concrets, des situations reelles et des bonnes reponses solides. "
        "Pour QCM: 4 choix minimum avec distracteurs plausibles. Pour QCU: 4 choix minimum avec une seule bonne reponse. "
        "Pour VRAI_FAUX: propose une affirmation claire, sans nuance inutile, avec exactement Vrai/Faux. "
        "Ne duplique pas les questions dans la meme serie. "
        f"Contexte -> domaine:{domain} | categorie:{category} | niveau:{level} | type:{q_type} | theme:{theme}."
    )


def _build_theme_specific_prompt(req: GenerateRequest) -> str:
    base_prompt = _build_generation_prompt(req)
    theme_info = _get_theme_info(req.theme)
    if not theme_info:
        return base_prompt

    keywords_str = ", ".join(theme_info.get("good_questions_keywords", []))
    examples_text = "\n".join(f"  - {ex}" for ex in theme_info.get("examples", [])[:3])
    return (
        f"{base_prompt}\n"
        f"IMPORTANT - Theme specifique '{req.theme}':\n"
        f"Les questions DOIVENT contenir au moins l'un de ces termes techniques clés: {keywords_str}.\n"
        f"Exemples de bonnes questions pour ce theme:\n{examples_text}\n"
        "Genere des questions au MEME NIVEAU de specificite et de profondeur, PAS des generalisations superficielles."
    )


def _build_external_generation_prompt(req: GenerateRequest, retry: bool = False) -> str:
    base_prompt = _build_theme_specific_prompt(req)
    strict_addon = ""
    if retry:
        strict_addon = (
            "\n\nCRITICAL: La reponse precedente etait trop generique. "
            "Genere des questions TRES SPECIFIQUES et TECHNIQUES, pas des generalisations. "
            "Chaque question DOIT contenir du vocabulaire technique pointu du domaine. "
            "Evite absolument les questions vagues ou definissez... "
        )

    nombre = max(1, min(int(req.nombre or 1), 10))
    return (
        f"{base_prompt}{strict_addon} "
        f"Retourne exactement {nombre} questions sous forme d'un tableau JSON valide. "
        "Chaque element doit respecter le schema {contenu, type, points, theme, choix}. "
        "Ne fournis aucune explication, aucun markdown et aucun texte en dehors du JSON."
    )


def _strip_code_fences(text: str) -> str:
    cleaned = str(text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _extract_json_payload(text: str):
    cleaned = _strip_code_fences(text)
    candidates = [cleaned]

    array_start = cleaned.find("[")
    array_end = cleaned.rfind("]")
    if array_start != -1 and array_end != -1 and array_end > array_start:
        candidates.append(cleaned[array_start : array_end + 1])

    object_start = cleaned.find("{")
    object_end = cleaned.rfind("}")
    if object_start != -1 and object_end != -1 and object_end > object_start:
        candidates.append(cleaned[object_start : object_end + 1])

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except Exception:
            continue
    return None


def _ensure_valid_choices(question_type: str, choices: list[dict]) -> list[dict]:
    normalized_type = str(question_type or "").strip().upper()
    if normalized_type in {"VF", "VRAI_FAUX"}:
        if not choices or len(choices) < 2:
            return [
                {"texte": "Vrai", "correcte": True, "ordre": 1},
                {"texte": "Faux", "correcte": False, "ordre": 2},
            ]
        normalized = [
            {"texte": "Vrai", "correcte": bool(choices[0].get("correcte", True)), "ordre": 1},
            {"texte": "Faux", "correcte": bool(choices[1].get("correcte", False)), "ordre": 2},
        ]
        if not any(c["correcte"] for c in normalized):
            normalized[0]["correcte"] = True
        if sum(1 for c in normalized if c["correcte"]) > 1:
            normalized[1]["correcte"] = False
        return normalized

    cleaned = []
    for idx, choice in enumerate(choices or [], start=1):
        text = str(choice.get("texte", "")).strip()
        if not text:
            continue
        cleaned.append({"texte": text, "correcte": bool(choice.get("correcte", False)), "ordre": idx})

    if not cleaned:
        cleaned = [
            {"texte": "Option A", "correcte": True, "ordre": 1},
            {"texte": "Option B", "correcte": False, "ordre": 2},
            {"texte": "Option C", "correcte": False, "ordre": 3},
        ]

    if not any(c["correcte"] for c in cleaned):
        cleaned[0]["correcte"] = True

    if normalized_type == "QCU":
        found = False
        for c in cleaned:
            if c["correcte"] and not found:
                found = True
            else:
                c["correcte"] = False
    return cleaned


def _normalize_external_question(item: dict, req: GenerateRequest) -> QuestionOut | None:
    if not isinstance(item, dict):
        return None
    contenu = str(item.get("contenu") or item.get("question") or item.get("text") or "").strip()
    if not contenu:
        return None
    q_type = str(item.get("type") or req.type or "QCM").strip().upper()
    theme = str(item.get("theme") or req.theme or "emploi").strip() or "emploi"
    try:
        points = int(item.get("points") or 1)
    except Exception:
        points = 1
    points = max(1, min(points, 10))
    raw_choices = item.get("choix") if isinstance(item.get("choix"), list) else []
    choix = _ensure_valid_choices(q_type, raw_choices)
    return QuestionOut(contenu=contenu, type=q_type, points=points, theme=theme, choix=choix)


def _parse_external_questions_response(text: str, req: GenerateRequest) -> list[QuestionOut]:
    payload = _extract_json_payload(text)
    if isinstance(payload, dict):
        for key in ("questions", "data", "items", "results"):
            if isinstance(payload.get(key), list):
                payload = payload[key]
                break
    if not isinstance(payload, list):
        return []

    results: list[QuestionOut] = []
    limit = max(1, min(int(req.nombre or 1), 10))
    for item in payload:
        if len(results) >= limit:
            break
        question = _normalize_external_question(item, req)
        if question is not None:
            results.append(question)
    return results


def _call_external_provider(req: GenerateRequest, retry: bool = False) -> list[QuestionOut]:
    def _call_huggingface() -> list[QuestionOut]:
        if not HF_API_URL:
            return []
        payload = {
            "inputs": _build_external_generation_prompt(req, retry=retry),
            "parameters": {
                "max_new_tokens": 1200,
                "temperature": max(0.1, float(req.temperature or 0.7)),
                "top_p": 0.9,
                "do_sample": True,
                "return_full_text": False,
            },
            "options": {"wait_for_model": True},
        }
        headers = {"Content-Type": "application/json"}
        if HF_API_TOKEN:
            headers["Authorization"] = f"Bearer {HF_API_TOKEN}"

        request = urlrequest.Request(
            HF_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urlrequest.urlopen(request, timeout=HF_TIMEOUT) as response:
                response_body = response.read().decode("utf-8")
        except urlerror.HTTPError:
            return []
        except Exception:
            return []

        try:
            raw = json.loads(response_body)
        except Exception:
            raw = response_body

        generated_text = ""
        if isinstance(raw, list) and raw:
            first_item = raw[0]
            if isinstance(first_item, dict):
                generated_text = str(first_item.get("generated_text") or first_item.get("text") or "").strip()
            else:
                generated_text = str(first_item).strip()
        elif isinstance(raw, dict):
            if raw.get("error"):
                return []
            generated_text = str(raw.get("generated_text") or raw.get("text") or "").strip()
        elif isinstance(raw, str):
            generated_text = raw.strip()

        if not generated_text:
            return []
        return _parse_external_questions_response(generated_text, req)

    def _call_groq() -> list[QuestionOut]:
        if not GROQ_API_KEY or not GROQ_API_URL:
            return []
        prompt = _build_external_generation_prompt(req, retry=retry)
        payload = {
            "model": GROQ_MODEL,
            "temperature": max(0.1, float(req.temperature or 0.7)),
            "max_tokens": 1400,
            "messages": [
                {
                    "role": "system",
                    "content": "Tu es un assistant IA expert en generation de questions d entretien. Tu dois repondre uniquement avec du JSON valide.",
                },
                {"role": "user", "content": prompt},
            ],
        }
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {GROQ_API_KEY}"}
        request = urlrequest.Request(
            GROQ_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urlrequest.urlopen(request, timeout=HF_TIMEOUT) as response:
                response_body = response.read().decode("utf-8")
        except urlerror.HTTPError:
            return []
        except Exception:
            return []

        try:
            raw = json.loads(response_body)
        except Exception:
            return []

        content = raw.get("choices", [{}])[0].get("message", {}).get("content", "") if isinstance(raw, dict) else ""
        generated_text = str(content or "").strip()
        if not generated_text:
            return []
        return _parse_external_questions_response(generated_text, req)

    if AI_PROVIDER in {"groq", "openai"}:
        groq_results = _call_groq()
        if groq_results:
            return groq_results
        return _call_huggingface()

    if AI_PROVIDER in {"huggingface", "hf", "external"}:
        hf_results = _call_huggingface()
        if hf_results:
            return hf_results
        return _call_groq()

    groq_results = _call_groq()
    if groq_results:
        return groq_results
    return _call_huggingface()


def _thematic_fallback_generate(req: GenerateRequest) -> list[QuestionOut]:
    wanted_type = (req.type or "QCM").strip().upper()
    theme = (req.theme or "entretien technique").strip() or "entretien technique"
    nombre = max(1, min(int(req.nombre or 1), 10))

    key = _theme_key(theme)
    banks = {
        "sql": [
            "Quand choisir INNER JOIN ou LEFT JOIN dans une requete SQL ?",
            "Comment indexer une table pour accelerer une recherche multi-criteres ?",
            "Comment detecter qu une requete SQL fait un scan complet de table ?",
            "Quelle difference entre index BTREE et HASH et quand les utiliser ?",
            "Comment eviter les deadlocks dans des transactions concurrentes ?",
        ],
        "angular": [
            "Comment optimiser le rendu d une liste Angular volumineuse avec trackBy ?",
            "Quand utiliser un Resolver plutot qu un appel API dans ngOnInit ?",
            "Comment gerer proprement les fuites memoire avec RxJS (takeUntil, async pipe) ?",
            "Comment implementer un HttpInterceptor pour centraliser les erreurs ?",
            "Quelle difference entre ChangeDetectionStrategy.Default et OnPush ?",
        ],
        "java": [
            "Quand preferer une interface a une classe abstraite en Java ?",
            "Difference entre exceptions checked et unchecked ?",
            "Comment utiliser Optional sans en abuser ?",
            "Quels avantages du Stream API par rapport aux boucles classiques ?",
            "Comment appliquer SOLID dans une architecture Java ?",
        ],
        "spring": [
            "Quand utiliser @Transactional et quels pieges courants ?",
            "Comment separer Controller / Service / Repository proprement ?",
            "Comment faire une gestion d erreurs globale avec @ControllerAdvice ?",
            "Comment securiser une API REST par role avec Spring Security ?",
            "Quelle strategie de cache adopter sans incoherence ?",
        ],
        "python": [
            "Quels pieges eviter avec les arguments mutables par defaut en Python ?",
            "Quand utiliser un generator plutot qu une liste ?",
            "Comment structurer un projet Python (virtualenv, requirements) ?",
            "Comment tester proprement avec pytest ?",
            "Comment utiliser des decorateurs pour factoriser du code ?",
        ],
        "javascript": [
            "Comment expliquer une closure JavaScript avec un exemple concret ?",
            "Difference entre callback, Promise et async/await ?",
            "Comment fonctionne l event loop ?",
            "Comment gerer this dans les callbacks ?",
            "Quand utiliser le prototype plutot qu une classe ES6 ?",
        ],
        "generic": [
            f"Quelles bonnes pratiques appliquer pour progresser en {theme} ?",
            f"Quelles erreurs frequentes faut-il eviter sur {theme} ?",
            f"Comment evaluer objectivement un bon resultat sur {theme} ?",
            f"Quelle methode pour structurer un apprentissage sur {theme} ?",
            f"Comment adapter {theme} pour un niveau debutant ?",
        ],
    }

    pool = list(banks.get(key, banks["generic"]))
    random.shuffle(pool)
    while len(pool) < nombre:
        pool.extend(banks.get(key, banks["generic"]))

    results: list[QuestionOut] = []
    for i in range(nombre):
        points = random.randint(1, 3)
        contenu = pool[i]
        if wanted_type in {"VF", "VRAI_FAUX"}:
            results.append(
                QuestionOut(
                    contenu=f"[{theme}] {contenu}",
                    type="VRAI_FAUX",
                    points=points,
                    theme=theme,
                    choix=[
                        {"texte": "Vrai", "correcte": True, "ordre": 1},
                        {"texte": "Faux", "correcte": False, "ordre": 2},
                    ],
                )
            )
            continue

        correct = "Identifier la cause racine, proposer une solution et valider avec tests."
        wrong = [
            "Appliquer un correctif sans verifier les effets de bord.",
            "Ignorer les cas limites pour gagner du temps.",
            "Reporter le probleme sans plan d action.",
        ]
        all_choices = [correct] + wrong
        random.shuffle(all_choices)
        choix = [{"texte": c, "correcte": c == correct, "ordre": idx + 1} for idx, c in enumerate(all_choices)]
        if wanted_type == "QCU":
            found = False
            for c in choix:
                if c["correcte"] and not found:
                    found = True
                else:
                    c["correcte"] = False

        results.append(
            QuestionOut(
                contenu=f"[{theme}] {contenu}",
                type=wanted_type if wanted_type in {"QCM", "QCU"} else "QCM",
                points=points,
                theme=theme,
                choix=choix,
            )
        )

    return results


def _load_seed_examples() -> list[dict]:
    examples = []
    for dataset_path in [EXPANDED_DATASET_PATH, SEED_DATASET_PATH]:
        if not dataset_path.exists():
            continue
        try:
            raw = json.loads(dataset_path.read_text(encoding="utf-8"))
            for item in raw:
                output_raw = item.get("output")
                parsed = json.loads(output_raw) if isinstance(output_raw, str) else output_raw
                if isinstance(parsed, dict):
                    examples.append(parsed)
        except Exception:
            continue
    return examples


def _theme_key(theme: str) -> str:
    normalized = re.sub(r"\s+", " ", str(theme or "").lower()).strip()
    normalized = normalized.replace("é", "e").replace("è", "e").replace("ê", "e")
    if "angular" in normalized:
        return "angular"
    if "javascript" in normalized or normalized == "js" or normalized.startswith("js "):
        return "javascript"
    if "spring" in normalized:
        return "spring"
    if "java" in normalized:
        return "java"
    if any(k in normalized for k in ["sql", "bdd", "database", "mysql", "postgres", "oracle", "mongodb"]):
        return "sql"
    if "python" in normalized:
        return "python"
    return "generic"


def _is_relevant_to_theme(req: GenerateRequest, questions: list[QuestionOut]) -> bool:
    key = _theme_key(req.theme)
    if key == "generic":
        return True
    signals = {
        "angular": ["angular", "component", "service", "rxjs", "typescript", "directive", "template"],
        "javascript": ["javascript", "js", "closure", "promise", "async", "await", "event loop", "prototype", "callback"],
        "java": ["java", "jvm", "jdk", "jre", "exception", "interface"],
        "sql": ["sql", "join", "index", "transaction", "requete", "database", "bdd"],
        "spring": ["spring", "spring boot", "transactional", "bean", "controller", "repository"],
        "python": ["python", "pandas", "decorateur", "virtualenv"],
    }
    text_blob = " ".join(str(q.contenu or "").lower() for q in questions)
    return any(token in text_blob for token in signals.get(key, []))


def _is_generic_response(req: GenerateRequest, questions: list[QuestionOut]) -> bool:
    theme_info = _get_theme_info(req.theme)
    if not theme_info:
        return False
    keywords = theme_info.get("good_questions_keywords", [])
    if not keywords:
        return False
    all_text = " ".join(q.contenu.lower() for q in questions if q.contenu)
    keyword_hits = sum(1 for kw in keywords if kw.lower() in all_text)
    average_hits_per_question = keyword_hits / max(1, len(questions))
    if average_hits_per_question < 0.3:
        return True
    vague_terms = ["define", "définis", "explique", "c'est quoi", "qu'est-ce que c'est", "liste les", "enumere"]
    vague_count = sum(1 for term in vague_terms if term in all_text)
    return vague_count > len(questions) / 2


def _generate_job_questions(req: GenerateRequest) -> list[QuestionOut]:
    external_questions = _call_external_provider(req, retry=False)
    if external_questions:
        if _is_relevant_to_theme(req, external_questions) and not _is_generic_response(req, external_questions):
            return external_questions

        retry_questions = _call_external_provider(req, retry=True)
        if retry_questions and not _is_generic_response(req, retry_questions):
            return retry_questions

        raise HTTPException(
            status_code=400,
            detail="Erreur IA (?): Le service IA a renvoye une reponse trop generique apres nouvelle tentative. Veuillez preciser le theme (ex: index SQL, transactions, JOIN).",
        )

    # Fallback local (no external provider). Keeps the app usable offline.
    return _thematic_fallback_generate(req)


@app.post("/generate", response_model=list[QuestionOut])
def generate(req: GenerateRequest):
    try:
        return _generate_job_questions(req)
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(500, f"Erreur de génération: {ex}")


@app.post("/questions/entretien/{entretien_id}/ai-generate", response_model=list[QuestionOut])
def generate_for_entretien(entretien_id: int, payload: dict = Body(...)):
    try:
        categorie = str(payload.get("categorie", "TECHNIQUE")).strip().upper()
        domaine_map = {
            "TECHNIQUE": "INFORMATIQUE",
            "RH": "BUSINESS",
            "MANAGERIAL": "BUSINESS",
            "FINAL": "BUSINESS",
            "PRESELECTION": "BUSINESS",
            "TEST": "INFORMATIQUE",
        }
        domaine = domaine_map.get(categorie, "INFORMATIQUE")

        req = GenerateRequest(
            domaine=domaine,
            categorie=categorie,
            niveau=str(payload.get("niveau", "Intermediate")).strip(),
            type=str(payload.get("type", "QCM")).strip().upper(),
            theme=str(payload.get("theme", "")).strip(),
            nombre=int(payload.get("nombre", 3)),
            temperature=float(payload.get("temperature", 0.7)),
        )
        return _generate_job_questions(req)
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(400, f"Erreur: {str(ex)}")


@app.get("/health")
def health():
    seed_count = len(_load_seed_examples())
    return {
        "status": "ok",
        "device": DEVICE,
        "mode": "external" if AI_PROVIDER in {"huggingface", "hf", "external"} and HF_API_URL else "fallback",
        "provider": AI_PROVIDER,
        "external_api": HF_API_URL or None,
        "seed_examples": seed_count,
        "dataset_dir": str(data_dir),
        "model_files": {
            "vocab_exists": VOCAB_PATH.exists(),
            "weights_exists": MODEL_PATH.exists(),
        },
    }

