-- ============================================
-- EXTENSION SCHEMA: GESTION DU CRÉDIT
-- ============================================

-- TABLE: clients (pour crédit)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom VARCHAR(150) NOT NULL,
  telephone VARCHAR(20),
  email VARCHAR(100),
  adresse TEXT,
  limite_credit DECIMAL(10,2) DEFAULT 0,
  solde_credit DECIMAL(10,2) DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'actif', -- 'actif', 'suspendu', 'fermé'
  date_inscription TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: mouvements_credit (historique crédit)
CREATE TABLE mouvements_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL, -- 'achat' (dette +), 'paiement' (dette -), 'remise', 'interet'
  montant DECIMAL(10,2) NOT NULL,
  solde_avant DECIMAL(10,2),
  solde_apres DECIMAL(10,2),
  raison VARCHAR(200),
  vendeur_id UUID REFERENCES vendeurs(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: rappels_credit (relances et suivi)
CREATE TABLE rappels_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'rappel', -- 'rappel', 'ultime', 'fermé'
  montant_du DECIMAL(10,2),
  message TEXT,
  lue BOOLEAN DEFAULT FALSE,
  date_rappel TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: paiements_credit (paiements partiels/plans)
CREATE TABLE paiements_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  montant_total_du DECIMAL(10,2) NOT NULL,
  montant_paye DECIMAL(10,2) DEFAULT 0,
  reste DECIMAL(10,2),
  date_echeance DATE,
  statut VARCHAR(20) DEFAULT 'en_cours', -- 'en_cours', 'paye', 'retard'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEX PERFORMANCE
-- ============================================
CREATE INDEX idx_clients_boutique ON clients(boutique_id);
CREATE INDEX idx_clients_telephone ON clients(boutique_id, telephone);
CREATE INDEX idx_mouvements_credit_client ON mouvements_credit(client_id);
CREATE INDEX idx_mouvements_credit_boutique ON mouvements_credit(boutique_id);
CREATE INDEX idx_rappels_client ON rappels_credit(client_id);
CREATE INDEX idx_paiements_client ON paiements_credit(client_id);

-- ============================================
-- VIEWS UTILES
-- ============================================

-- Vue: Clients avec solde actualisé
CREATE VIEW clients_with_balance AS
SELECT 
  c.id,
  c.boutique_id,
  c.nom,
  c.telephone,
  c.limite_credit,
  c.solde_credit,
  c.statut,
  COUNT(DISTINCT mc.id) as nombre_transactions,
  SUM(CASE WHEN mc.type = 'achat' THEN mc.montant ELSE 0 END) as total_achats,
  SUM(CASE WHEN mc.type = 'paiement' THEN mc.montant ELSE 0 END) as total_paiements,
  MAX(mc.created_at) as derniere_activite
FROM clients c
LEFT JOIN mouvements_credit mc ON c.id = mc.client_id
GROUP BY c.id, c.boutique_id, c.nom, c.telephone, c.limite_credit, c.solde_credit, c.statut;

-- Vue: Clients critiques (dépassement limite ou retard)
CREATE VIEW clients_critiques AS
SELECT 
  c.id,
  c.boutique_id,
  c.nom,
  c.telephone,
  c.solde_credit,
  c.limite_credit,
  (c.solde_credit - c.limite_credit) as depassement,
  CASE 
    WHEN c.solde_credit > c.limite_credit THEN 'depassement'
    WHEN EXISTS (SELECT 1 FROM paiements_credit pc WHERE pc.client_id = c.id AND pc.statut = 'retard' AND pc.date_echeance < NOW()) THEN 'retard'
    ELSE 'ok'
  END as statut_alerte
FROM clients c
WHERE c.boutique_id IS NOT NULL;
