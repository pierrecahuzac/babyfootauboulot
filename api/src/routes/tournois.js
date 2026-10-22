import { authFromRequest } from '../utils/auth.js';

export default async function tournoisRoutes(app, { db, pool, users, ligues, ligueMembers }) {
  const liguesTable = ligues;
  const membersTable = ligueMembers;

  const isMember = async (ligueId, userId) => {
    if (!liguesTable || !membersTable) return false;
    try {
      const rows = await db.select().from(membersTable);
      return rows.some(r => Number(r.ligueId ?? r.ligue_id) === Number(ligueId) && Number(r.userId ?? r.user_id) === Number(userId));
    } catch { return false; }
  };
  const isDemoEmail = (email) => typeof email === 'string' && email.toLowerCase().endsWith('@example.com');
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
    if (await isPublicLigue(ligueId)) {
      const email = req.user?.email || authFromRequest(req)?.email;
      if (isDemoEmail(email)) return true;
    }
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

  const normalize = (r) => ({
    id: r.id,
    ligue_id: r.ligue_id ?? r.ligueId ?? null,
    format: r.format,
    participants: r.participants,
    champion: r.champion,
    created_at: r.created_at ?? r.createdAt ?? null,
  });

  app.get('/api/tournois', async (req, reply) => {
    const ligueId = getLigueId(req);
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      try {
        const { rows } = await pool.query(`SELECT * FROM tournois WHERE ligue_id=$1 ORDER BY created_at DESC LIMIT 50`, [ligueId]);
        return rows.map(normalize);
      } catch {
        return [];
      }
    }
    try {
      const { rows } = await pool.query(`SELECT * FROM tournois WHERE ligue_id IS NULL ORDER BY created_at DESC LIMIT 50`);
      return rows.map(normalize);
    } catch {
      return [];
    }
  });

  app.post('/api/tournois', async (req, reply) => {
    const format = req.body?.format;
    const participants = req.body?.participants ?? [];
    const champion = req.body?.champion ?? null;
    const ligueId = getLigueId(req);
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
    } else {
      const payload = authFromRequest(req);
      if (!payload) { reply.code(401).send({ error: 'auth requise' }); return; }
      req.user = payload;
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO tournois (ligue_id, format, participants, champion) VALUES ($1,$2,$3,$4) RETURNING *`,
        [ligueId, format, JSON.stringify(participants), JSON.stringify(champion)]
      );
      return reply.code(201).send(normalize(rows[0]));
    } catch (e) {
      return reply.code(400).send({ error: e.message });
    }
  });

  app.delete('/api/tournois/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const payload = authFromRequest(req);
    if (!payload) { reply.code(401).send({ error: 'auth requise' }); return; }
    await pool.query(`DELETE FROM tournois WHERE id=$1`, [id]).catch(()=>{});
    return reply.code(204).send();
  });
}
