import { I18N } from './i18n.js';
import {
  DEFAULT_INVENTORY,
  RECIPE_DATABASE,
  QUICK_ITEMS,
  DEFAULT_MEMBERS,
  INGREDIENT_CATALOG,
  normalizeIngredientName,
  getFutureDate
} from './data.js';
import { getPhotoCandidates, readPhotoFile } from './vision.js';
import {
  getStoredSession,
  signInWithEmail,
  signUpWithEmail,
  signOutSession,
  syncInventoryToSupabase
} from './supabase.js';

function getStorageKeys(session) {
  const scope = session?.familyGroupId || 'guest';
  return {
    inventory: `shokutaku_${scope}_inventory`,
    meals: `shokutaku_${scope}_meals`,
    members: `shokutaku_${scope}_members`,
    lang: 'shokutaku_global_lang'
  };
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function daysRemaining(dateStr) {
  if (!dateStr) return 999;
  const todayStr = new Date().toISOString().split('T')[0];
  const a = Date.parse(`${todayStr}T12:00:00Z`);
  const b = Date.parse(`${dateStr}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function roundQty(n) {
  return Math.max(0, Math.round(n * 100) / 100);
}

function getAppetiteMultiplier(level) {
  if (level === 'small') return 0.75;
  if (level === 'large') return 1.3;
  return 1.0;
}

function calcMemberTargets(member) {
  const mult = getAppetiteMultiplier(member?.appetiteLevel);
  const ageFactor = member && member.age < 15 ? 0.85 : 1.0;
  const genderFactor = member?.gender === 'female' ? 0.9 : 1.0;
  const factor = mult * ageFactor * genderFactor;

  return {
    calories: Math.round(2100 * factor),
    protein: Math.round(65 * factor),
    fat: Math.round(55 * factor),
    carbs: Math.round(270 * factor)
  };
}

const initialSession = getStoredSession();
const initialKeys = getStorageKeys(initialSession);

let state = {
  session: initialSession,
  guestEntered: false,
  authMode: 'login',
  lang: loadJSON(initialKeys.lang, 'ja'),
  activeTab: 'inventory',
  inventory: loadJSON(initialKeys.inventory, DEFAULT_INVENTORY),
  mealLogs: loadJSON(initialKeys.meals, []),
  members: loadJSON(initialKeys.members, DEFAULT_MEMBERS),
  selectedMemberId: null,
  recentlyAddedNames: new Set(),
  dietFilter: 'all',
  allergyExclude: 'none',
  categoryFilter: 'すべて',
  searchQuery: '',
  servings: 2,
  recipeFilter: 'all',
  selectedPhotoCandidates: new Set()
};

state.selectedMemberId = state.members[0]?.id || null;

function reloadScopedData() {
  const keys = getStorageKeys(state.session);
  state.inventory = loadJSON(keys.inventory, DEFAULT_INVENTORY);
  state.mealLogs = loadJSON(keys.meals, []);
  state.members = loadJSON(keys.members, DEFAULT_MEMBERS);
  state.selectedMemberId = state.members[0]?.id || null;
}

function saveState() {
  const keys = getStorageKeys(state.session);
  localStorage.setItem(keys.inventory, JSON.stringify(state.inventory));
  localStorage.setItem(keys.meals, JSON.stringify(state.mealLogs));
  localStorage.setItem(keys.members, JSON.stringify(state.members));
  localStorage.setItem(keys.lang, JSON.stringify(state.lang));

  if (state.session) {
    syncInventoryToSupabase(state.inventory, state.session).catch(() => {});
  }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 3200);
}

function populateCatalogDatalist() {
  const dl = document.getElementById('ingredientCatalogList');
  dl.innerHTML = INGREDIENT_CATALOG
    .map(item => `<option value="${item.name}">${item.category} (${item.unit})</option>`)
    .join('');
}

function applyLanguage() {
  const dict = I18N[state.lang] || I18N.ja;
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
}

// 認証ゲート画面とメイン画面の表示切替
function renderAuthUI() {
  const gateScreen = document.getElementById('authGateScreen');
  const mainShell = document.getElementById('mainAppShell');
  const badge = document.getElementById('authStatusBadge');
  const loginBtn = document.getElementById('openAuthModalBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const inviteCodeEl = document.getElementById('familyInviteCode');

  const isAuthenticatedOrGuest = Boolean(state.session) || state.guestEntered;

  if (!isAuthenticatedOrGuest) {
    gateScreen.classList.remove('hidden');
    mainShell.classList.add('hidden');
    return;
  }

  gateScreen.classList.add('hidden');
  mainShell.classList.remove('hidden');

  if (state.session) {
    badge.textContent = `👤 ${state.session.displayName} (${state.session.familyGroupId})`;
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    inviteCodeEl.textContent = state.session.familyGroupId;
  } else {
    badge.textContent = 'ゲスト利用中';
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    logoutBtn.textContent = 'ログイン画面へ';
    inviteCodeEl.textContent = 'FAM-KOBE-2026';
  }
}

function addIngredient({ name, category, quantity, unit, expiryDate, dietaryTags }) {
  const normalizedName = normalizeIngredientName(name);
  if (!normalizedName) return;

  const catalogMatch = INGREDIENT_CATALOG.find(c => c.name === normalizedName);
  const resolvedCategory = category || catalogMatch?.category || '野菜・きのこ';
  const resolvedUnit = (unit || '').trim() || catalogMatch?.unit || '個';
  const resolvedTags = dietaryTags?.length ? dietaryTags : (catalogMatch?.dietaryTags || []);
  const resolvedAllergens = catalogMatch?.allergens || [];
  const addQty = roundQty(Number(quantity) || 1);

  const existing = state.inventory.find(
    i => normalizeIngredientName(i.name) === normalizedName && i.unit === resolvedUnit
  );

  if (existing) {
    existing.quantity = roundQty(existing.quantity + addQty);
    if (expiryDate) existing.expiryDate = expiryDate;
  } else {
    state.inventory.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: normalizedName,
      category: resolvedCategory,
      quantity: addQty,
      unit: resolvedUnit,
      expiryDate: expiryDate || getFutureDate(catalogMatch?.days || 7),
      allergens: resolvedAllergens,
      dietaryTags: resolvedTags
    });
  }

  state.recentlyAddedNames.add(normalizedName);
  saveState();
  render();

  const readyCount = computeRecipeMatches().filter(r => r.canCook).length;
  showToast(`「${normalizedName}」を追加しました（今すぐ作れるメニュー: ${readyCount}件）`);
}

function renderExpiryAlert() {
  const banner = document.getElementById('expiryAlert');
  const nearCount = state.inventory.filter(i => i.quantity > 0 && daysRemaining(i.expiryDate) <= 3).length;
  if (nearCount > 0) {
    banner.classList.remove('hidden');
    banner.innerHTML = `<strong>賞味期限が3日以内の食材が ${nearCount} 件あります。</strong> 「② メニュー提案」から早めに消費しましょう。`;
  } else {
    banner.classList.add('hidden');
  }
}

function renderQuickAdd() {
  const wrap = document.getElementById('quickAddButtons');
  wrap.innerHTML = '';
  QUICK_ITEMS.forEach(q => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = `+ ${q.name} (${q.quantity}${q.unit})`;
    btn.addEventListener('click', () => {
      addIngredient({
        name: q.name,
        category: q.category,
        quantity: q.quantity,
        unit: q.unit,
        expiryDate: getFutureDate(q.days)
      });
    });
    wrap.appendChild(btn);
  });
}

function renderInventory() {
  renderExpiryAlert();
  const grid = document.getElementById('inventoryGrid');
  const q = state.searchQuery.trim().toLowerCase();

  const items = state.inventory.filter(item => {
    const catOk = state.categoryFilter === 'すべて' || item.category === state.categoryFilter;
    const searchOk = !q || item.name.toLowerCase().includes(q);
    const dietOk = state.dietFilter === 'all' || (item.dietaryTags || []).includes(state.dietFilter);
    const allergyOk = state.allergyExclude === 'none' || !(item.allergens || []).includes(state.allergyExclude);
    return catOk && searchOk && dietOk && allergyOk;
  });

  grid.innerHTML = '';
  items.forEach(item => {
    const d = daysRemaining(item.expiryDate);
    const card = document.createElement('div');
    card.className = `item-card ${d < 0 ? 'expired' : d <= 3 ? 'warn' : ''}`;
    card.innerHTML = `
      <div>
        <div style="display:flex;justify-content:space-between;gap:6px;margin-bottom:6px;">
          <span class="badge">${item.category}</span>
          <span class="badge ${d <= 3 ? 'warn' : ''}">${d < 0 ? `${Math.abs(d)}日前切れ` : `あと${d}日`}</span>
        </div>
        <h3 style="margin:0;font-size:1rem;">${item.name}</h3>
      </div>
      <div class="qty-controls">
        <div class="qty-stepper">
          <button type="button" class="btn btn-sm btn-ghost" data-dec="${item.id}">-</button>
          <strong>${item.quantity} ${item.unit}</strong>
          <button type="button" class="btn btn-sm btn-ghost" data-inc="${item.id}">+</button>
        </div>
        <button type="button" class="btn btn-sm btn-ghost" data-del="${item.id}">削除</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-dec');
    state.inventory = state.inventory.map(i => i.id === id ? { ...i, quantity: roundQty(i.quantity - 1) } : i);
    saveState();
    render();
  }));

  grid.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-inc');
    state.inventory = state.inventory.map(i => i.id === id ? { ...i, quantity: roundQty(i.quantity + 1) } : i);
    saveState();
    render();
  }));

  grid.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-del');
    state.inventory = state.inventory.filter(i => i.id !== id);
    saveState();
    render();
    showToast('食材を削除しました');
  }));
}

function computeRecipeMatches() {
  const mult = Number(state.servings) || 1;

  return RECIPE_DATABASE
    .filter(r => state.dietFilter === 'all' || (r.dietaryTags || []).includes(state.dietFilter))
    .filter(r => state.allergyExclude === 'none' || !(r.allergens || []).includes(state.allergyExclude))
    .map(r => {
      let okCount = 0;
      let usesRecentIngredient = false;

      const details = r.ingredients.map(ing => {
        const normIng = normalizeIngredientName(ing.name);
        if (state.recentlyAddedNames.has(normIng)) {
          usesRecentIngredient = true;
        }
        const needed = roundQty(ing.amount * mult);
        const found = state.inventory.find(i => normalizeIngredientName(i.name) === normIng);
        const stock = found ? found.quantity : 0;
        const isEnough = stock >= needed;
        if (isEnough) okCount++;
        return { ...ing, name: normIng, needed, stock, isEnough };
      });

      const missingCount = details.length - okCount;
      const pct = Math.round((okCount / details.length) * 100);
      return { ...r, details, missingCount, pct, canCook: missingCount === 0, usesRecentIngredient };
    })
    .sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      return Number(b.usesRecentIngredient) - Number(a.usesRecentIngredient);
    });
}

function renderRecipes() {
  const grid = document.getElementById('recipeGrid');
  const mult = Number(state.servings) || 1;

  const matched = computeRecipeMatches().filter(r => {
    if (state.recipeFilter === 'ready') return r.canCook;
    if (state.recipeFilter === 'almost') return r.missingCount === 1;
    if (state.recipeFilter === 'recent') return r.usesRecentIngredient;
    return true;
  });

  grid.innerHTML = '';
  matched.forEach(r => {
    const card = document.createElement('div');
    card.className = `recipe-card ${r.usesRecentIngredient ? 'highlight-recent' : ''}`;
    const ingHtml = r.details.map(d =>
      `<div>${d.name}: <strong>${d.needed}${d.unit}</strong> <span class="badge ${d.isEnough ? 'ok' : 'warn'}">${d.isEnough ? 'OK' : `残${d.stock}`}</span></div>`
    ).join('');

    card.innerHTML = `
      <div>
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">
          <div style="display:flex;gap:6px;align-items:center;">
            <span class="badge">${r.category} / ${r.cookingTime}分</span>
            ${r.usesRecentIngredient ? '<span class="badge new-match">追加食材を使用</span>' : ''}
          </div>
          <span class="badge ${r.canCook ? 'ok' : 'warn'}">${r.canCook ? '100% 作れます' : `あと${r.missingCount}品 (${r.pct}%)`}</span>
        </div>
        <h3 style="margin:0 0 4px;">${r.title} (${mult}人前)</h3>
        <p class="muted" style="margin-bottom:10px;">${r.description}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8rem;margin-bottom:10px;">${ingHtml}</div>
        <div style="font-size:0.78rem;color:#475569;">
          🔥 ${r.nutrition.calories * mult} kcal / P ${r.nutrition.protein * mult}g / F ${r.nutrition.fat * mult}g / C ${r.nutrition.carbs * mult}g
        </div>
      </div>
      <button type="button" class="btn btn-primary" data-cook="${r.id}">このメニューを作る（${mult}人前）</button>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('[data-cook]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recipe = RECIPE_DATABASE.find(x => x.id === btn.getAttribute('data-cook'));
      if (!recipe) return;
      state.inventory = state.inventory.map(inv => {
        const req = recipe.ingredients.find(x => normalizeIngredientName(x.name) === normalizeIngredientName(inv.name));
        if (!req) return inv;
        return { ...inv, quantity: roundQty(inv.quantity - req.amount * mult) };
      });
      const member = state.members.find(m => m.id === state.selectedMemberId);
      state.mealLogs.unshift({
        id: `log-${Date.now()}`,
        recipeTitle: recipe.title,
        memberName: member ? member.name : '全員',
        servings: mult,
        date: new Date().toISOString().split('T')[0],
        nutrition: {
          calories: recipe.nutrition.calories * mult,
          protein: recipe.nutrition.protein * mult,
          fat: recipe.nutrition.fat * mult,
          carbs: recipe.nutrition.carbs * mult
        }
      });
      saveState();
      render();
      showToast(`「${recipe.title}」を記録し、在庫を更新しました`);
    });
  });
}

function renderNutrition() {
  const memberSelect = document.getElementById('activeMemberSelect');
  memberSelect.innerHTML = state.members
    .map(m => `<option value="${m.id}" ${m.id === state.selectedMemberId ? 'selected' : ''}>${m.name} (${m.age}歳 / ${m.gender === 'female' ? '女性' : m.gender === 'male' ? '男性' : 'その他'})</option>`)
    .join('');

  const activeMember = state.members.find(m => m.id === state.selectedMemberId) || state.members[0];
  const targets = calcMemberTargets(activeMember);
  document.getElementById('targetSummaryText').textContent =
    `対象: ${activeMember ? activeMember.name : '標準'}（食べる量: ${activeMember?.appetiteLevel || 'normal'}）→ 目標 ${targets.calories} kcal`;

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = state.mealLogs.filter(l => l.date === today);
  const totals = todayLogs.reduce((acc, l) => ({
    calories: acc.calories + (l.nutrition?.calories || 0),
    protein: acc.protein + (l.nutrition?.protein || 0),
    fat: acc.fat + (l.nutrition?.fat || 0),
    carbs: acc.carbs + (l.nutrition?.carbs || 0)
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const metrics = [
    { label: 'エネルギー', cur: totals.calories, max: targets.calories, unit: 'kcal' },
    { label: 'たんぱく質 (P)', cur: totals.protein, max: targets.protein, unit: 'g' },
    { label: '脂質 (F)', cur: totals.fat, max: targets.fat, unit: 'g' },
    { label: '炭水化物 (C)', cur: totals.carbs, max: targets.carbs, unit: 'g' }
  ];

  const barsEl = document.getElementById('nutritionBars');
  barsEl.innerHTML = metrics.map(m => {
    const pct = Math.min(100, Math.round((m.cur / Math.max(1, m.max)) * 100));
    return `
      <div class="card" style="margin:0;">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;">
          <span>${m.label}</span>
          <span>${m.cur} / ${m.max} ${m.unit}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');

  const logsEl = document.getElementById('mealLogsList');
  if (!todayLogs.length) {
    logsEl.innerHTML = '<p class="muted">本日の食事記録はまだありません。</p>';
    return;
  }
  logsEl.innerHTML = todayLogs.map(l => `
    <div class="log-row">
      <div>
        <strong>${l.recipeTitle}</strong> <span class="badge">${l.servings || 1}人前 / ${l.memberName || '全員'}</span>
        <div class="muted">${l.nutrition.calories} kcal | P ${l.nutrition.protein}g | F ${l.nutrition.fat}g | C ${l.nutrition.carbs}g</div>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" data-del-log="${l.id}">削除</button>
    </div>
  `).join('');

  logsEl.querySelectorAll('[data-del-log]').forEach(b => b.addEventListener('click', () => {
    state.mealLogs = state.mealLogs.filter(x => x.id !== b.getAttribute('data-del-log'));
    saveState();
    render();
  }));
}

function renderMembersModal() {
  const list = document.getElementById('membersList');
  list.innerHTML = state.members.map(m => `
    <div class="member-row">
      <div>
        <strong>${m.name}</strong> — ${m.age}歳 / ${m.gender === 'female' ? '女性' : m.gender === 'male' ? '男性' : 'その他'} / 食べる量: ${m.appetiteLevel}
      </div>
      ${state.members.length > 1 ? `<button type="button" class="btn btn-sm btn-ghost" data-del-member="${m.id}">削除</button>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('[data-del-member]').forEach(b => b.addEventListener('click', () => {
    state.members = state.members.filter(x => x.id !== b.getAttribute('data-del-member'));
    if (!state.members.some(x => x.id === state.selectedMemberId)) {
      state.selectedMemberId = state.members[0]?.id || null;
    }
    saveState();
    render();
    renderMembersModal();
  }));
}

function renderPhotoCandidates() {
  const wrap = document.getElementById('photoCandidates');
  const candidates = getPhotoCandidates();
  wrap.innerHTML = '';
  candidates.forEach((c, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip ${state.selectedPhotoCandidates.has(idx) ? 'selected' : ''}`;
    btn.textContent = `${c.name} (${c.quantity}${c.unit})`;
    btn.addEventListener('click', () => {
      if (state.selectedPhotoCandidates.has(idx)) {
        state.selectedPhotoCandidates.delete(idx);
      } else {
        state.selectedPhotoCandidates.add(idx);
      }
      renderPhotoCandidates();
    });
    wrap.appendChild(btn);
  });
}

function render() {
  applyLanguage();
  renderAuthUI();
  renderInventory();
  renderRecipes();
  renderNutrition();
}

function setGateAuthMode(mode) {
  state.authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('gateModeLoginBtn').classList.toggle('active', !isSignup);
  document.getElementById('gateModeSignupBtn').classList.toggle('active', isSignup);
  document.getElementById('gateSubmitBtn').textContent = isSignup ? '新規登録して始める' : 'ログインして始める';
  document.getElementById('gateNameLabel').classList.toggle('hidden', !isSignup);
  document.getElementById('gateFamilyLabel').classList.toggle('hidden', !isSignup);
  document.getElementById('gateErrorBox').classList.add('hidden');
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${state.activeTab}`));
    });
  });

  // 初期ログイン・新規登録ゲート画面のイベント
  document.getElementById('gateModeLoginBtn').addEventListener('click', () => setGateAuthMode('login'));
  document.getElementById('gateModeSignupBtn').addEventListener('click', () => setGateAuthMode('signup'));

  document.getElementById('gateAuthForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('gateEmail').value.trim();
    const password = document.getElementById('gatePassword').value;
    const errBox = document.getElementById('gateErrorBox');
    errBox.classList.add('hidden');

    const result = state.authMode === 'signup'
      ? await signUpWithEmail({
          email,
          password,
          displayName: document.getElementById('gateDisplayName').value,
          familyGroupId: document.getElementById('gateFamilyCode').value
        })
      : await signInWithEmail(email, password);

    if (!result.ok) {
      errBox.textContent = result.error;
      errBox.classList.remove('hidden');
      return;
    }

    state.session = result.session;
    state.guestEntered = false;
    reloadScopedData();
    e.target.reset();
    render();
    showToast(`${state.session.displayName} としてログインしました`);
  });

  document.getElementById('continueAsGuestBtn').addEventListener('click', () => {
    state.guestEntered = true;
    reloadScopedData();
    render();
    showToast('ゲストモードで開始しました');
  });

  document.getElementById('openAuthModalBtn').addEventListener('click', () => {
    state.guestEntered = false;
    setGateAuthMode('login');
    render();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    signOutSession();
    state.session = null;
    state.guestEntered = false;
    reloadScopedData();
    setGateAuthMode('login');
    render();
    showToast('ログアウトしました');
  });

  // 食材入力時の自動補完
  document.getElementById('newItemName').addEventListener('input', e => {
    const norm = normalizeIngredientName(e.target.value);
    const found = INGREDIENT_CATALOG.find(c => c.name === norm);
    if (!found) return;
    document.getElementById('newItemCategory').value = found.category;
    document.getElementById('newItemUnit').value = found.unit;
    document.getElementById('newItemExpiry').value = getFutureDate(found.days);
    document.querySelectorAll('.new-item-tag').forEach(cb => {
      cb.checked = (found.dietaryTags || []).includes(cb.value);
    });
  });

  document.getElementById('langSelect').value = state.lang;
  document.getElementById('langSelect').addEventListener('change', e => {
    state.lang = e.target.value;
    saveState();
    render();
  });

  document.querySelectorAll('#dietaryChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.dietFilter = chip.getAttribute('data-diet');
      document.querySelectorAll('#dietaryChips .chip').forEach(c => c.classList.toggle('active', c === chip));
      render();
    });
  });

  document.getElementById('allergyExcludeSelect').addEventListener('change', e => {
    state.allergyExclude = e.target.value;
    render();
  });

  document.querySelectorAll('#categoryChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.categoryFilter = chip.getAttribute('data-category');
      document.querySelectorAll('#categoryChips .chip').forEach(c => c.classList.toggle('active', c === chip));
      renderInventory();
    });
  });

  document.getElementById('inventorySearch').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderInventory();
  });

  document.getElementById('servingCountSelect').addEventListener('change', e => {
    state.servings = Number(e.target.value);
    renderRecipes();
  });

  document.getElementById('recipeFilterSelect').addEventListener('change', e => {
    state.recipeFilter = e.target.value;
    renderRecipes();
  });

  document.getElementById('activeMemberSelect').addEventListener('change', e => {
    state.selectedMemberId = e.target.value;
    renderNutrition();
  });

  document.getElementById('openAddModalBtn').addEventListener('click', () => {
    document.getElementById('newItemExpiry').value = getFutureDate(7);
    document.getElementById('addItemModal').classList.remove('hidden');
  });

  document.querySelectorAll('.expiry-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('newItemExpiry').value = getFutureDate(Number(btn.getAttribute('data-days')));
    });
  });

  document.getElementById('addItemForm').addEventListener('submit', e => {
    e.preventDefault();
    const checkedTags = Array.from(document.querySelectorAll('.new-item-tag:checked')).map(cb => cb.value);
    addIngredient({
      name: document.getElementById('newItemName').value,
      category: document.getElementById('newItemCategory').value,
      quantity: document.getElementById('newItemQty').value,
      unit: document.getElementById('newItemUnit').value,
      expiryDate: document.getElementById('newItemExpiry').value,
      dietaryTags: checkedTags
    });
    e.target.reset();
    document.getElementById('addItemModal').classList.add('hidden');
  });

  document.getElementById('openPhotoModalBtn').addEventListener('click', () => {
    state.selectedPhotoCandidates.clear();
    renderPhotoCandidates();
    document.getElementById('photoModal').classList.remove('hidden');
  });

  document.getElementById('photoFileInput').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readPhotoFile(file);
    const img = document.getElementById('photoPreview');
    img.src = dataUrl;
    img.classList.remove('hidden');
    state.selectedPhotoCandidates = new Set([0, 1, 2]);
    renderPhotoCandidates();
  });

  document.getElementById('applyPhotoCandidatesBtn').addEventListener('click', () => {
    const candidates = getPhotoCandidates();
    state.selectedPhotoCandidates.forEach(idx => {
      const c = candidates[idx];
      if (c) {
        addIngredient({
          name: c.name,
          category: c.category,
          quantity: c.quantity,
          unit: c.unit,
          expiryDate: getFutureDate(c.days)
        });
      }
    });
    document.getElementById('photoModal').classList.add('hidden');
  });

  document.getElementById('openMembersBtn').addEventListener('click', () => {
    renderMembersModal();
    document.getElementById('membersModal').classList.remove('hidden');
  });

  document.getElementById('addMemberForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('memberName').value.trim();
    const age = Number(document.getElementById('memberAge').value);
    const gender = document.getElementById('memberGender').value;
    const appetiteLevel = document.getElementById('memberAppetite').value;
    if (!name || Number.isNaN(age)) return;
    state.members.push({
      id: `m-${Date.now()}`,
      name,
      age,
      gender,
      appetiteLevel
    });
    saveState();
    render();
    renderMembersModal();
    e.target.reset();
    showToast(`メンバー「${name}」を追加しました`);
  });

  document.getElementById('copyInviteBtn').addEventListener('click', async () => {
    const code = document.getElementById('familyInviteCode').textContent;
    await navigator.clipboard?.writeText(code).catch(() => {});
    showToast('共有コードをコピーしました');
  });

  document.getElementById('joinFamilyBtn').addEventListener('click', () => {
    const code = document.getElementById('joinFamilyInput').value.trim();
    if (!code) return;
    if (!state.session) {
      state.session = {
        user: { id: 'guest-joined', email: 'guest@local' },
        displayName: 'ゲスト',
        familyGroupId: code,
        mode: 'local-auth'
      };
    } else {
      state.session.familyGroupId = code;
    }
    reloadScopedData();
    render();
    renderMembersModal();
    showToast(`グループ「${code}」に参加しました`);
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.getAttribute('data-close')).classList.add('hidden');
    });
  });
}

populateCatalogDatalist();
renderQuickAdd();
bindEvents();
render();