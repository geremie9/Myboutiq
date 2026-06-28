-- ============================================
-- EXTENSION SCHEMA: CONFIRMATIONS PAIEMENT MOBILE MONEY
-- ============================================

-- TABLE: confirmations_paiement_mm (Codes de paiement à la porte)
CREATE TABLE confirmations_paiement_mm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  code_paiement VARCHAR(6) NOT NULL UNIQUE,
  statut VARCHAR(20) DEFAULT 'en_attente', -- 'en_attente', 'confirmé', 'expiré', 'annulé'
  expire_at TIMESTAMP NOT NULL,
  confirme_at TIMESTAMP,
  tentatives_verification INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: paiements_mm_logs (Historique complet des paiements MM)
CREATE TABLE paiements_mm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  confirmation_id UUID NOT NULL REFERENCES confirmations_paiement_mm(id) ON DELETE CASCADE,
  client_telephone VARCHAR(20),
  montant DECIMAL(10,2),
  statut_paiement VARCHAR(50), -- 'initié', 'en_cours', 'confirmé', 'échoué'
  reference_operateur VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MODIFICATIONS SCHEMA EXISTANT
-- ============================================

-- Ajouter colonne statut à transactions (si pas déjà là)
-- ALTER TABLE transactions ADD COLUMN statut VARCHAR(20) DEFAULT 'completed';

-- Ajouter colonne numero_reference à transactions (si pas déjà là)
-- ALTER TABLE transactions ADD COLUMN numero_reference VARCHAR(100);

-- ============================================
-- INDEX PERFORMANCE
-- ============================================
CREATE INDEX idx_confirmations_mm_boutique ON confirmations_paiement_mm(boutique_id);
CREATE INDEX idx_confirmations_mm_transaction ON confirmations_paiement_mm(transaction_id);
CREATE INDEX idx_confirmations_mm_code ON confirmations_paiement_mm(code_paiement);
CREATE INDEX idx_confirmations_mm_statut ON confirmations_paiement_mm(statut);
CREATE INDEX idx_paiements_mm_logs_boutique ON paiements_mm_logs(boutique_id);
CREATE INDEX idx_paiements_mm_logs_confirmation ON paiements_mm_logs(confirmation_id);

-- ============================================
-- VIEWS UTILES
-- ============================================

-- Vue: Codes de paiement en attente
CREATE VIEW codes_paiement_en_attente AS
SELECT 
  c.id,
  c.boutique_id,
  c.code_paiement,
  c.expire_at,
  t.montant_total,
  t.created_at as transaction_time,
  CASE 
    WHEN c.expire_at < NOW() THEN 'expiré'
    ELSE 'actif'
  END as validite,
  EXTRACT(EPOCH FROM (c.expire_at - NOW())) as secondes_restantes
FROM confirmations_paiement_mm c
LEFT JOIN transactions t ON c.transaction_id = t.id
WHERE c.statut = 'en_attente'
ORDER BY c.expire_at ASC;

-- Vue: Statistiques paiements Mobile Money
CREATE VIEW stats_paiements_mm AS
SELECT 
  boutique_id,
  DATE(created_at) as date,
  COUNT(*) as total_codes_generes,
  SUM(CASE WHEN statut = 'confirmé' THEN 1 ELSE 0 END) as codes_confirmes,
  SUM(CASE WHEN statut = 'expiré' THEN 1 ELSE 0 END) as codes_expires,
  SUM(CASE WHEN statut = 'en_attente' THEN 1 ELSE 0 END) as codes_en_attente,
  ROUND(100.0 * SUM(CASE WHEN statut = 'confirmé' THEN 1 ELSE 0 END) / COUNT(*), 2) as taux_reussite_pct,
  SUM(CASE WHEN statut = 'confirmé' THEN (SELECT montant_total FROM transactions WHERE id = confirmations_paiement_mm.transaction_id) ELSE 0 END) as montant_total_confirme
FROM confirmations_paiement_mm
GROUP BY boutique_id, DATE(created_at);

-- Vue: Vue détaillée paiements MM confirmés
CREATE VIEW paiements_mm_confirmes AS
SELECT 
  c.id,
  c.boutique_id,
  c.code_paiement,
  t.id as transaction_id,
  t.montant_total,
  t.vendeur_id,
  v.nom as vendeur_nom,
  c.created_at,
  c.confirme_at,
  EXTRACT(EPOCH FROM (c.confirme_at - c.created_at)) as temps_confirmation_secondes
FROM confirmations_paiement_mm c
LEFT JOIN transactions t ON c.transaction_id = t.id
LEFT JOIN vendeurs v ON t.vendeur_id = v.id
WHERE c.statut = 'confirmé'
ORDER BY c.confirme_at DESC;
