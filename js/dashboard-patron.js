// ============================================
// DASHBOARD PATRON
// ============================================

/**
 * Charger le dashboard patron avec stats et alertes
 */
async function loadPatronDashboard() {
  if (!APP_STATE.boutique) return;

  showLoading(true);

  try {
    // Charger stats du jour
    const stats = await getDailyStats(APP_STATE.boutique.id);
    updateStatsDisplay(stats);

    // Charger articles avec alertes
    const articles = await getArticlesWithAlerts(APP_STATE.boutique.id);
    displayArticlesWithAlerts(articles);

    // Charger dernières transactions
    const transactions = await loadTransactionHistory(APP_STATE.boutique.id, 10);
    displayRecentTransactions(transactions);

    // S'abonner aux changements temps réel
    subscribeToAlerts(APP_STATE.boutique.id, (payload) => {
      showToast(`⚠️ Alerte stock : ${payload.new.type}`);
      loadPatronDashboard(); // Rafraîchir le dashboard
    });

    subscribeToTransactions(APP_STATE.boutique.id, (payload) => {
      loadPatronDashboard(); // Rafraîchir stats
    });

  } catch (err) {
    console.error('Erreur chargement dashboard:', err);
    showToast('❌ Erreur chargement dashboard');
  } finally {
    showLoading(false);
  }
}

/**
 * Afficher les stats
 */
function updateStatsDisplay(stats) {
  if (!stats) return;

  const statsContainer = document.getElementById('patron-stats');
  if (!statsContainer) return;

  const taux = stats.montantTotal > 0 
    ? Math.round((stats.montantEncaisse / stats.montantTotal) * 100) 
    : 0;

  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">💰 Ventes</div>
      <div class="stat-value">${formatCurrency(stats.montantTotal)}</div>
      <div class="stat-sub">${stats.totalVentes} transactions</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">💵 Encaissé</div>
      <div class="stat-value">${formatCurrency(stats.montantEncaisse)}</div>
      <div class="stat-sub">${taux}% collecté</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">🏧 Paiements</div>
      <div class="stat-sub">
        💵 Espèces: ${stats.parType.especes}<br>
        📱 Mobile: ${stats.parType.mobile_money}<br>
        🏦 Chèques: ${stats.parType.cheque}
      </div>
    </div>
  `;
}

/**
 * Afficher articles avec alertes
 */
function displayArticlesWithAlerts(articles) {
  const container = document.getElementById('patron-articles');
  if (!container) return;

  const articlesAvecAlertes = articles.filter(a => a.alertes_stock?.length > 0);
  const tousArticles = articles;

  if (articlesAvecAlertes.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:#00C853">✅ Tous les stocks sont OK</div>';
    return;
  }

  container.innerHTML = `
    <div class="alert-banner">⚠️ ${articlesAvecAlertes.length} article(s) en alerte</div>
    ${articlesAvecAlertes.map(article => {
      const alerte = article.alertes_stock[0];
      const type = alerte.type === 'stock_bas' ? '⚠️ Stock bas' : '🚨 Rupture';
      
      return `
        <div class="article-alert">
          <div class="alert-header">
            <span class="alert-type">${type}</span>
            <span class="alert-emoji">${article.emoji}</span>
            <span class="alert-name">${article.nom}</span>
          </div>
          <div class="alert-details">
            <div>Stock: <strong>${article.stock}</strong> / Alerte: ${article.alerte_stock}</div>
            <div>Prix: ${formatCurrency(article.prix_vente)}</div>
            <button onclick="markAlertAsRead('${alerte.id}')" class="btn-small">Marquer comme lu</button>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

/**
 * Afficher transactions récentes
 */
function displayRecentTransactions(transactions) {
  const container = document.getElementById('patron-transactions');
  if (!container) return;

  if (transactions.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:#9E9E9E;text-align:center">Aucune vente aujourd\'hui</div>';
    return;
  }

  container.innerHTML = `
    <div class="transaction-header">
      <h3>📊 Dernières ventes</h3>
    </div>
    ${transactions.map(tx => {
      const details = tx.details_transactions || [];
      const vendeur = tx.vendeurs?.nom || 'Patron';
      
      return `
        <div class="transaction-item">
          <div class="tx-header">
            <span class="tx-vendeur">👤 ${vendeur}</span>
            <span class="tx-montant">${formatCurrency(tx.montant_total)}</span>
          </div>
          <div class="tx-time">${formatTime(tx.created_at)}</div>
          <div class="tx-details">
            ${details.map(d => `
              <div class="tx-article">
                ${d.articles?.emoji} ${d.articles?.nom} x${d.quantite} = ${formatCurrency(d.sous_total)}
              </div>
            `).join('')}
          </div>
          <div class="tx-payment">
            Paiement: ${tx.type_paiement || 'N/A'}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

/**
 * Ouvrir page gestion articles
 */
async function openArticlesManager() {
  const articles = await loadArticles(APP_STATE.boutique.id);
  displayArticlesForManagement(articles);
  goScreen('s-articles-manager');
}

/**
 * Afficher articles pour gestion
 */
function displayArticlesForManagement(articles) {
  const container = document.getElementById('articles-list');
  if (!container) return;

  if (articles.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center">Aucun article</div>';
    return;
  }

  container.innerHTML = articles.map(article => `
    <div class="article-card">
      <div class="article-header">
        <span class="article-emoji">${article.emoji}</span>
        <div class="article-info">
          <div class="article-name">${article.nom}</div>
          <div class="article-category">${article.categorie}</div>
        </div>
      </div>
      <div class="article-prices">
        <div>Achat: ${formatCurrency(article.prix_achat)}</div>
        <div>Vente: ${formatCurrency(article.prix_vente)}</div>
        <div>Marge: ${Math.round(((article.prix_vente - article.prix_achat) / article.prix_achat) * 100)}%</div>
      </div>
      <div class="article-stock">
        <div>Stock: <strong>${article.stock}</strong></div>
        <div>Alerte: ${article.alerte_stock}</div>
      </div>
      <div class="article-actions">
        <button onclick="openEditArticle('${article.id}')" class="btn-small">✏️ Modifier</button>
        <button onclick="openStockEntry('${article.id}')" class="btn-small">📦 Ajouter stock</button>
      </div>
    </div>
  `).join('');
}

/**
 * Ouvrir formulaire ajout article
 */
function openNewArticleForm() {
  document.getElementById('article-form').reset();
  goScreen('s-article-form');
}

/**
 * Sauvegarder nouvel article
 */
async function saveNewArticle() {
  const nom = document.getElementById('af-nom')?.value?.trim();
  const emoji = document.getElementById('af-emoji')?.value?.trim() || '📦';
  const categorie = document.getElementById('af-categorie')?.value?.trim();
  const prixAchat = document.getElementById('af-prix-achat')?.value?.trim();
  const prixVente = document.getElementById('af-prix-vente')?.value?.trim();
  const stock = document.getElementById('af-stock')?.value?.trim() || '0';
  const alerte = document.getElementById('af-alerte')?.value?.trim() || '5';

  const article = await createArticle({
    nom,
    emoji,
    categorie,
    prix_achat: prixAchat,
    prix_vente: prixVente,
    stock,
    alerte_stock: alerte
  });

  if (article) {
    goScreen('s-dashboard-patron');
    loadPatronDashboard();
  }
}

/**
 * Ouvrir formulaire entée de stock
 */
async function openStockEntry(articleId) {
  const { data: article } = await sb
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (article) {
    document.getElementById('se-article-id').value = articleId;
    document.getElementById('se-article-name').textContent = article.nom;
    document.getElementById('se-stock-current').textContent = article.stock;
    document.getElementById('se-quantite').value = '';
    goScreen('s-stock-entry');
  }
}

/**
 * Sauvegarder l'entrée de stock
 */
async function saveStockEntry() {
  const articleId = document.getElementById('se-article-id')?.value;
  const quantite = parseInt(document.getElementById('se-quantite')?.value || 0);
  const raison = document.getElementById('se-raison')?.value?.trim() || 'Réapprovisionnement';

  if (!articleId || quantite <= 0) {
    showToast('⚠️ Vérifie la quantité');
    return;
  }

  setButtonLoading('btn-save-stock', true);

  const result = await recordStockMovement(articleId, quantite, 'entree', raison);

  setButtonLoading('btn-save-stock', false);

  if (result) {
    goScreen('s-dashboard-patron');
    loadPatronDashboard();
  }
}
