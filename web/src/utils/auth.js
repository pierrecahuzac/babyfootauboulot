const API = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('babyfoot_token');
export const setToken = (t) => t ? localStorage.setItem('babyfoot_token', t) : localStorage.removeItem('babyfoot_token');
export const getAuthHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const authFetch = (url, opts = {}) => {
  const hasBody = opts.body !== undefined;
  const baseHeaders = hasBody ? { 'Content-Type': 'application/json' } : {};
  const headers = { ...baseHeaders, ...getAuthHeaders(), ...(opts.headers || {}) };
  // si pas de body, ne pas envoyer Content-Type vide qui casse fastify (FST_ERR_CTP_EMPTY_JSON_BODY)
  if (!hasBody && headers['Content-Type'] === undefined) delete headers['Content-Type'];
  return fetch(`${API}${url}`, { ...opts, headers, credentials: 'include' });
};

export const useAuth = () => {
  // ce fichier est surtout pour les helpers, le state est dans App.jsx
  return { getToken, setToken, getAuthHeaders, authFetch };
};
