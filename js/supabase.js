// Supabase Auth & REST 連携モジュール
export const SUPABASE_CONFIG = {
  url: 'https://tddgcmpamsqosuvgkcui.supabase.co',
  anonKey: 'YOUR_FULL_PUBLISHABLE_KEY' // Publishable key の全文をここに貼り付け
};

const SESSION_KEY = 'shokutaku_supabase_session';

export function isSupabaseConfigured() {
  return (
    SUPABASE_CONFIG.url.startsWith('https://') &&
    !SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID') &&
    !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE_ANON_KEY') &&
    !SUPABASE_CONFIG.anonKey.includes('YOUR_FULL_PUBLISHABLE_KEY')
  );
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function ensureProfileRow({ accessToken, userId, email, displayName, familyGroupId }) {
  if (!isSupabaseConfigured() || !accessToken || !userId) return;
  await fetch(`${SUPABASE_CONFIG.url}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: userId,
      email,
      display_name: displayName,
      family_group_id: familyGroupId
    })
  }).catch(() => {});
}

export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured()) {
    const demoSession = {
      user: { id: `local-${email}`, email },
      displayName: email.split('@')[0],
      familyGroupId: 'FAM-KOBE-2026',
      mode: 'local-auth'
    };
    saveStoredSession(demoSession);
    return { ok: true, session: demoSession };
  }

  const res = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error_description || data.msg || 'ログインに失敗しました' };
  }

  const session = {
    accessToken: data.access_token,
    user: data.user,
    displayName: data.user?.user_metadata?.display_name || email.split('@')[0],
    familyGroupId: data.user?.user_metadata?.family_group_id || 'FAM-KOBE-2026',
    mode: 'supabase'
  };
  saveStoredSession(session);
  await ensureProfileRow({
    accessToken: session.accessToken,
    userId: session.user?.id,
    email,
    displayName: session.displayName,
    familyGroupId: session.familyGroupId
  });
  return { ok: true, session };
}

export async function signUpWithEmail({ email, password, displayName, familyGroupId }) {
  const groupCode = (familyGroupId || '').trim() || `FAM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const name = (displayName || '').trim() || email.split('@')[0];

  if (!isSupabaseConfigured()) {
    const demoSession = {
      user: { id: `local-${email}`, email },
      displayName: name,
      familyGroupId: groupCode,
      mode: 'local-auth'
    };
    saveStoredSession(demoSession);
    return { ok: true, session: demoSession };
  }

  const res = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      data: { display_name: name, family_group_id: groupCode }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.msg || data.error_description || '登録に失敗しました' };
  }

  const accessToken = data.access_token || data.session?.access_token || null;
  const user = data.user || data.session?.user || null;

  const session = {
    accessToken,
    user,
    displayName: name,
    familyGroupId: groupCode,
    mode: 'supabase'
  };
  saveStoredSession(session);

  if (accessToken && user?.id) {
    await ensureProfileRow({
      accessToken,
      userId: user.id,
      email,
      displayName: name,
      familyGroupId: groupCode
    });
  }
  return { ok: true, session };
}

export function signOutSession() {
  saveStoredSession(null);
}

export async function syncInventoryToSupabase(inventory, session) {
  if (!isSupabaseConfigured() || !session?.accessToken) return { ok: false };
  const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/inventory`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(
      inventory.map(item => ({
        id: item.id,
        family_group_id: session.familyGroupId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        expiry_date: item.expiryDate,
        allergens: item.allergens || [],
        dietary_tags: item.dietaryTags || []
      }))
    )
  });
  return { ok: res.ok };
}