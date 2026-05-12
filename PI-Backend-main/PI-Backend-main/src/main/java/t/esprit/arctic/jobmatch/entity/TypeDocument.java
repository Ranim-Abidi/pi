package t.esprit.arctic.jobmatch.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TypeDocument {

    CV("CV"),
    LETTRE_DE_MOTIVATION("LETTRE_DE_MOTIVATION"),
    PORTFOLIO("PORTFOLIO"),
    AUTRE("AUTRE");

    private final String value;

    TypeDocument(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TypeDocument fromValue(String value) {
        for (TypeDocument type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Type de document inconnu : " + value);
    }
}