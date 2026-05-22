
-- CLASSES
-- ============================================================
INSERT INTO classes (nom_classe) VALUES
    ('6emeA'),
    ('6emeB'),
    ('4emeA'),
    ('4emeB'),
    ('3emeC');

-- MATIERES
-- ============================================================
INSERT INTO matieres (nom_matiere) VALUES
    ('Math'),
    ('Francais'),
    ('Anglais'),
    ('PC'),
    ('SVT'),
    ('HG');


-- ============================================================
-- CLASSE_MATIERES
-- Toutes les classes ont les mêmes 6 matières
-- ============================================================
INSERT INTO classe_matieres (classe_id, matiere_id)
SELECT c.id, m.id
FROM classes c
CROSS JOIN matieres m;


-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'classes'        AS table_name, COUNT(*) AS total FROM classes
UNION ALL
SELECT 'matieres',       COUNT(*) FROM matieres
UNION ALL
SELECT 'classe_matieres', COUNT(*) FROM classe_matieres;