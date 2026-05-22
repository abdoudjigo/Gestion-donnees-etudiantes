
-- TABLE : classes
-- ============================================================
CREATE TABLE classes (
    id          SERIAL PRIMARY KEY,
    nom_classe  VARCHAR UNIQUE NOT NULL
);

-- TABLE : matieres
-- ============================================================
CREATE TABLE matieres (
    id          SERIAL PRIMARY KEY,
    nom_matiere VARCHAR UNIQUE NOT NULL
);

-- TABLE : etudiants
-- ============================================================
CREATE TABLE etudiants (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR UNIQUE NOT NULL,
    numero          VARCHAR UNIQUE NOT NULL,
    nom             VARCHAR NOT NULL,
    prenom          VARCHAR NOT NULL,
    date_naissance  DATE,
    classe_id       INTEGER REFERENCES classes(id),
    archived        BOOLEAN DEFAULT false,
    source          VARCHAR(10) DEFAULT 'DB',
    CHECK (source IN ('DB', 'JSON'))
);

-- TABLE : classe_matieres  (relation classe ↔ matière)
-- ============================================================
CREATE TABLE classe_matieres (
    classe_id   INTEGER REFERENCES classes(id),
    matiere_id  INTEGER REFERENCES matieres(id),
    PRIMARY KEY (classe_id, matiere_id)
);

-- TABLE : notes
-- ============================================================
CREATE TABLE notes (
    id              SERIAL PRIMARY KEY,
    etudiant_id     INTEGER REFERENCES etudiants(id),
    matiere_id      INTEGER REFERENCES matieres(id),
    nom_evaluation  VARCHAR NOT NULL,
    type_evaluation VARCHAR(20),
    valeur          NUMERIC(5,2),
    date_evaluation DATE,
    CHECK (type_evaluation IN ('devoir', 'examen'))
);

