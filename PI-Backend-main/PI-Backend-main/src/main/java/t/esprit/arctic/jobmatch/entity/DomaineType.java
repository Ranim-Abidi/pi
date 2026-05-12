package t.esprit.arctic.jobmatch.entity;

import java.text.Normalizer;

public enum DomaineType {
    INFORMATIQUE("Informatique"),
    BUSINESS("Business"),
    SANTE("Santé"),
    INGENIERIE("Ingénierie"),
    EDUCATION("Éducation"),
    DESIGN("Design"),
    COMMUNICATION("Communication"),
    INDUSTRIE("Industrie"),
    COMMERCE("Commerce"),
    AUTRE("Autre");

    private final String label;

    DomaineType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static DomaineType fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Domaine est requis");
        }
        String normalizedInput = normalize(value);
        for (DomaineType dt : values()) {
            if (dt.name().equalsIgnoreCase(normalizedInput) || normalize(dt.label).equalsIgnoreCase(normalizedInput)) {
                return dt;
            }
        }
        throw new IllegalArgumentException("Domaine invalide: " + value);
    }

    private static String normalize(String input) {
        if (input == null) return null;
        String normalized = Normalizer.normalize(input.trim().toUpperCase(), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "");
    }
}
