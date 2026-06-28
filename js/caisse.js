// ============================================
// MODULE CAISSE VENDEUR
// ============================================

/**
 * Charger l'écran caisse
 */
async function loadCaisse() {
  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique chargée');
    return;
  }

  goScreen('s-caisse');
  
  // Afficher infos vendeur
  const vendeurName = APP_STATE.vendeur?.nom || 'Vendeur';
  document.getElementById('caisse-vendeur-name').textContent = vendeurName;
  document.getElementById('caisse-shop-name').textContent = APP_STATE.boutique.nom;
  
  // Charger articles
  const articles = await loadArticles(APP_STATE.boutique.id);
  displayArticlesForCaisse(articles);
  
  // Initialiser panier
  clearCart();
  
  // S'abonner aux changements d'articles
  subscribeToArticles(APP_STATE.boutique.id, (payload) => {
    if (payload.eventType === 'UPDATE') {
      showToast('🔄 Article mis à jour');
      loadCaisse();
    }
  });
}

/**
 * Afficher articles pour la caisse
 */
function displayArticlesForCaisse(articles) {
  const container = document.getElementById('caisse-articles');
  if (!container) return;

  if (articles.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center">Aucun article disponible</div>';
    return;
  }

  container.innerHTML = articles.map(article => {
    const disponible = article.stock > 0;
    const disabled = !disponible ? 'disabled' : '';
    const opacity = disponible ? '1' : '0.5';

    return `
      <button 
        class="article-btn ${!disponible ? 'out-of-stock' : ''}" 
        onclick="addToCart({
          id: '${article.id}',
          nom: '${article.nom.replace(/'/g, "\\'")}',
          emoji: '${article.emoji}',
          prix_vente: ${article.prix_vente},
          stock: ${article.stock}
        })"
        ${disabled}
        style="opacity: ${opacity}"
      >
        <div class="article-btn-emoji">${article.emoji}</div>
        <div class="article-btn-name">${article.nom}</div>
        <div class="article-btn-price">${formatCurrency(article.prix_vente)}</div>
        <div class="article-btn-stock">Stock: ${article.stock}</div>
        ${!disponible ? '<div class="out-of-stock-badge">Rupture</div>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Rechercher articles dans la caisse
 */
const searchArticlesInCaisse = debounce(async function(query) {
  if (!APP_STATE.boutique) return;

  if (query.trim().length === 0) {
    const articles = await loadArticles(APP_STATE.boutique.id);
    displayArticlesForCaisse(articles);
    return;
  }

  const results = await searchArticles(APP_STATE.boutique.id, query);
  displayArticlesForCaisse(results);
}, 300);

/**
 * Ouvrir modal paiement
 */
function openPaymentModal() {
  if (cartItems.length === 0) {
    showToast('⚠️ Ajoute des articles au panier');
    return;
  }

  const total = getCartTotal();
  document.getElementById('payment-total').textContent = formatCurrency(total);
  document.getElementById('payment-amount').value = total;
  document.getElementById('payment-method').value = 'especes';
  document.getElementById('payment-change').textContent = '0 F';
  
  goScreen('s-payment');
}

/**
 * Calculer monnaie restante
 */
function calculateChange() {
  const total = getCartTotal();
  const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
  const change = Math.max(0, amount - total);

  document.getElementById('payment-change').textContent = formatCurrency(change);
  
  if (amount < total) {
    document.getElementById('payment-change').style.color = '#FF3D00';
  } else {
    document.getElementById('payment-change').style.color = '#00C853';
  }
}

/**
 * Valider le paiement
 */
async function validatePayment() {
  const total = getCartTotal();
  const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
  const method = document.getElementById('payment-method').value;

  if (amount < total) {
    showToast('⚠️ Montant insuffisant');
    return;
  }

  setButtonLoading('btn-validate-payment', true);

  const result = await completeTransaction(method, amount);

  setButtonLoading('btn-validate-payment', false);

  if (result) {
    // Afficher reçu
    showReceipt(result);
    
    setTimeout(() => {
      goScreen('s-caisse');
      loadCaisse();
    }, 3000);
  }
}

/**
 * Afficher reçu de vente
 */
function showReceipt(transaction) {
  const receipt = `
    <div class="receipt-container">
      <div class="receipt-header">
        <h2>✅ VENTE VALIDÉE</h2>
        <p>${APP_STATE.boutique.nom}</p>
      </div>
      
      <div class="receipt-details">
        <div class="receipt-item">
          <span>Montant</span>
          <span>${formatCurrency(transaction.montant)}</span>
        </div>
        <div class="receipt-item">
          <span>Payé</span>
          <span>${formatCurrency(transaction.paye)}</span>
        </div>
        <div class="receipt-item" style="border-top: 2px dashed #9E9E9E; padding-top: 10px; margin-top: 10px;">
          <span>Monnaie</span>
          <span style="color: #00C853; font-weight: 900;">${formatCurrency(transaction.change)}</span>
        </div>
      </div>
      
      <div class="receipt-articles">
        <h3>Articles vendus:</h3>
        ${cartItems.map(item => `
          <div class="receipt-article">
            <span>${item.emoji} ${item.nom} x${item.quantite}</span>
            <span>${formatCurrency(item.prix_unitaire * item.quantite)}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="receipt-footer">
        <p>Vendeur: ${APP_STATE.vendeur?.nom || 'Système'}</p>
        <p>${formatDate(new Date())} - ${formatTime(new Date())}</p>
        <p>Merci de votre achat! 🙏</p>
      </div>
    </div>
  `;

  const modal = document.getElementById('receipt-modal');
  if (modal) {
    modal.innerHTML = receipt;
    modal.style.display = 'flex';
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, 4000);
  }
}

/**
 * Annuler la vente
 */
function cancelTransaction() {
  if (confirm('Annuler la vente en cours ?')) {
    clearCart();
    goScreen('s-caisse');
    showToast('Vente annulée');
  }
}

/**
 * Ouvrir l'historique des ventes du vendeur
 */
async function openSalesHistory() {
  const transactions = await loadTransactionHistory(APP_STATE.boutique.id, 50);
  const vendeurTransactions = transactions.filter(t => t.vendeur_id === APP_STATE.vendeur?.id);
  
  displayVendeurSalesHistory(vendeurTransactions);
  goScreen('s-sales-history');
}

/**
 * Afficher historique des ventes
 */
function displayVendeurSalesHistory(transactions) {
  const container = document.getElementById('sales-history-list');
  if (!container) return;

  if (transactions.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#9E9E9E">Aucune vente</div>';
    return;
  }

  let totalDay = 0;

  container.innerHTML = transactions.map(tx => {
    totalDay += tx.montant_total;
    const details = tx.details_transactions || [];

    return `
      <div class="history-item">
        <div class="history-header">
          <span class="history-time">${formatTime(tx.created_at)}</span>
          <span class="history-amount">${formatCurrency(tx.montant_total)}</span>
        </div>
        <div class="history-articles">
          ${details.map(d => `${d.articles?.emoji} ${d.articles?.nom} x${d.quantite}`).join(' | ')}
        </div>
        <div class="history-payment">
          ${tx.type_paiement || 'Espèces'}
        </div>
      </div>
    `;
  }).join('');

  // Ajouter total
  const totalElement = document.getElementById('sales-history-total');
  if (totalElement) {
    totalElement.textContent = `Total: ${formatCurrency(totalDay)}`;
  }
}
