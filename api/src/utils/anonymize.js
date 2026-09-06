// Anonymisation RGPD à la suppression de compte.
// Les équipes sont des snapshots JSONB [{id, pseudo, poste}] sans FK vers users :
// on réécrit le pseudo en place, on garde scores/format/ligue pour l'historique.
export const ANONYMIZED_PSEUDO = 'Joueur supprimé';

export const anonymizeEntry = (p) => ({ ...p, id: null, pseudo: ANONYMIZED_PSEUDO, poste: null, deleted: true });

const matchesUser = (p, userId, pseudoLower) => {
  if (!p || p.deleted) return false;
  if (userId != null && p.id != null && Number(p.id) === Number(userId)) return true;
  return Boolean(p.pseudo && pseudoLower && p.pseudo.toLowerCase() === pseudoLower);
};

export const anonymizeTeam = (team, userId, pseudo) => {
  if (!Array.isArray(team)) return { team, changed: false };
  const pseudoLower = (pseudo || '').toLowerCase();
  let changed = false;
  const next = team.map((p) => {
    if (matchesUser(p, userId, pseudoLower)) {
      changed = true;
      return anonymizeEntry(p);
    }
    return p;
  });
  return { team: next, changed };
};

// Parcourt tous les matchs et anonymise ceux du user. Retourne { anonymized }.
// Ne throw jamais : la suppression du compte doit aboutir même si un match échoue.
export const anonymizeMatchesForUser = async ({ pool, db, matches }, userId, pseudo) => {
  let rows = [];
  try {
    const r = await pool.query(`SELECT id, team_bleue, team_rouge, team_a, team_b FROM matches`);
    rows = r.rows;
  } catch {
    try {
      rows = await db.select().from(matches);
    } catch {
      return { anonymized: 0 };
    }
  }
  let anonymized = 0;
  for (const m of rows) {
    const rawBleue = m.team_bleue ?? m.teamBleue ?? m.team_a ?? m.teamA;
    const rawRouge = m.team_rouge ?? m.teamRouge ?? m.team_b ?? m.teamB;
    const { team: nextBleue, changed: c1 } = anonymizeTeam(rawBleue, userId, pseudo);
    const { team: nextRouge, changed: c2 } = anonymizeTeam(rawRouge, userId, pseudo);
    if (!c1 && !c2) continue;
    const bleueJson = JSON.stringify(nextBleue);
    const rougeJson = JSON.stringify(nextRouge);
    try {
      await pool.query(
        `UPDATE matches SET team_bleue=$1, team_rouge=$2, team_a=$1, team_b=$2 WHERE id=$3`,
        [bleueJson, rougeJson, m.id]
      );
      anonymized++;
      continue;
    } catch {}
    try {
      const { eq } = await import('drizzle-orm');
      await db.update(matches).set({ teamBleue: nextBleue, teamRouge: nextRouge }).where(eq(matches.id, m.id));
      anonymized++;
    } catch {}
  }
  return { anonymized };
};
