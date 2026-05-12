# Copied from jove/src/prepare_dataset.py (dataset augmentation)
import json
import os
import random
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

DEFAULT_DATA_DIR = os.getenv("QUESTIONS_DATA_DIR", "").strip()
if DEFAULT_DATA_DIR:
    data_dir = Path(DEFAULT_DATA_DIR)
else:
    data_dir = (
        Path(r"C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove\src\app\Nesrineai\data")
    )

SEED_PATH = data_dir / "questions.json"
OUT_PATH = data_dir / "questions_expanded.json"

LEVELS = ["Junior", "Intermediate", "Senior", "Expert"]

THEME_VARIANTS = {
    "React hooks": ["React hooks", "React fundamentals", "React performance", "React state management"],
    "Java POO": ["Java POO", "Java classes", "Java inheritance", "Java polymorphism"],
    "Leadership": ["Leadership", "Leadership agile", "Management d'equipe", "Collaboration"],
}

QUESTION_PREFIXES = [
    "Parmi les propositions,",
    "Dans ce contexte,",
    "Au quotidien,",
    "En entretien technique,",
    "En pratique,",
]


def parse_input(input_text: str) -> dict:
    fields = {
        "domaine": "INFORMATIQUE",
        "categorie": "TECHNIQUE",
        "niveau": "Intermediate",
        "type": "QCM",
        "theme": "general",
    }
    for chunk in input_text.split("|"):
        if ":" not in chunk:
            continue
        key, value = chunk.split(":", 1)
        key = key.strip().lower()
        value = value.strip()
        if key in fields:
            fields[key] = value
    return fields


def normalize_choices(question_type: str, choices: list[dict]) -> list[dict]:
    if question_type == "VF":
        return [
            {"texte": "Vrai", "correcte": any(c.get("correcte") for c in choices[:1]), "ordre": 1},
            {"texte": "Faux", "correcte": any(c.get("correcte") for c in choices[1:2]), "ordre": 2},
        ]

    cleaned = []
    for idx, c in enumerate(choices, start=1):
        text = str(c.get("texte", "")).strip()
        if text:
            cleaned.append({"texte": text, "correcte": bool(c.get("correcte", False)), "ordre": idx})

    if not cleaned:
        cleaned = [
            {"texte": "Option A", "correcte": True, "ordre": 1},
            {"texte": "Option B", "correcte": False, "ordre": 2},
        ]

    if not any(c["correcte"] for c in cleaned):
        cleaned[0]["correcte"] = True

    if question_type == "QCU":
        first_correct_found = False
        for choice in cleaned:
            if choice["correcte"] and not first_correct_found:
                first_correct_found = True
            else:
                choice["correcte"] = False

    return cleaned


def reorder_choices(question_type: str, choices: list[dict]) -> list[dict]:
    if question_type == "VF":
        return normalize_choices(question_type, choices)

    shuffled = choices[:]
    random.shuffle(shuffled)
    for idx, c in enumerate(shuffled, start=1):
        c["ordre"] = idx
    return normalize_choices(question_type, shuffled)


def paraphrase_question(text: str) -> str:
    prefix = random.choice(QUESTION_PREFIXES)
    stripped = text.strip()
    if stripped.endswith("?"):
        stripped = stripped[:-1]
    return f"{prefix} {stripped} ?"


def make_augmented_examples(seed_rows: list[dict], per_seed: int = 120) -> list[dict]:
    rows = []

    for row in seed_rows:
        fields = parse_input(row["input"])
        output_obj = json.loads(row["output"]) if isinstance(row.get("output"), str) else row["output"]

        base_type = str(output_obj.get("type") or fields["type"]).upper()
        base_theme = str(output_obj.get("theme") or fields["theme"])
        base_choices = normalize_choices(base_type, output_obj.get("choix") or [])

        rows.append({"input": row["input"], "output": json.dumps(output_obj, ensure_ascii=False)})

        themes = THEME_VARIANTS.get(base_theme, [base_theme, f"{base_theme} avancé", f"{base_theme} pratique"])

        for _ in range(per_seed):
            level = random.choice(LEVELS)
            theme = random.choice(themes)

            output_variant = {
                "contenu": paraphrase_question(str(output_obj.get("contenu", "Question"))),
                "type": base_type,
                "points": random.randint(2, 10),
                "theme": theme,
                "choix": reorder_choices(base_type, [dict(c) for c in base_choices]),
            }

            input_variant = (
                f"domaine:{fields['domaine']} | "
                f"categorie:{fields['categorie']} | "
                f"niveau:{level} | "
                f"type:{base_type} | "
                f"theme:{theme}"
            )

            rows.append({"input": input_variant, "output": json.dumps(output_variant, ensure_ascii=False)})

    unique = {}
    for row in rows:
        unique[f"{row['input']}||{row['output']}"] = row

    return list(unique.values())


def main():
    random.seed(42)

    if not SEED_PATH.exists():
        raise FileNotFoundError(f"Dataset seed introuvable: {SEED_PATH}")

    seed_rows = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    expanded = make_augmented_examples(seed_rows, per_seed=140)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(expanded, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Seed rows: {len(seed_rows)}")
    print(f"Expanded rows: {len(expanded)}")
    print(f"Wrote: {OUT_PATH}")


if __name__ == "__main__":
    main()

