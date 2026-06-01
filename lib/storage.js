/**
 * localStorage 기반 데이터 저장 모듈
 */

const STORAGE_KEYS = {
  USER: 'pacemaker_user',
  SESSIONS: 'pacemaker_sessions',
  CURRENT_SESSION: 'pacemaker_current_session',
  BASELINE: 'pacemaker_baseline',
};

// === User ===

export function getUser() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export function saveUser(user) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function hasBaseline() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.BASELINE) !== null;
}

export function saveBaseline(data) {
  localStorage.setItem(STORAGE_KEYS.BASELINE, JSON.stringify(data));
}

export function getBaseline() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.BASELINE);
  return data ? JSON.parse(data) : null;
}

// === Sessions ===

export function getSessions() {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

export function saveSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

export function getSessionById(sessionId) {
  const sessions = getSessions();
  return sessions.find(s => s.session_id === sessionId) || null;
}

// === Current Session (in-progress) ===

export function getCurrentSession() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  return data ? JSON.parse(data) : null;
}

export function saveCurrentSession(session) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
}

export function clearCurrentSession() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}

// === Generate Session ID ===

export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// === Clear All Data ===

export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
