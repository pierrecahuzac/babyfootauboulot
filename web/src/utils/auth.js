const API = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('babyfoot_token');
export const setToken = (t) => t ? localStorage.setItem('babyfoot_token', t) : localStorage.removeItem('babyfoot_token');
export const getAuthHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const authFetch = (url, opts = {}) => {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(opts.headers || {}) };
  return fetch(`${API}${url}`, { ...opts, headers, credentials: 'include' });
};

export const useAuth = () => {
  // ce fichier est surtout pour les helpers, le state est dans App.jsx
  return { getToken, setToken, getAuthHeaders, authFetch };
};
