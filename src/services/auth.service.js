import { supabase } from '../config/supabase.js';

const USER_CACHE_TTL_MS = 60_000;
let cachedUser = null;
let cachedAt = 0;
let pendingUserRequest = null;

async function refreshCachedUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    cachedUser = null;
    cachedAt = 0;
    return null;
  }

  cachedUser = user;
  cachedAt = Date.now();
  return user;
}

export const authService = {
  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser({ forceRefresh = false } = {}) {
    const cacheIsFresh = cachedAt > 0 && Date.now() - cachedAt < USER_CACHE_TTL_MS;
    if (!forceRefresh && cacheIsFresh) return cachedUser;

    if (pendingUserRequest) return pendingUserRequest;

    pendingUserRequest = refreshCachedUser();
    try {
      return await pendingUserRequest;
    } finally {
      pendingUserRequest = null;
    }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  async getUserPreferences() {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_preferences')
      .select(`
        *,
        preferred_hymnal:hymnals(id, name)
      `)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || { new_hymn_threshold: 5, preferred_hymnal_id: null };
  },

  async updateUserPreferences(preferences) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, ...preferences })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    cachedUser = null;
    cachedAt = 0;
    return;
  }

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
    cachedUser = session?.user ?? null;
    cachedAt = Date.now();
  }
});
