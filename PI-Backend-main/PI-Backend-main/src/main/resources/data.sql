-- Insert test data for development
-- Password is 'password' hashed with BCrypt

-- Insert a test recruiter
INSERT INTO utilisateurs (nom, email, mot_de_passe, role, actif, date_creation, dtype) VALUES
    ('Test Recruteur', 'recruteur@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'RECRUTEUR', true, NOW(), 'RECRUTEUR');

SET @recruteur_id = LAST_INSERT_ID();

INSERT INTO recruteur (id, entreprise, poste, secteur) VALUES
    (@recruteur_id, 'Tech Corp', 'HR Manager', 'Technology');

INSERT INTO utilisateurs (nom, email, mot_de_passe, role, actif, date_creation, dtype) VALUES
    ('Test Candidat', 'candidat@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CANDIDAT', true, NOW(), 'CANDIDAT');

SET @candidat_id = LAST_INSERT_ID();

INSERT INTO candidat (id, prenom, telephone, niveau_etude) VALUES
    (@candidat_id, 'Jean', '+33123456789', 'Master');

-- Insert competences
INSERT IGNORE INTO competence (nom, niveau, type) VALUES
    ('Java', 'Intermédiaire', 'Technical'),
    ('JavaScript', 'Avancé', 'Technical'),
    ('Python', 'Intermédiaire', 'Technical'),
    ('React', 'Avancé', 'Technical'),
    ('Angular', 'Intermédiaire', 'Technical'),
    ('Spring Boot', 'Intermédiaire', 'Technical'),
    ('SQL', 'Avancé', 'Technical'),
    ('MongoDB', 'Intermédiaire', 'Technical'),
    ('Docker', 'Débutant', 'Technical'),
    ('Kubernetes', 'Débutant', 'Technical'),
    ('AWS', 'Intermédiaire', 'Technical'),
    ('Git', 'Avancé', 'Technical'),
    ('REST API', 'Avancé', 'Technical'),
    ('GraphQL', 'Intermédiaire', 'Technical'),
    ('TypeScript', 'Intermédiaire', 'Technical'),
    ('HTML/CSS', 'Avancé', 'Technical'),
    ('Communication', 'Avancé', 'Soft'),
    ('Teamwork', 'Avancé', 'Soft'),
    ('Problem Solving', 'Avancé', 'Soft'),
    ('Project Management', 'Intermédiaire', 'Soft'),
    ('Leadership', 'Intermédiaire', 'Soft'),
    ('Adaptability', 'Avancé', 'Soft'),
    ('Critical Thinking', 'Avancé', 'Soft'),
    ('Time Management', 'Avancé', 'Soft'),
    ('Agile', 'Intermédiaire', 'Soft'),
    ('Scrum', 'Intermédiaire', 'Soft'),
    ('User Interface Design', 'Intermédiaire', 'Technical'),
    ('Machine Learning', 'Débutant', 'Technical'),
    ('Data Analysis', 'Intermédiaire', 'Technical'),
    ('Microservices', 'Intermédiaire', 'Technical');

