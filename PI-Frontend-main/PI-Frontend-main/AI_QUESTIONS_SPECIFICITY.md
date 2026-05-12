# Système de Génération de Questions IA - Assurance de Spécificité

## Vue d'ensemble

Ce système assure que les questions générées par l'IA sont **pertinentes et spécifiques** au thème proposé par le recruteur, et non des réponses génériques.

## Problème Résolu

**Avant:** Un recruteur propose un simple mot-clé "SQL" → L'IA génère des questions trop génériques
**Après:** Le système détecte et retire automatiquement les questions génériques avec retry intelligent

## Architecture

### 1. Mapping de Thèmes Spécifiques (`THEME_SPECIFICS`)

Chaque thème reconnnu a :
- **keywords**: Termes techniques à inclure dans le prompt
- **good_questions_keywords**: Critères pour valider la spécificité
- **examples**: Questions d'exemple pour le thème

```python
THEME_SPECIFICS = {
    "sql": {
        "keywords": ["sql", "join", "index", "transaction", ...],
        "good_questions_keywords": ["index", "join", "transaction", ...],
        "examples": [
            "Quand choisir INNER JOIN ou LEFT JOIN...",
            "Comment indexer une table pour accelerer...",
            ...
        ]
    },
    # ... autres thèmes: angular, java, python, spring
}
```

### 2. Amélioration du Prompt

**Avant (générique):**
```
Tu es un expert en conception de questions d'entretien.
Genere UNIQUEMENT un JSON valide...
[prompt basique]
```

**Après (enrichi):**
```
Tu es un expert en conception de questions d'entretien.
[prompt basique]
IMPORTANT - Theme specifique 'SQL':
Les questions DOIVENT contenir au moins l'un de ces termes: index, join, transaction...
Exemples de bonnes questions:
  - Quand choisir INNER JOIN ou LEFT JOIN...
  - Comment indexer une table...
Genere des questions au MEME NIVEAU de specificite...
```

### 3. Détection de Généricité

Fonction `_is_generic_response(req, questions) -> bool`:

**Critères de généricité:**
1. **Ratio keywords manquant:** < 0.3 hits par question en moyenne
   - Ex: 3 questions doivent avoir au minimum 1 keyword du thème
2. **Trop de termes vagues:** > 50% des questions contiennent "define", "explain", etc.

**Exemple:**
```
Theme: SQL
Questions générées:
  1. "What is a database?" → ❌ Pas de keywords (définition vague)
  2. "What is a table?" → ❌ Pas de keywords
  3. "Explain SQL syntax" → ❌ Pas de keywords

Résultat: 0/3 keywords = 0.0 hits/question → GÉNÉRIQUE DÉTECTÉ
```

### 4. Logique Retry Intelligente

Dans `_generate_job_questions()`:

```
1. TENTATIVE 1 (prompt normal enrichi)
   └─ Vraies questions pertinentes?
      ├─ OUI + pas générique → Retourner ✅
      └─ NON ou générique → Aller à 2

2. TENTATIVE 2 (prompt STRICT avec retry=True)
   └─ Le prompt ajoute:
      "CRITICAL: La reponse precedente etait trop generique...
       Chaque question DOIT contenir du vocabulaire technique pointu..."
   └─ Pas générique?
      ├─ OUI → Retourner ✅
      └─ NON → Aller à 3

3. ERREUR UTILISATEUR (HTTP 400)
   └─ Message: "Le service IA a renvoye une reponse trop generique
               apres nouvelle tentative. Veuillez preciser le theme
               (ex: index SQL, transactions, JOIN)."
   └─ Frontend: Affiche en rouge dans le chatbot
```

## Code Source

### Backend (`src/api.py`)

**Nouvelles fonctions:**
- `_get_theme_key_for_specifics(theme)` - Normalise le thème
- `_get_theme_info(theme)` - Récupère les keywords/examples
- `_build_theme_specific_prompt(req)` - Enrichit le prompt
- `_is_generic_response(req, questions)` - Détecte généricité

**Fonctions modifiées:**
- `_build_external_generation_prompt(req, retry=False)` - Support du mode strict
- `_call_external_provider(req, retry=False)` - Passe retry aux providers
- `_generate_job_questions(req)` - Implémente la logique retry

### Frontend (`rd-add-questions.ts`)

**Aucun changement requis** - Le système utilise la gestion d'erreur existante:
```typescript
error: (error) => {
  const backendMessage = error?.error?.detail || error?.message;
  this.aiError = `Erreur IA (${status}): ${backendMessage}`;
  this.addChatMessage('assistant', this.aiError);
}
```

## Extension pour Nouveaux Thèmes

Pour ajouter un nouveau thème "MongoDB":

```python
THEME_SPECIFICS = {
    # ... thèmes existants ...
    "mongodb": {
        "keywords": ["mongodb", "collection", "document", "aggregation", "index"],
        "good_questions_keywords": ["aggregation", "indexing", "sharding", "replication", "transactions"],
        "examples": [
            "Quand utiliser aggregation pipeline plutôt qu'une requete simple?",
            "Comment indexer une collection MongoDB pour optimiser les queries?",
            "Quelles sont les avantages et limites du sharding dans MongoDB?",
        ]
    }
}
```

## Testing

### Tester le système manuellement:

1. Proposer un thème vague: "base de données"
   → Devrait retry avec prompt strict
   → Ou retourner erreur si trop vague

2. Proposer spécifique: "index SQL"
   → Devrait générer questions spécifiques directement

3. Vérifier logs:
   - Nombre de keywords détectés dans les questions
   - Ratio généricité calculé
   - Si retry=True a été déclenché

### Tester avec différents providers:

- GROQ (défaut recommandé - meilleur qualité)
- HuggingFace (fallback)

Variable d'env: `AI_QUESTION_PROVIDER=groq` ou `huggingface`

## Performance & Déploiement

**Impact sur la latence:**
- Première tentative échoue: +N secondes (timeout provider + retry)
- Fréquence estimée: ~10-20% des requêtes (questions trop vagues)

**Recommendation:** Augmenter `HF_TIMEOUT` si beaucoup de retries:
```python
HF_TIMEOUT = max(5, int(os.getenv("HF_TIMEOUT", "90")))  # Défaut 60s → 90s
```

## Limitation Connues

1. **Détection de genericité basée sur keywords:**
   - Fonctionne bien pour thèmes spécialisés (SQL, Angular)
   - Moins précis pour thèmes larges (Business, Leadership)

2. **Retry 2x seulement:**
   - Au-delà: erreur utilisateur pour pas surcharger les APIs
   - Recruteur doit préciser le thème

3. **Languages supportés:**
   - Prompt et keywords en français
   - Questions attendues en français par défaut

## Futur Améliorations

- [ ] ML-based genericity detection (au lieu de regex + keywords)
- [ ] Feedback utilisateur: "Cette question n'est pas pertinente" → Fine-tuning
- [ ] Thèmes personnalisés par organisation
- [ ] Cache des meilleures générations par (theme, niveau, type)
