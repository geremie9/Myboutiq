-- ============================================
-- SCHEMA SUPABASE POUR MYBOUTIQ
-- Structure complète avec isolation par boutique
-- ============================================

-- TABLE: boutiques (propriétaires)
CREATE TABLE boutiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20),
  code VARCHAR(6) UNIQUE NOT NULL,
  pin VARCHAR(6) NOT NULL,
  devise_symbole VARCHAR(3) DEFAULT 'F',
  devise_code VARCHAR(3) DEFAULT 'XOF',
  langue VARCHAR(2) DEFAULT 'fr',
  pays VARCHAR(2) DEFAULT 'CI',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: vendeurs (employés)
CREATE TABLE vendeurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  pin VARCHAR(4) NOT NULL,
  role VARCHAR(20) DEFAULT 'vendeur', -- 'vendeur', 'caissier', 'superviseur'
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: articles (produits)
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom VARCHAR(150) NOT NULL,
  emoji VARCHAR(10),
  categorie VARCHAR(50),
  description TEXT,
  prix_achat DECIMAL(10,2) NOT NULL,
  prix_vente DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  alerte_stock INTEGER DEFAULT 5,
  code_barre VARCHAR(50),
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: mouvements_stock (historique entrées/sorties)
CREATE TABLE mouvements_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'entree', 'sortie', 'ajustement', 'vente'
  quantite INTEGER NOT NULL,
  raison VARCHAR(200),
  vendeur_id UUID REFERENCES vendeurs(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: transactions (ventes)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  vendeur_id UUID REFERENCES vendeurs(id),
  montant_total DECIMAL(10,2) NOT NULL,
  montant_paye DECIMAL(10,2),
  type_paiement VARCHAR(20), -- 'especes', 'mobile_money', 'cheque'
  statut VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
  numero_reference VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: details_transactions (articles vendus)
CREATE TABLE details_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id),
  quantite INTEGER NOT NULL,
  prix_unitaire DECIMAL(10,2) NOT NULL,
  sous_total DECIMAL(10,2) NOT NULL
);

-- TABLE: alertes_stock (notifs patron)
CREATE TABLE alertes_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'stock_bas', -- 'stock_bas', 'rupture'
  lue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================
CREATE INDEX idx_articles_boutique ON articles(boutique_id);
CREATE INDEX idx_vendeurs_boutique ON vendeurs(boutique_id);
CREATE INDEX idx_mouvements_boutique ON mouvements_stock(boutique_id);
CREATE INDEX idx_mouvements_article ON mouvements_stock(article_id);
CREATE INDEX idx_transactions_boutique ON transactions(boutique_id);
CREATE INDEX idx_transactions_vendeur ON transactions(vendeur_id);
CREATE INDEX idx_details_transaction ON details_transactions(transaction_id);
CREATE INDEX idx_alertes_boutique ON alertes_stock(boutique_id);
CREATE INDEX idx_alertes_article ON alertes_stock(article_id);

-- ============================================
-- RLS (Row Level Security) - À configurer dans Supabase
-- ============================================
-- Les utilisateurs ne voient que leurs boutiques et leurs données isolées
