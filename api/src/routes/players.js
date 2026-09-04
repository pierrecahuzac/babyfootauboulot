import { eq } from 'drizzle-orm';
import { isBlocked, blockedReason } from '../utils/moderation.js';
import { authFromRequest } from '../utils/auth.js';

export default async function playersRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers }) {
  const liguesTable = ligues;
  const membersTable = ligueMembers;

  const isMember = async (ligueId, userId) => {
    if (!liguesTable || !membersTable) return true;
    try {
      const rows = await db.select().from(membersTable);
      return rows.some(r => Number(r.ligueId ?? r.ligue_id) === Number(ligueId) && Number(r.userId ?? r.user_id) === Number(userId));
    } catch { return false; }
  };

  const getLigueId = (req) => Number(req.query.ligue_id || req.body?.ligue_id || req.headers['x-ligue-id']) || null;

  const assertMember = async (req, reply, ligueId) => {
    if (!ligueId) return true;
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

  app.get('/api/players', async (req, reply) => {
    const ligueId = getLigueId(req);
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      try {
        const members = await db.select().from(membersTable);
        const userIds = members.filter(m => Number(m.ligueId ?? m.ligue_id) === ligueId).map(m => Number(m.userId ?? m.user_id));
        const allUsers = await db.select().from(getUsersTable());
        const filtered = allUsers.filter(u => userIds.includes(Number(u.id)));
        return filtered.map(u => ({ id: u.id, pseudo: u.pseudo, poste: u.poste, niveau: u.niveau, createdAt: u.createdAt || u.created_at }));
      } catch {
        const { rows } = await pool.query(`SELECT u.id, u.pseudo, u.poste, u.niveau, u.created_at FROM users u JOIN ligue_members m ON m.user_id=u.id WHERE m.ligue_id=$1 ORDER BY u.created_at`, [ligueId]);
        return rows;
      }
    }
    return db.select().from(players).orderBy(players.createdAt);
  });

  app.post('/api/players', async (req, reply) => {
    const { pseudo, poste, niveau } = req.body;
    if (!pseudo || !poste || !niveau) return reply.code(400).send({ error: 'pseudo, poste, niveau requis' });
    if (isBlocked(pseudo.trim())) return reply.code(400).send({ error: blockedReason(pseudo.trim()) });
    try {
      const [row] = await db.insert(players).values({ pseudo: pseudo.trim(), poste, niveau }).returning();
      return reply.code(201).send(row);
    } catch (e) {
      if (e.code === '23505') return reply.code(409).send({ error: 'pseudo déjà pris' });
      throw e;
    }
  });

  app.patch('/api/players/:id', async (req, reply) => {
    const { poste, niveau } = req.body;
    const data = {};
    if (poste) data.poste = poste;
    if (niveau) data.niveau = niveau;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'rien à mettre à jour' });
    const [row] = await db.update(players).set(data).where(eq(players.id, Number(req.params.id))).returning();
    if (!row) return reply.code(404).send({ error: 'joueur introuvable' });
    return row;
  });
}
