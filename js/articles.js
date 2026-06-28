// ============================================
// GESTION DES ARTICLES
// ============================================

/**
 * Charger tous les articles d'une boutique
 */
async function loadArticles(boutiqueId) {
  try {
    const { data: articles, error } = await sb
      .from('articles')
      .select('*')
      .eq('boutique_id', boutiqueId)
      .eq('actif', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return articles || [];
  } catch (err) {
    console.error('Erreur chargement articles:', err);
    return [];
  }
}

/**
 * Créer un nouvel article
 */
async function createArticle(articleData) {
  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique sélectionnée');
    return null;
  }

  const { nom, emoji, categorie, prix_achat, prix_vente, stock, alerte_stock } = articleData;

  if (!nom || !prix_achat || !prix_vente) {
    showToast('⚠️ Remplis tous les champs obligatoires');
    return null;
  }

  try {
    const { data, error } = await sb
      .from('articles')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        nom,
        emoji: emoji || '📦',
        categorie: categorie || 'Divers',
        prix_achat: parseFloat(prix_achat),
        prix_vente: parseFloat(prix_vente),
        stock: parseInt(stock) || 0,
        alerte_stock: parseInt(alerte_stock) || 5,
        actif: true
      })
      .select()
      .single();

    if (error) throw error;

    showToast(`✅ Article "${nom}" créé`);
    return data;
  } catch (err) {
    console.error('Erreur création article:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  }
}

/**
 * Mettre à jour un article
 */
async function updateArticle(articleId, updates) {
  try {
    const { data, error } = await sb
      .from('articles')
      .update(updates)
      .eq('id', articleId)
      .select()
      .single();

    if (error) throw error;
    
    showToast('✅ Article mis à jour');
    return data;
  } catch (err) {
    console.error('Erreur mise à jour article:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  }
}

/**
 * Supprimer un article (soft delete)
 */
async function deleteArticle(articleId) {
  try {
    await sb
      .from('articles')
      .update({ actif: false })
      .eq('id', articleId);

    showToast('✅ Article supprimé');
    return true;
  } catch (err) {
    console.error('Erreur suppression article:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return false;
  }
}

/**
 * Enregistrer un mouvement de stock
 */
async function recordStockMovement(articleId, quantite, type = 'entree', raison = '') {
  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique sélectionnée');
    return null;
  }

  try {
    // Enregistrer le mouvement
    const { data: mouvement, error: err1 } = await sb
      .from('mouvements_stock')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        article_id: articleId,
        type,
        quantite,
        raison,
        vendeur_id: APP_STATE.vendeur?.id || null
      })
      .select()
      .single();

    if (err1) throw err1;

    // Récupérer l'article
    const { data: article } = await sb
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (!article) return mouvement;

    // Mettre à jour le stock
    let newStock = article.stock;
    if (type === 'entree') {
      newStock += quantite;
    } else if (type === 'sortie' || type === 'vente') {
      newStock = Math.max(0, newStock - quantite);
    }

    // Vérifier si alerte nécessaire
    if (newStock <= article.alerte_stock && newStock > 0) {
      await createStockAlert(APP_STATE.boutique.id, articleId, 'stock_bas');
    } else if (newStock === 0) {
      await createStockAlert(APP_STATE.boutique.id, articleId, 'rupture');
    }

    // Mettre à jour stock dans articles
    await sb
      .from('articles')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', articleId);

    showToast(`✅ Stock mis à jour`);
    return mouvement;

  } catch (err) {
    console.error('Erreur mouvement stock:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  }
}

/**
 * Chercher un article par code barre ou nom
 */
async function searchArticles(boutiqueId, query) {
  try {
    const { data, error } = await sb
      .from('articles')
      .select('*')
      .eq('boutique_id', boutiqueId)
      .eq('actif', true)
      .or(`nom.ilike.%${query}%,code_barre.ilike.%${query}%`);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erreur recherche articles:', err);
    return [];
  }
}

/**
 * Récupérer articles avec alertes
 */
async function getArticlesWithAlerts(boutiqueId) {
  try {
    const { data: articles, error } = await sb
      .from('articles')
      .select(`
        *,
        alertes_stock(id, type, lue)
      `)
      .eq('boutique_id', boutiqueId)
      .eq('actif', true);

    if (error) throw error;
    return articles || [];
  } catch (err) {
    console.error('Erreur chargement articles avec alertes:', err);
    return [];
  }
}
