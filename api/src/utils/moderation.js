const BLOCKED = [
  'hitler','nazi','facho','fachos','raciste','racistes','antisemite','antisemites',
  'negro','negresse','bougnoule','bamboula','youpin','youpins','feuj',
  // leetspeak normalisé côté isBlocked, on garde la base sans variantes
];

// normalise: NFD, minuscule, enlève accents, non-alnum, leet 4->a 3->e 0->o 1->i 5->s 7->t 8->b
const normalize = (s) => s.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/4/g,'a').replace(/3/g,'e').replace(/0/g,'o').replace(/1/g,'i').replace(/5/g,'s').replace(/7/g,'t').replace(/8/g,'b')
  .replace(/[^a-z0-9]/g, '');

export const isBlocked = (pseudo) => {
  if (!pseudo || typeof pseudo !== 'string') return false;
  const n = normalize(pseudo);
  if (n.length < 2) return false;
  return BLOCKED.some(w => n.includes(w));
};

export const blockedReason = (pseudo) => {
  if (!isBlocked(pseudo)) return null;
  const n = normalize(pseudo);
  const hit = BLOCKED.find(w => n.includes(w));
  return hit ? `pseudo contient mot bloqué: ${hit}` : 'pseudo bloqué';
};

export const BLOCKED_LIST = BLOCKED;
