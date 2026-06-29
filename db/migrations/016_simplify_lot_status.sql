-- Migration 016 : simplification de la machine d'états des lots
-- Réduit les 8 états à 3 états fonctionnels + 1 état système :
--   en_attente  → lot créé par pipeline, en attente d'ouverture humaine
--   en_traitement → lot ouvert (auto à l'ouverture), en révision humaine
--   integre       → lot intégré au corpus (terminal)
--   erreur        → échec pipeline (système uniquement)
--
-- IMPORTANT : à exécuter via phpMyAdmin AVANT tout déploiement de code.

UPDATE lots
   SET status = 'en_traitement'
 WHERE status IN ('en_cours', 'en_revision', 'a_reprendre', 'pret');

UPDATE documents
   SET status = 'en_traitement'
 WHERE status IN ('en_cours', 'en_revision', 'a_reprendre', 'pret');
