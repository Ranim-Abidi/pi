-- Aligne domaine sur VARCHAR : les noms d'enum (ex. COMMUNICATION, INFORMATIQUE) dépassent souvent un ENUM/VARCHAR MySQL trop court.
ALTER TABLE entretiens MODIFY COLUMN domaine VARCHAR(64) NULL;
-- Tests généraux sans seuil
ALTER TABLE entretiens MODIFY COLUMN seuil_reussite INT NULL;

-- Messagerie bidirectionnelle (recruteur <-> candidat)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_email VARCHAR(255) NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255) NULL;

-- Allow NULL sender_id for system notifications (profile incomplete, etc.)
ALTER TABLE notifications MODIFY COLUMN sender_id BIGINT NULL;

-- Create candidat_competence join table for many-to-many relationship
CREATE TABLE IF NOT EXISTS candidat_competence (
  candidat_id BIGINT NOT NULL,
  competence_id BIGINT NOT NULL,
  PRIMARY KEY (candidat_id, competence_id),
  FOREIGN KEY (candidat_id) REFERENCES candidat(id) ON DELETE CASCADE,
  FOREIGN KEY (competence_id) REFERENCES competence(id) ON DELETE CASCADE
);

