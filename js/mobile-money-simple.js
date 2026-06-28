// ============================================
// MODULE SMS & CONFIRMATIONS CRÉDIT/PAIEMENT
// ============================================

/**
 * Configuration SMS par boutique
 */
async function setupSMSConfiguration(apiProvider = 'orange') {
  if (!APP_STATE.boutique) return;

  try {
    // Vérifier si config existe
    const { data: existing } = await sb
      .from('configurations_sms')
      .select('*')
      .eq('boutique_id', APP_STATE.boutique.id)
      .maybeSingle();

    if (!existing) {
      // Créer config par défaut (clés vides pour maintenant)
      await sb.from('configurations_sms').insert({
        boutique_id: APP_STATE.boutique.id,
        fournisseur: apiProvider,
        actif: true
      });
    }

    return true;
  } catch (err) {
    console.error('Erreur config SMS:', err);
    return false;
  }
}

/**
 * Générer code de paiement unique (pour afficher à la porte)
 */
function generatePaymentCode() {
  // Format: 6 chiffres aléatoires
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Créer transaction avec code paiement Mobile Money
 * (Le vendeur n'a PAS besoin d'entrer de code - juste afficher le code généré)
 */
async function createMobileMoneyTransaction(montant, articles) {
  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique chargée');
    return null;
  }

  try {
    // Générer code de paiement
    const codePayment = generatePaymentCode();
    const timeoutMinutes = 15;
    const expireAt = new Date(Date.now() + timeoutMinutes * 60000).toISOString();

    // Créer transaction avec statut "en attente de confirmation"
    const { data: transaction, error: err1 } = await sb
      .from('transactions')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        vendeur_id: APP_STATE.vendeur?.id || null,
        montant_total: montant,
        montant_paye: 0, // Pas encore payé
        type_paiement: 'mobile_money',
        statut: 'pending', // EN ATTENTE DE CONFIRMATION
        numero_reference: codePayment // Code à afficher
      })
      .select()
      .single();

    if (err1) throw err1;

    // Enregistrer détails articles
    for (const item of articles) {
      await sb.from('details_transactions').insert({
        transaction_id: transaction.id,
        article_id: item.id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        sous_total: item.prix_unitaire * item.quantite
      });
    }

    // Créer enregistrement de confirmation
    const { data: confirmation, error: err2 } = await sb
      .from('confirmations_paiement_mm')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        transaction_id: transaction.id,
        code_paiement: codePayment,
        statut: 'en_attente',
        expire_at: expireAt,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (err2) throw err2;

    showToast(`✅ Code de paiement généré: ${codePayment}`);
    
    return {
      transaction,
      codePayment,
      expireAt,
      montant
    };

  } catch (err) {
    console.error('Erreur création transaction MM:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  }
}

/**
 * Afficher écran de paiement avec code
 */
function showPaymentCodeScreen(paymentData) {
  if (!paymentData) return;

  const { codePayment, montant, expireAt } = paymentData;
  
  // Créer le QR code ou affichage simple
  const screen = document.getElementById('s-payment-code');
  if (!screen) return;

  const timeRemaining = Math.round((new Date(expireAt) - new Date()) / 1000);
  const minutes = Math.floor(timeRemaining / 60);

  screen.innerHTML = `
    <div class="payment-code-container">
      <div class="payment-code-header">
        <h2>📱 PAIEMENT MOBILE MONEY</h2>
        <p>${APP_STATE.boutique.nom}</p>
      </div>

      <div class="payment-code-amount">
        <div class="amount-label">Montant à payer</div>
        <div class="amount-value">${formatCurrency(montant)}</div>
      </div>

      <div class="payment-code-display">
        <div class="code-label">Code à afficher à la porte</div>
        <div class="code-big">${codePayment}</div>
        <div class="code-subtitle">Le client scanne ce code avec son téléphone</div>
      </div>

      <div class="payment-qr-placeholder">
        <!-- QR Code sera généré ici (optionnel) -->
        <div style="text-align: center; padding: 30px; background: #F0F2F5; border-radius: 8px;">
          📲 QR Code irait ici
        </div>
      </div>

      <div class="payment-instructions">
        <h3>Instructions client:</h3>
        <ol>
          <li>Client ouvre son app Orange Money/Moov/MTN</li>
          <li>Client rentre ce code: <strong>${codePayment}</strong></li>
          <li>Client rentre montant: <strong>${formatCurrency(montant)}</strong></li>
          <li>Client confirme le paiement</li>
          <li>Vous verrez "Paiement Confirmé" ici automatiquement</li>
        </ol>
      </div>

      <div class="payment-timer">
        ⏱️ Expire dans: <span id="timer-remaining">${minutes}m</span>
      </div>

      <div class="payment-status" id="payment-status">
        ⏳ En attente de paiement...
      </div>

      <div class="payment-actions">
        <button onclick="checkPaymentStatus('${paymentData.transaction.id}')" class="btn-primary">
          🔄 Vérifier le paiement
        </button>
        <button onclick="cancelPaymentCode()" class="btn-secondary">
          ✕ Annuler
        </button>
      </div>
    </div>
  `;

  goScreen('s-payment-code');

  // Démarrer timer
  startPaymentTimer(expireAt, paymentData.transaction.id);
  
  // Vérifier paiement automatiquement tous les 5 secondes
  startAutoCheckPayment(paymentData.transaction.id);
}

/**
 * Timer countdown
 */
function startPaymentTimer(expireAt, transactionId) {
  const timerDisplay = document.getElementById('timer-remaining');
  if (!timerDisplay) return;

  const interval = setInterval(() => {
    const remaining = Math.round((new Date(expireAt) - new Date()) / 1000);
    
    if (remaining <= 0) {
      clearInterval(interval);
      expirePaymentCode(transactionId);
      return;
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerDisplay.textContent = `${minutes}m ${seconds}s`;
  }, 1000);

  // Stocker interval pour l'arrêter plus tard
  window.paymentTimerInterval = interval;
}

/**
 * Vérifier si paiement confirmé
 */
async function checkPaymentStatus(transactionId) {
  try {
    const { data: confirmation, error } = await sb
      .from('confirmations_paiement_mm')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (error) throw error;

    if (!confirmation) {
      showToast('⚠️ Confirmation non trouvée');
      return;
    }

    // Si vendeur a déjà cliqué "Confirmé"
    if (confirmation.statut === 'confirmé') {
      showPaymentConfirmedScreen(transactionId);
      return;
    }

    // Si temps expiré
    if (new Date(confirmation.expire_at) < new Date()) {
      showToast('⏰ Code expiré');
      expirePaymentCode(transactionId);
      return;
    }

    showToast('⏳ En attente du paiement client...');

  } catch (err) {
    console.error('Erreur vérification paiement:', err);
    showToast('❌ Erreur');
  }
}

/**
 * Vérification automatique toutes les 5 secondes
 */
function startAutoCheckPayment(transactionId) {
  if (window.autoCheckInterval) clearInterval(window.autoCheckInterval);

  window.autoCheckInterval = setInterval(async () => {
    const { data: confirmation } = await sb
      .from('confirmations_paiement_mm')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (confirmation?.statut === 'confirmé') {
      clearInterval(window.autoCheckInterval);
      clearInterval(window.paymentTimerInterval);
      showPaymentConfirmedScreen(transactionId);
    }
  }, 5000);
}

/**
 * VENDEUR CONFIRME le paiement (après que client a payé)
 */
async function confirmMobileMoneyPayment(transactionId) {
  try {
    // Mettre à jour confirmation
    const { error: err1 } = await sb
      .from('confirmations_paiement_mm')
      .update({ 
        statut: 'confirmé',
        confirme_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId);

    if (err1) throw err1;

    // Mettre à jour transaction
    const { data: transaction } = await sb
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transaction) {
      await sb
        .from('transactions')
        .update({
          statut: 'completed',
          montant_paye: transaction.montant_total
        })
        .eq('id', transactionId);

      // Mettre à jour stock
      const { data: details } = await sb
        .from('details_transactions')
        .select('*')
        .eq('transaction_id', transactionId);

      for (const detail of details || []) {
        await recordStockMovement(
          detail.article_id,
          detail.quantite,
          'vente',
          `Vente Mobile Money confirmée`
        );
      }
    }

    clearInterval(window.autoCheckInterval);
    clearInterval(window.paymentTimerInterval);
    
    showPaymentConfirmedScreen(transactionId);

  } catch (err) {
    console.error('Erreur confirmation paiement:', err);
    showToast(`❌ Erreur : ${err.message}`);
  }
}

/**
 * Afficher écran confirmé
 */
async function showPaymentConfirmedScreen(transactionId) {
  const { data: transaction } = await sb
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!transaction) return;

  const screen = document.getElementById('s-payment-code');
  screen.innerHTML = `
    <div class="payment-confirmed-container">
      <div class="confirmed-icon">✅</div>
      <h2>PAIEMENT CONFIRMÉ!</h2>
      <div class="confirmed-details">
        <div>Montant: <strong>${formatCurrency(transaction.montant_total)}</strong></div>
        <div>Heure: <strong>${formatTime(new Date())}</strong></div>
        <div>Référence: <strong>${transaction.numero_reference}</strong></div>
      </div>
      <button onclick="finalizeSale()" class="btn-primary">
        ✅ Terminer & Nouvelle Vente
      </button>
    </div>
  `;
}

/**
 * Code expiré
 */
async function expirePaymentCode(transactionId) {
  try {
    // Annuler la transaction
    await sb
      .from('transactions')
      .update({ statut: 'cancelled' })
      .eq('id', transactionId);

    await sb
      .from('confirmations_paiement_mm')
      .update({ statut: 'expiré' })
      .eq('transaction_id', transactionId);

    clearCart();
    goScreen('s-caisse');
    showToast('⏰ Code de paiement expiré - Vente annulée');

  } catch (err) {
    console.error('Erreur expiration code:', err);
  }
}

/**
 * Annuler paiement
 */
async function cancelPaymentCode() {
  if (confirm('Annuler ce paiement?')) {
    clearCart();
    goScreen('s-caisse');
    showToast('❌ Paiement annulé');
  }
}

/**
 * Finaliser la vente
 */
function finalizeSale() {
  clearCart();
  goScreen('s-caisse');
  loadCaisse();
  showToast('🎉 Vente terminée!');
}
