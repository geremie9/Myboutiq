// ============================================
// GESTION DES TRANSACTIONS (VENTES)
// ============================================

let cartItems = [];

/**
 * Ajouter un article au panier
 */
function addToCart(article) {
  const existingItem = cartItems.find(item => item.id === article.id);

  if (existingItem) {
    existingItem.quantite++;
  } else {
    cartItems.push({
      id: article.id,
      nom: article.nom,
      emoji: article.emoji,
      prix_unitaire: article.prix_vente,
      quantite: 1,
      stock_disponible: article.stock
    });
  }

  updateCartDisplay();
  showToast(`✅ ${article.nom} ajouté au panier`);
}

/**
 * Retirer un article du panier
 */
function removeFromCart(articleId) {
  cartItems = cartItems.filter(item => item.id !== articleId);
  updateCartDisplay();
}

/**
 * Mettre à jour quantité panier
 */
function updateCartQuantity(articleId, quantite) {
  const item = cartItems.find(item => item.id === articleId);
  if (item) {
    item.quantite = Math.max(1, Math.min(quantite, item.stock_disponible));
    updateCartDisplay();
  }
}

/**
 * Vider le panier
 */
function clearCart() {
  cartItems = [];
  updateCartDisplay();
}

/**
 * Afficher le panier
 */
function updateCartDisplay() {
  const cartList = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const cartCount = document.getElementById('cart-count');

  if (!cartList) return;

  if (cartItems.length === 0) {
    cartList.innerHTML = '<div style="text-align:center;color:#9E9E9E;padding:20px">🛒 Panier vide</div>';
    if (cartTotal) cartTotal.textContent = '0 F';
    if (cartCount) cartCount.textContent = '0';
    return;
  }

  let total = 0;
  let count = 0;

  cartList.innerHTML = cartItems.map(item => {
    const subtotal = item.prix_unitaire * item.quantite;
    total += subtotal;
    count += item.quantite;

    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <span class="cart-emoji">${item.emoji}</span>
          <div>
            <div class="cart-item-name">${item.nom}</div>
            <div class="cart-item-price">${formatCurrency(item.prix_unitaire)}</div>
          </div>
        </div>
        <div class="cart-item-qty">
          <button onclick="updateCartQuantity('${item.id}', ${item.quantite - 1})">-</button>
          <input type="number" value="${item.quantite}" min="1" max="${item.stock_disponible}">
          <button onclick="updateCartQuantity('${item.id}', ${item.quantite + 1})">+</button>
        </div>
        <div class="cart-item-subtotal">
          ${formatCurrency(subtotal)}
        </div>
        <button onclick="removeFromCart('${item.id}')" class="btn-remove">🗑️</button>
      </div>
    `;
  }).join('');

  if (cartTotal) cartTotal.textContent = formatCurrency(total);
  if (cartCount) cartCount.textContent = count;
}

/**
 * Calculer total panier
 */
function getCartTotal() {
  return cartItems.reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0);
}

/**
 * Valider et créer la transaction
 */
async function completeTransaction(typePaiement = 'especes', montantPaye = null) {
  if (cartItems.length === 0) {
    showToast('⚠️ Panier vide');
    return;
  }

  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique sélectionnée');
    return;
  }

  const montantTotal = getCartTotal();
  if (montantPaye === null) montantPaye = montantTotal;

  setButtonLoading('btn-validate-transaction', true);

  try {
    // Créer la transaction
    const { data: transaction, error: err1 } = await sb
      .from('transactions')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        vendeur_id: APP_STATE.vendeur?.id || null,
        montant_total: montantTotal,
        montant_paye: montantPaye,
        type_paiement: typePaiement,
        statut: 'completed'
      })
      .select()
      .single();

    if (err1) throw err1;

    // Créer les détails et mettre à jour stock
    const details = [];
    for (const item of cartItems) {
      // Insérer détail
      await sb.from('details_transactions').insert({
        transaction_id: transaction.id,
        article_id: item.id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        sous_total: item.prix_unitaire * item.quantite
      });

      // Enregistrer mouvement stock
      await recordStockMovement(item.id, item.quantite, 'vente', `Vente via transaction`);

      details.push({
        article_id: item.id,
        quantite: item.quantite
      });
    }

    showToast(`✅ Vente validée ! Montant: ${formatCurrency(montantTotal)}`);
    clearCart();
    updateCartDisplay();

    // Retourner détails transaction
    return {
      transaction,
      details,
      montant: montantTotal,
      paye: montantPaye,
      change: montantPaye - montantTotal
    };

  } catch (err) {
    console.error('Erreur validation transaction:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  } finally {
    setButtonLoading('btn-validate-transaction', false);
  }
}

/**
 * Charger historique transactions
 */
async function loadTransactionHistory(boutiqueId, limit = 20) {
  try {
    const { data: transactions, error } = await sb
      .from('transactions')
      .select(`
        *,
        vendeurs(nom),
        details_transactions(
          article_id,
          quantite,
          prix_unitaire,
          articles(nom, emoji)
        )
      `)
      .eq('boutique_id', boutiqueId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return transactions || [];
  } catch (err) {
    console.error('Erreur chargement historique:', err);
    return [];
  }
}

/**
 * Calculer stats journalières
 */
async function getDailyStats(boutiqueId, date = new Date()) {
  const startDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
  const endDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

  try {
    const { data: transactions, error } = await sb
      .from('transactions')
      .select('montant_total, montant_paye, type_paiement')
      .eq('boutique_id', boutiqueId)
      .eq('statut', 'completed')
      .gte('created_at', startDay)
      .lte('created_at', endDay);

    if (error) throw error;

    return {
      totalVentes: transactions?.length || 0,
      montantTotal: transactions?.reduce((sum, t) => sum + (t.montant_total || 0), 0) || 0,
      montantEncaisse: transactions?.reduce((sum, t) => sum + (t.montant_paye || 0), 0) || 0,
      parType: {
        especes: transactions?.filter(t => t.type_paiement === 'especes')?.length || 0,
        mobile_money: transactions?.filter(t => t.type_paiement === 'mobile_money')?.length || 0,
        cheque: transactions?.filter(t => t.type_paiement === 'cheque')?.length || 0
      }
    };
  } catch (err) {
    console.error('Erreur stats journalières:', err);
    return null;
  }
}
