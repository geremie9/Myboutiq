// ============================================
// GESTION AUTHENTIFICATION
// ============================================

/**
 * Créer une nouvelle boutique
 */
async function createShop() {
  const nom = document.getElementById('su-nom')?.value?.trim();
  const tel = document.getElementById('su-tel')?.value?.trim();
  const pin = document.getElementById('su-pin')?.value?.trim();

  if (!nom) {
    showToast('⚠️ Entre le nom de ta boutique');
    return;
  }
  if (!isValidPin(pin, 4)) {
    showToast('⚠️ PIN minimum 4 chiffres');
    return;
  }

  setButtonLoading('btn-create-shop', true);

  try {
    // Générer un code unique
    let code;
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 10) {
      code = generateShopCode();
      const { data } = await sb
        .from('boutiques')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      exists = !!data;
      attempts++;
    }

    if (exists) throw new Error('Impossible de générer un code unique');

    // Créer la boutique
    const { data: boutique, error } = await sb
      .from('boutiques')
      .insert({
        nom,
        telephone: tel,
        pin,
        code,
        devise_symbole: 'F',
        devise_code: 'XOF',
        langue: 'fr',
        pays: 'CI'
      })
      .select()
      .single();

    if (error) throw error;

    // Articles de démo
    await sb.from('articles').insert([
      {
        boutique_id: boutique.id,
        nom: 'Eau minérale',
        emoji: '💧',
        categorie: 'Boissons',
        prix_vente: 200,
        prix_achat: 150,
        stock: 50,
        alerte_stock: 10
      },
      {
        boutique_id: boutique.id,
        nom: 'Savon',
        emoji: '🧼',
        categorie: 'Ménage',
        prix_vente: 300,
        prix_achat: 180,
        stock: 25,
        alerte_stock: 5
      }
    ]);

    APP_STATE.boutique = boutique;
    saveSession(boutique.id, null, 'patron');
    
    showToast(`✅ Boutique créée ! Code: ${code}`);
    
    setTimeout(() => {
      goScreen('s-login');
      document.getElementById('login-sub').textContent = `Boutique : ${nom}`;
    }, 1200);

  } catch (err) {
    console.error('Erreur création boutique:', err);
    showToast(`❌ Erreur : ${err.message}`);
  } finally {
    setButtonLoading('btn-create-shop', false);
  }
}

/**
 * Login Patron
 */
async function loginPatron() {
  const pin = document.getElementById('lp-pin')?.value?.trim();

  if (!APP_STATE.boutique) {
    showToast('❌ Aucune boutique chargée');
    return;
  }

  if (pin !== APP_STATE.boutique.pin) {
    showToast('❌ PIN incorrect');
    return;
  }

  APP_STATE.role = 'patron';
  APP_STATE.vendeur = null;
  saveSession(APP_STATE.boutique.id, null, 'patron');
  
  showToast('✅ Connecté en tant que Patron');
  goScreen('s-dashboard-patron');
  loadPatronDashboard();
}

/**
 * Login Vendeur
 */
async function loginVendeur() {
  const code = document.getElementById('lv-code')?.value?.trim();
  const nom = document.getElementById('lv-nom')?.value?.trim();
  const pin = document.getElementById('lv-pin')?.value?.trim();

  if (!isValidCode(code)) {
    showToast('⚠️ Code boutique invalide (6 chiffres)');
    return;
  }
  if (!nom) {
    showToast('⚠️ Entre ton prénom');
    return;
  }
  if (!isValidPin(pin, 4)) {
    showToast('⚠️ PIN minimum 4 chiffres');
    return;
  }

  setButtonLoading('btn-login-vendeur', true);

  try {
    // Chercher la boutique par code
    const { data: boutique, error: err1 } = await sb
      .from('boutiques')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (err1 || !boutique) {
      showToast(`❌ Code boutique introuvable : ${code}`);
      return;
    }

    // Chercher ou créer le vendeur
    const { data: vendeurs } = await sb
      .from('vendeurs')
      .select('*')
      .eq('boutique_id', boutique.id)
      .eq('nom', nom);

    let vendeur = vendeurs?.[0];

    if (!vendeur) {
      // Créer nouveau vendeur
      const { data: newVendeur, error: err2 } = await sb
        .from('vendeurs')
        .insert({
          boutique_id: boutique.id,
          nom,
          pin,
          role: 'vendeur',
          actif: true
        })
        .select()
        .single();

      if (err2) throw err2;
      vendeur = newVendeur;
    } else {
      // Vérifier PIN
      if (vendeur.pin !== pin) {
        showToast('❌ PIN vendeur incorrect');
        return;
      }
    }

    APP_STATE.boutique = boutique;
    APP_STATE.vendeur = vendeur;
    APP_STATE.role = 'vendeur';
    saveSession(boutique.id, vendeur.id, 'vendeur');

    showToast(`✅ Connecté - Bienvenue ${nom}`);
    goScreen('s-caisse');
    loadCaisse();

  } catch (err) {
    console.error('Erreur login vendeur:', err);
    showToast(`❌ Erreur : ${err.message}`);
  } finally {
    setButtonLoading('btn-login-vendeur', false);
  }
}

/**
 * Logout
 */
function logout() {
  APP_STATE.boutique = null;
  APP_STATE.vendeur = null;
  APP_STATE.role = null;
  clearSession();
  
  // Réinitialiser formulaires
  document.querySelectorAll('input[type="password"], input[type="text"]').forEach(input => {
    input.value = '';
  });
  
  goScreen('s-login');
  showToast('👋 Déconnecté');
}

/**
 * Charger boutique depuis session
 */
async function loadShopFromSession() {
  const session = loadSession();
  
  if (session.boutiqueId) {
    try {
      const { data: boutique } = await sb
        .from('boutiques')
        .select('*')
        .eq('id', session.boutiqueId)
        .maybeSingle();

      if (boutique) {
        APP_STATE.boutique = boutique;
        APP_STATE.role = session.role || 'patron';
        
        if (session.vendeurId) {
          const { data: vendeur } = await sb
            .from('vendeurs')
            .select('*')
            .eq('id', session.vendeurId)
            .maybeSingle();
          APP_STATE.vendeur = vendeur;
        }
        
        return true;
      }
    } catch (err) {
      console.error('Erreur chargement session:', err);
    }
  }
  
  clearSession();
  return false;
}
