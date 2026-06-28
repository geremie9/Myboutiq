-- ============================================
-- EXTENSION SCHEMA: NOTIFICATIONS SMS
-- ============================================

-- TABLE: configurations_sms (API keys et settings)
CREATE TABLE configurations_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE UNIQUE,
  fournisseur VARCHAR(50) DEFAULT 'orange', -- 'orange', 'moov', 'mtn', 'twilio'
  api_key VARCHAR(500),
  api_secret VARCHAR(500),
  sender_id VARCHAR(20) DEFAULT 'MYBOUTIQ',
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: sms_logs (historique SMS envoyés)
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  numero_telephone VARCHAR(20) NOT NULL,
  type_sms VARCHAR(50), -- 'confirmation_credit', 'rappel_paiement', 'alerte_stock', 'recu_vente'
  contenu TEXT,
  statut VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  reponse_client VARCHAR(10), -- 'OUI', 'NON', 'NULL'
  reference_externe VARCHAR(100), -- ID du fournisseur SMS
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: confirmations_credit (Suivi confirmations SMS)
CREATE TABLE confirmations_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  montant DECIMAL(10,2) NOT NULL,
  sms_log_id UUID REFERENCES sms_logs(id),
  code_verification VARCHAR(6),
  statut VARCHAR(20) DEFAULT 'en_attente', -- 'en_attente', 'confirmé', 'rejeté', 'expiré'
  tentatives INTEGER DEFAULT 0,
  expire_at TIMESTAMP,
  confirme_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEX PERFORMANCE
-- ============================================
CREATE INDEX idx_sms_logs_boutique ON sms_logs(boutique_id);
CREATE INDEX idx_sms_logs_client ON sms_logs(client_id);
CREATE INDEX idx_sms_logs_statut ON sms_logs(statut);
CREATE INDEX idx_confirmations_client ON confirmations_credit(client_id);
CREATE INDEX idx_confirmations_statut ON confirmations_credit(statut);
CREATE INDEX idx_confirmations_code ON confirmations_credit(code_verification);

-- ============================================
-- VIEWS
-- ============================================

-- Vue: SMS en attente de confirmation
CREATE VIEW sms_en_attente AS
SELECT 
  c.id,
  c.boutique_id,
  c.client_id,
  c.montant,
  c.statut,
  s.numero_telephone,
  s.type_sms,
  c.created_at,
  c.expire_at,
  CASE 
    WHEN c.expire_at < NOW() THEN 'expiré'
    ELSE 'actif'
  END as validite
FROM confirmations_credit c
LEFT JOIN sms_logs s ON c.sms_log_id = s.id
WHERE c.statut = 'en_attente';

-- Vue: Taux de confirmation SMS
CREATE VIEW sms_confirmation_stats AS
SELECT 
  boutique_id,
  COUNT(*) as total_sms_envoyes,
  SUM(CASE WHEN statut = 'confirmé' THEN 1 ELSE 0 END) as confirmations,
  SUM(CASE WHEN statut = 'rejeté' THEN 1 ELSE 0 END) as rejets,
  SUM(CASE WHEN statut = 'expiré' THEN 1 ELSE 0 END) as expires,
  ROUND(100.0 * SUM(CASE WHEN statut = 'confirmé' THEN 1 ELSE 0 END) / COUNT(*), 2) as taux_confirmation_pct
FROM confirmations_credit
GROUP BY boutique_id;
