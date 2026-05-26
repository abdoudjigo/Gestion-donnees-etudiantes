-- ============================================================
-- SCHEMA.SQL
-- Exécuter : psql -U postgres -d votre_base -f schema.sql
-- ============================================================

DROP TABLE IF EXISTS notes     CASCADE;
DROP TABLE IF EXISTS matieres  CASCADE;
DROP TABLE IF EXISTS etudiants CASCADE;
DROP TABLE IF EXISTS classes   CASCADE;

-- Classes
CREATE TABLE classes (
    id         SERIAL PRIMARY KEY,
    nom_classe VARCHAR(50) NOT NULL UNIQUE
);

-- Étudiants
CREATE TABLE etudiants (
    id             SERIAL PRIMARY KEY,
    code           VARCHAR(10)  NOT NULL,
    numero         VARCHAR(20)  NOT NULL UNIQUE,
    nom            VARCHAR(100) NOT NULL,
    prenom         VARCHAR(100) NOT NULL,
    date_naissance DATE,
    classe_id      INTEGER REFERENCES classes(id),
    source         VARCHAR(10)  NOT NULL DEFAULT 'DB' CHECK (source IN ('DB','JSON')),
    archived       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    DEFAULT NOW()
);

-- Matières
CREATE TABLE matieres (
    id          SERIAL PRIMARY KEY,
    nom_matiere VARCHAR(100) NOT NULL UNIQUE
);

-- Notes (devoirs + examens)
-- type_evaluation : 'devoir' | 'examen'
CREATE TABLE notes (
    id              SERIAL PRIMARY KEY,
    etudiant_id     INTEGER      NOT NULL REFERENCES etudiants(id) ON DELETE CASCADE,
    matiere_id      INTEGER      NOT NULL REFERENCES matieres(id)  ON DELETE CASCADE,
    nom_evaluation  VARCHAR(100) NOT NULL,
    type_evaluation VARCHAR(10)  NOT NULL CHECK (type_evaluation IN ('devoir','examen')),
    valeur          NUMERIC(5,2) NOT NULL CHECK (valeur >= 0 AND valeur <= 20),
    created_at      TIMESTAMP    DEFAULT NOW(),
    UNIQUE (etudiant_id, matiere_id, nom_evaluation)
);

CREATE INDEX idx_etudiants_numero   ON etudiants(numero);
CREATE INDEX idx_etudiants_archived ON etudiants(archived);
CREATE INDEX idx_notes_etudiant     ON notes(etudiant_id);
CREATE INDEX idx_notes_matiere      ON notes(matiere_id);

-- Classes initiales (à adapter selon votre JSON)
INSERT INTO classes (nom_classe) VALUES
    ('DEV101'),('DEV102'),('DEV201'),('DEV202')
ON CONFLICT DO NOTHING;

-- Matières initiales
INSERT INTO matieres (nom_matiere) VALUES
    ('Algorithmique'),('Python'),('Base de données'),
    ('Réseaux'),('Systèmes'),('Mathématiques'),('Anglais'),('Projet')
ON CONFLICT DO NOTHING;