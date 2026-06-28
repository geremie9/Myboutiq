// ============================================
// MODULE GESTION DES CLIENTS ET CRÉDIT
// ============================================

/**
 * Charger la liste des clients avec crédit
 */
async function loadClients(boutiqueId) {
  try {
    const { data: clients, error } = await sb
      .from('clients')
      .select(`
        *,
        mouvements_credit(
          id,
          type,
          montant,
          created_at
        )
      `)
      .eq('boutique_id', boutiqueId)
      .eq('statut', 'actif')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return clients || [];
  } catch (err) {
    console.error('Erreur chargement clients:', err);
    return [];
  }
}

/**
 * Créer un nouveau client
 */
async function createClient(clientData) {
  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique sélectionnée');
    return null;
  }

  const { nom, telephone, email, adresse, limite_credit } = clientData;

  if (!nom) {
    showToast('⚠️ Nom du client obligatoire');
    return null;
  }

  try {
    const { data, error } = await sb
      .from('clients')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        nom,
        telephone,
        email,
        adresse,
        limite_credit: parseFloat(limite_credit) || 0,
        solde_credit: 0,
        statut: 'actif'
      })
      .select()
      .single();

    if (error) throw error;

    showToast(`✅ Client "${nom}" créé`);
    return data;
  } catch (err) {
    console.error('Erreur création client:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  }
}

/**
 * Vendre à crédit (vendeur)
 */
async function sellOnCredit(clientId, montant, articles) {
  if (!APP_STATE.boutique || !clientId) {
    showToast('❌ Infos manquantes');
    return null;
  }

  try {
    // Vérifier client existe
    const { data: client, error: err0 } = await sb
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (err0 || !client) {
      showToast('❌ Client introuvable');
      return null;
    }

    // Vérifier limite de crédit
    const nouveauSolde = client.solde_credit + montant;
    if (nouveauSolde > client.limite_credit) {
      showToast(`⚠️ Dépassement limite crédit (Limite: ${formatCurrency(client.limite_credit)}, Nouveau: ${formatCurrency(nouveauSolde)})`);
      return null;
    }

    // Créer transaction
    const { data: transaction, error: err1 } = await sb
      .from('transactions')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        vendeur_id: APP_STATE.vendeur?.id || null,
        montant_total: montant,
        montant_paye: 0, // Pas d'argent payé (crédit)
        type_paiement: 'credit',
        statut: 'completed'
      })
      .select()
      .single();

    if (err1) throw err1;

    // Enregistrer détails transaction
    for (const item of articles) {
      await sb.from('details_transactions').insert({
        transaction_id: transaction.id,
        article_id: item.id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        sous_total: item.prix_unitaire * item.quantite
      });

      // Mettre à jour stock
      await recordStockMovement(item.id, item.quantite, 'vente', `Vente à crédit à ${client.nom}`);
    }

    // Enregistrer mouvement crédit
    const { error: err2 } = await sb.from('mouvements_credit').insert({
      boutique_id: APP_STATE.boutique.id,
      client_id: clientId,
      transaction_id: transaction.id,
      type: 'achat',
      montant: montant,
      solde_avant: client.solde_credit,
      solde_apres: nouveauSolde,
      raison: `Vente à crédit`,
      vendeur_id: APP_STATE.vendeur?.id || null
    });

    if (err2) throw err2;

    // Mettre à jour solde client
    await sb
      .from('clients')
      .update({ solde_credit: nouveauSolde, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    // Alerte si proche limite
    if (nouveauSolde > client.limite_credit * 0.9) {
      showToast(`⚠️ Client ${client.nom}: ${((nouveauSolde / client.limite_credit) * 100).toFixed(0)}% de la limite`);
    }

    showToast(`✅ Vente à crédit enregistrée pour ${client.nom}`);
    return transaction;

  } catch (err) {
    console.error('Erreur vente à crédit:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  }
}

/**
 * Enregistrer paiement crédit
 */
async function recordCreditPayment(clientId, montantPaye, typeReglement = 'especes') {
  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique sélectionnée');
    return null;
  }

  try {
    // Récupérer client
    const { data: client } = await sb
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!client) {
      showToast('❌ Client introuvable');
      return null;
    }

    const nouveauSolde = Math.max(0, client.solde_credit - montantPaye);

    // Enregistrer mouvement crédit
    const { data: mouvement, error } = await sb
      .from('mouvements_credit')
      .insert({
        boutique_id: APP_STATE.boutique.id,
        client_id: clientId,
        type: 'paiement',
        montant: montantPaye,
        solde_avant: client.solde_credit,
        solde_apres: nouveauSolde,
        raison: `Paiement crédit - ${typeReglement}`,
        vendeur_id: APP_STATE.vendeur?.id || null
      })
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour solde client
    await sb
      .from('clients')
      .update({ solde_credit: nouveauSolde, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    showToast(`✅ Paiement de ${formatCurrency(montantPaye)} enregistré pour ${client.nom}`);
    return mouvement;

  } catch (err) {
    console.error('Erreur paiement crédit:', err);
    showToast(`❌ Erreur : ${err.message}`);
    return null;
  }
}

/**
 * Charger clients critiques (dépassement ou retard)
 */
async function loadCriticalClients(boutiqueId) {
  try {
    const { data: clients, error } = await sb
      .from('clients_critiques')
      .select('*')
      .eq('boutique_id', boutiqueId);

    if (error) throw error;
    return clients || [];
  } catch (err) {
    console.error('Erreur clients critiques:', err);
    return [];
  }
}

/**
 * Afficher clients avec alertes crédit
 */
function displayClientsWithCreditAlerts(clients) {
  const container = document.getElementById('credit-clients-list');
  if (!container) return;

  if (clients.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center">Aucun client en alerte</div>';
    return;
  }

  container.innerHTML = clients.map(client => {
    const pourcentage = (client.solde_credit / client.limite_credit) * 100;
    const couleur = pourcentage > 100 ? '#FF3D00' : pourcentage > 80 ? '#F5A623' : '#00C853';

    return `
      <div class="credit-client-card" style="border-left: 4px solid ${couleur}">
        <div class="credit-client-header">
          <div class="credit-client-name">${client.nom}</div>
          <div class="credit-client-phone">${client.telephone || 'N/A'}</div>
        </div>
        <div class="credit-client-balance">
          <div class="balance-bar">
            <div class="balance-fill" style="width: ${Math.min(pourcentage, 100)}%; background-color: ${couleur}"></div>
          </div>
          <div class="balance-text">
            Dû: <strong>${formatCurrency(client.solde_credit)}</strong> / Limite: ${formatCurrency(client.limite_credit)}
          </div>
          ${pourcentage > 100 ? `
            <div class="alert-badge">🚨 Dépassement de ${formatCurrency(client.solde_credit - client.limite_credit)}</div>
          ` : ''}
        </div>
        <div class="credit-client-actions">
          <button onclick="openPaymentClientForm('${client.id}', '${client.nom}')" class="btn-small">💵 Paiement</button>
          <button onclick="viewClientHistory('${client.id}')" class="btn-small">📋 Historique</button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Afficher historique crédit client
 */
async function viewClientHistory(clientId) {
  try {
    const { data: mouvements, error } = await sb
      .from('mouvements_credit')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const { data: client } = await sb
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    displayClientHistoryModal(client, mouvements);

  } catch (err) {
    console.error('Erreur historique client:', err);
    showToast('❌ Erreur chargement historique');
  }
}

/**
 * Afficher modal historique
 */
function displayClientHistoryModal(client, mouvements) {
  const html = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${client.nom}</h3>
        <button onclick="document.getElementById('history-modal').style.display='none'" class="btn-close">✕</button>
      </div>
      
      <div class="modal-stats">
        <div class="stat">
          <div>Solde actuel</div>
          <div style="font-size: 24px; font-weight: 900; color: #2979FF">${formatCurrency(client.solde_credit)}</div>
        </div>
        <div class="stat">
          <div>Limite</div>
          <div style="font-size: 24px; font-weight: 900">${formatCurrency(client.limite_credit)}</div>
        </div>
        <div class="stat">
          <div>Disponible</div>
          <div style="font-size: 24px; font-weight: 900; color: #00C853">${formatCurrency(Math.max(0, client.limite_credit - client.solde_credit))}</div>
        </div>
      </div>

      <div class="modal-history">
        <h4>Historique</h4>
        ${mouvements.map(mouvement => {
          const icon = mouvement.type === 'achat' ? '🛍️' : mouvement.type === 'paiement' ? '💵' : '📝';
          const couleur = mouvement.type === 'achat' ? '#FF3D00' : '#00C853';

          return `
            <div class="history-entry">
              <div class="entry-icon">${icon}</div>
              <div class="entry-info">
                <div class="entry-type">${mouvement.type === 'achat' ? 'Achat' : 'Paiement'}</div>
                <div class="entry-date">${formatDate(mouvement.created_at)}</div>
                <div class="entry-reason">${mouvement.raison}</div>
              </div>
              <div class="entry-amount" style="color: ${couleur}">
                ${mouvement.type === 'achat' ? '+' : '-'}${formatCurrency(mouvement.montant)}
              </div>
              <div class="entry-balance">
                Solde: ${formatCurrency(mouvement.solde_apres)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.innerHTML = html;
    modal.style.display = 'flex';
  }
}

/**
 * Ouvrir formulaire paiement client
 */
function openPaymentClientForm(clientId, clientNom) {
  document.getElementById('payment-client-id').value = clientId;
  document.getElementById('payment-client-name').textContent = clientNom;
  document.getElementById('payment-credit-amount').value = '';
  goScreen('s-credit-payment');
}

/**
 * Enregistrer paiement client
 */
async function saveCreditPayment() {
  const clientId = document.getElementById('payment-client-id').value;
  const montant = parseFloat(document.getElementById('payment-credit-amount').value) || 0;
  const type = document.getElementById('payment-credit-type').value;

  if (!clientId || montant <= 0) {
    showToast('⚠️ Montant invalide');
    return;
  }

  setButtonLoading('btn-save-credit-payment', true);
  const result = await recordCreditPayment(clientId, montant, type);
  setButtonLoading('btn-save-credit-payment', false);

  if (result) {
    goScreen('s-dashboard-patron');
    loadPatronDashboard();
  }
}

/**
 * Créer alerte crédit (relance)
 */
async function createCreditReminder(clientId, type = 'rappel') {
  try {
    const { data: client } = await sb
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!client) return;

    const message = type === 'rappel' 
      ? `Rappel: Vous devez ${formatCurrency(client.solde_credit)} à ${APP_STATE.boutique.nom}`
      : `Dernier avertissement: Réglez ${formatCurrency(client.solde_credit)} rapidement`;

    const { error } = await sb.from('rappels_credit').insert({
      boutique_id: APP_STATE.boutique.id,
      client_id: clientId,
      type,
      montant_du: client.solde_credit,
      message,
      lue: false
    });

    if (error) throw error;

    showToast(`✅ ${type === 'rappel' ? 'Rappel' : 'Avertissement'} créé`);
  } catch (err) {
    console.error('Erreur création relance:', err);
    showToast('❌ Erreur');
  }
}
