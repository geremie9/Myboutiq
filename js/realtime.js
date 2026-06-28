// ============================================
// SUPABASE REALTIME - Synchronisation temps réel
// ============================================

let realtimeSubscriptions = {};

/**
 * S'abonner aux changements articles en temps réel
 */
function subscribeToArticles(boutiqueId, callback) {
  if (realtimeSubscriptions.articles) {
    sb.removeChannel(realtimeSubscriptions.articles);
  }

  realtimeSubscriptions.articles = sb
    .channel(`articles:boutique_id=eq.${boutiqueId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: `boutique_id=eq.${boutiqueId}`
      },
      (payload) => {
        console.log('🔄 Articles mis à jour:', payload);
        callback(payload);
      }
    )
    .subscribe();
}

/**
 * S'abonner aux changements transactions en temps réel
 */
function subscribeToTransactions(boutiqueId, callback) {
  if (realtimeSubscriptions.transactions) {
    sb.removeChannel(realtimeSubscriptions.transactions);
  }

  realtimeSubscriptions.transactions = sb
    .channel(`transactions:boutique_id=eq.${boutiqueId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `boutique_id=eq.${boutiqueId}`
      },
      (payload) => {
        console.log('💰 Nouvelle transaction:', payload);
        callback(payload);
      }
    )
    .subscribe();
}

/**
 * S'abonner aux alertes stock en temps réel
 */
function subscribeToAlerts(boutiqueId, callback) {
  if (realtimeSubscriptions.alerts) {
    sb.removeChannel(realtimeSubscriptions.alerts);
  }

  realtimeSubscriptions.alerts = sb
    .channel(`alerts:boutique_id=eq.${boutiqueId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alertes_stock',
        filter: `boutique_id=eq.${boutiqueId}`
      },
      (payload) => {
        console.log('⚠️ Alerte stock:', payload);
        callback(payload);
      }
    )
    .subscribe();
}

/**
 * S'abonner aux mouvements de stock
 */
function subscribeToStockMovements(boutiqueId, callback) {
  if (realtimeSubscriptions.movements) {
    sb.removeChannel(realtimeSubscriptions.movements);
  }

  realtimeSubscriptions.movements = sb
    .channel(`movements:boutique_id=eq.${boutiqueId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mouvements_stock',
        filter: `boutique_id=eq.${boutiqueId}`
      },
      (payload) => {
        console.log('📦 Mouvement stock:', payload);
        callback(payload);
      }
    )
    .subscribe();
}

/**
 * Nettoyer tous les abonnements
 */
function unsubscribeAll() {
  Object.keys(realtimeSubscriptions).forEach(key => {
    if (realtimeSubscriptions[key]) {
      sb.removeChannel(realtimeSubscriptions[key]);
    }
  });
  realtimeSubscriptions = {};
}

/**
 * Créer une alerte stock automatiquement
 */
async function createStockAlert(boutiqueId, articleId, type = 'stock_bas') {
  try {
    await sb.from('alertes_stock').insert({
      boutique_id: boutiqueId,
      article_id: articleId,
      type,
      lue: false
    });
  } catch (err) {
    console.error('Erreur création alerte:', err);
  }
}

/**
 * Marquer alerte comme lue
 */
async function markAlertAsRead(alertId) {
  try {
    await sb
      .from('alertes_stock')
      .update({ lue: true })
      .eq('id', alertId);
  } catch (err) {
    console.error('Erreur marquage alerte:', err);
  }
}
