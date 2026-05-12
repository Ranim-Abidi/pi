package t.esprit.arctic.jobmatch.entity;

public enum NiveauOrdre {
    DEBUTANT,
    INTERMEDIAIRE,
    AVANCE,
    EXPERT;

    /**
     * @return true si c'est le niveau débutant
     */
    public boolean isFirst() {
        return this == DEBUTANT;
    }

    /**
     * @return true si c'est le dernier niveau (Expert)
     */
    public boolean isLast() {
        return this == EXPERT;
    }

    /**
     * Retourne le niveau suivant dans la progression.
     * @return le niveau suivant, ou null si c'est le dernier niveau (Expert)
     */
    public NiveauOrdre suivant() {
        return switch (this) {
            case DEBUTANT      -> INTERMEDIAIRE;
            case INTERMEDIAIRE -> AVANCE;
            case AVANCE        -> EXPERT;
            case EXPERT        -> null;
        };
    }

    /**
     * Seuil de réussite (%) par niveau.
     * Débutant=50%, Intermédiaire=60%, Avancé=70%, Expert=80%
     */
    public int seuilReussite() {
        return switch (this) {
            case DEBUTANT      -> 50;
            case INTERMEDIAIRE -> 60;
            case AVANCE        -> 70;
            case EXPERT        -> 80;
        };
    }


    /**
     * Libellé lisible du niveau (en français).
     */
    public String toNiveauLabel() {
        return switch (this) {
            case DEBUTANT      -> "Débutant";
            case INTERMEDIAIRE -> "Intermédiaire";
            case AVANCE        -> "Avancé";
            case EXPERT        -> "Expert";
        };
    }

    /**
     * Convertit un label Formation.niveau vers NiveauOrdre.
     */
    public static NiveauOrdre fromLabel(String label) {
        if (label == null) return DEBUTANT;
        return switch (label.trim()) {
            case "Débutant"       -> DEBUTANT;
            case "Intermédiaire"  -> INTERMEDIAIRE;
            case "Avancé"         -> AVANCE;
            case "Expert"         -> EXPERT;
            default               -> DEBUTANT;
        };
    }
}
