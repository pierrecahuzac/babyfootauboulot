import { eq } from 'drizzle-orm';
import { isBlocked, blockedReason } from '../utils/moderation.js';
import { authFromRequest } from '../utils/auth.js';
import { createAuthMiddleware } from '../middleware/auth.js';

export default async function playersRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers }) {
  const liguesTable = ligues;
  const membersTable = ligueMembers;

  const isMember = async (ligueId, userId) => {
    if (!liguesTable || !membersTable) return false;
    try {
      const rows = await db.select().from(membersTable);
      return rows.some(r => Number(r.ligueId ?? r.ligue_id) === Number(ligueId) && Number(r.userId ?? r.user_id) === Number(userId));
    } catch { return false; }
  };

  const isPublicLigue = async (ligueId) => {
    try {
      const rows = await db.select().from(liguesTable);
      const l = rows.find(r => Number(r.id) === Number(ligueId));
      if (l) return (l.isPrivate ?? l.is_private ?? 1) === 0;
    } catch {}
    try {
      const { rows } = await pool.query(`SELECT is_private FROM ligues WHERE id=$1`, [ligueId]);
      if (rows[0]) return Number(rows[0].is_private) === 0;
    } catch {}
    return false;
  };

  const getLigueId = (req) => Number(req.query.ligue_id || req.body?.ligue_id || req.headers['x-ligue-id']) || null;

  const assertMember = async (req, reply, ligueId) => {
    if (!ligueId) return true;
    if (await isPublicLigue(ligueId)) return true;
    if (!req.user && !authFromRequest(req)) {
      const payload = authFromRequest(req);
      if (!payload) { reply.code(401).send({ error: 'auth requise pour ligue' }); return false; }
      req.user = payload;
    }
    const userId = req.user?.id || authFromRequest(req)?.id;
    if (!userId) { reply.code(401).send({ error: 'auth requise' }); return false; }
    if (!await isMember(ligueId, userId)) { reply.code(403).send({ error: 'pas membre de cette ligue' }); return false; }
    return true;
  };

  const getUsersTable = () => users || players;
  const { requireAuth } = createAuthMiddleware();

  app.get('/api/players', async (req, reply) => {
    const ligueId = getLigueId(req);
    const { niveau, poste } = req.query;

    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      try {
        const members = await db.select().from(membersTable);
        const userIds = members.filter(m => Number(m.ligueId ?? m.ligue_id) === ligueId).map(m => Number(m.userId ?? m.user_id));
        let allUsers = await db.select().from(getUsersTable());
        
        // Appliquer filtres
        if (niveau) allUsers = allUsers.filter(u => u.niveau === niveau);
        if (poste) allUsers = allUsers.filter(u => u.poste === poste);
        
        const filtered = allUsers.filter(u => userIds.includes(Number(u.id)));
        return filtered.map(u => ({ id: u.id, pseudo: u.pseudo, poste: u.poste, niveau: u.niveau, createdAt: u.createdAt || u.created_at }));
      } catch {
        let sql = `SELECT u.id, u.pseudo, u.poste, u.niveau, u.created_at FROM users u JOIN ligue_members m ON m.user_id=u.id WHERE m.ligue_id=$1`;
        const params = [ligueId];
        if (niveau) { sql += ` AND u.niveau=$${params.length + 1}`; params.push(niveau); }
        if (poste) { sql += ` AND u.poste=$${params.length + 1}`; params.push(poste); }
        sql += ` ORDER BY u.created_at`;
        const { rows } = await pool.query(sql, params);
        return rows;
      }
    }
    
    // Pas de ligueId, filtrer directement sur la table players
    let query = db.select().from(players);
    if (niveau) query = query.where(eq(players.niveau, niveau));
    if (poste) query = query.where(eq(players.poste, poste));
    
    return query.orderBy(players.createdAt);
  });

  app.patch('/api/players/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { poste, niveau } = req.body;
    const data = {};
    if (poste) data.poste = poste;
    if (niveau) data.niveau = niveau;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'rien à mettre à jour' });
    const [row] = await db.update(players).set(data).where(eq(players.id, Number(req.params.id))).returning();
    if (!row) return reply.code(404).send({ error: 'joueur introuvable' });
    return row;
  });

  // Claim: un user récupère son ancien pseudo invité et ses matchs
  app.post('/api/players/:id/claim', { preHandler: requireAuth }, async (req, reply) => {
    const playerId = Number(req.params.id);
    const [player] = await db.select().from(players).where(eq(players.id, playerId));
    if (!player) return reply.code(404).send({ error: 'joueur invité introuvable' });
    if (player.pseudo.toLowerCase() !== req.user.pseudo.toLowerCase()) {
      return reply.code(403).send({ error: 'tu ne peux réclamer que ton propre pseudo' });
    }
    // vérifie qu'il n'y a pas déjà un user avec même pseudo (normalement c'est toi)
    // transfère les matchs
    try {
      const allMatches = await db.select().from(matches);
      for (const m of allMatches) {
        let changed = false;
        const updateTeam = (team) => {
          if (!Array.isArray(team)) return team;
          return team.map(p => {
            if ((p.id && Number(p.id) === Number(player.id)) || (p.pseudo && p.pseudo.toLowerCase() === player.pseudo.toLowerCase())) {
              changed = true;
              return { ...p, id: req.user.id, pseudo: req.user.pseudo };
            }
            return p;
          });
        };
        const newBleue = updateTeam(m.teamBleue ?? m.team_bleue);
        const newRouge = updateTeam(m.teamRouge ?? m.team_rouge);
        const newA = updateTeam(m.teamA ?? m.team_a);
        const newB = updateTeam(m.teamB ?? m.team_b);
        if (changed) {
          await db.update(matches).set({
            teamBleue: newBleue,
            teamRouge: newRouge,
          }).where(eq(matches.id, m.id));
          // compat legacy
          try { await pool.query(`UPDATE matches SET team_bleue=$1, team_rouge=$2, team_a=$1, team_b=$2 WHERE id=$3`, [JSON.stringify(newBleue), JSON.stringify(newRouge), m.id]); } catch {}
        }
      }
      await db.delete(players).where(eq(players.id, playerId));
      try { await pool.query(`DELETE FROM players WHERE id=$1`, [playerId]); } catch {}
    } catch (e) {
      return reply.code(500).send({ error: 'échec du transfert' });
    }
    return { ok: true, message: `Pseudo ${player.pseudo} réclamé, matchs transférés` };
  });
}
