import { eq } from 'drizzle-orm';
import { genSlug, genInvite } from '../utils/helpers.js';
import { isBlocked, blockedReason } from '../utils/moderation.js';
import { createAuthMiddleware } from '../middleware/auth.js';

export default async function liguesRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers }) {
  const liguesTable = ligues;
  const membersTable = ligueMembers;
  const { requireAuth } = createAuthMiddleware();

  const isMember = async (ligueId, userId) => {
    if (!liguesTable || !membersTable) return true;
    try {
      const rows = await db.select().from(membersTable);
      return rows.some(r => Number(r.ligueId ?? r.ligue_id) === Number(ligueId) && Number(r.userId ?? r.user_id) === Number(userId));
    } catch { return false; }
  };

  app.post('/api/ligues', { preHandler: requireAuth }, async (req, reply) => {
    const { name, description } = req.body;
    if (!name) return reply.code(400).send({ error: 'name requis' });
    if (isBlocked(name.trim())) return reply.code(400).send({ error: blockedReason(name.trim()) });
    const slug = genSlug(name);
    const invite = genInvite();
    const ownerId = req.user.id;
    try {
      const [row] = await db.insert(liguesTable).values({ name: name.trim(), slug, description: description || null, ownerId, inviteCode: invite }).returning();
      try { await db.insert(membersTable).values({ ligueId: row.id, userId: ownerId, role: 'owner' }).returning(); } catch {}
      try { await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`, [row.id, ownerId]); } catch {}
      return reply.code(201).send({ ...row, invite_code: row.inviteCode || invite, slug: row.slug || slug });
    } catch (e) {
      if (e.code === '23505') return reply.code(409).send({ error: 'nom déjà pris' });
      throw e;
    }
  });

  app.get('/api/ligues', { preHandler: requireAuth }, async (req) => {
    if (!liguesTable || !membersTable) return [];
    try {
      const allMembers = await db.select().from(membersTable);
      const myLigueIds = allMembers.filter(m => Number(m.userId ?? m.user_id) === Number(req.user.id)).map(m => Number(m.ligueId ?? m.ligue_id));
      if (!myLigueIds.length) return [];
      const allLigues = await db.select().from(liguesTable);
      return allLigues.filter(l => myLigueIds.includes(Number(l.id))).map(l => ({
        ...l,
        invite_code: l.inviteCode ?? l.invite_code,
      }));
    } catch {
      const { rows } = await pool.query(`SELECT l.* FROM ligues l JOIN ligue_members m ON m.ligue_id=l.id WHERE m.user_id=$1 ORDER BY l.created_at DESC`, [req.user.id]).catch(()=>({rows:[]}));
      return rows;
    }
  });

  app.post('/api/ligues/join', { preHandler: requireAuth }, async (req, reply) => {
    const { invite_code, inviteCode } = req.body;
    const code = (invite_code || inviteCode || '').trim().toUpperCase();
    if (!code) return reply.code(400).send({ error: 'invite_code requis' });
    let ligue;
    try {
      const rows = await db.select().from(liguesTable);
      ligue = rows.find(r => (r.inviteCode || r.invite_code) === code);
    } catch {
      const { rows } = await pool.query(`SELECT * FROM ligues WHERE invite_code=$1`, [code]);
      ligue = rows[0];
    }
    if (!ligue) return reply.code(404).send({ error: 'code invalide' });
    const ligueId = ligue.id;
    if (await isMember(ligueId, req.user.id)) return { ...ligue, invite_code: ligue.inviteCode || ligue.invite_code, already: true };
    try { await db.insert(membersTable).values({ ligueId, userId: req.user.id, role: 'member' }).returning(); } catch {}
    try { await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`, [ligueId, req.user.id]); } catch {}
    return { ...ligue, invite_code: ligue.inviteCode || ligue.invite_code };
  });

  app.get('/api/ligues/:id/members', { preHandler: requireAuth }, async (req, reply) => {
    const ligueId = Number(req.params.id);
    if (!await isMember(ligueId, req.user.id)) return reply.code(403).send({ error: 'pas membre de cette ligue' });
    try {
      const members = await db.select().from(membersTable);
      const filtered = members.filter(m => Number(m.ligueId ?? m.ligue_id) === ligueId);
      const usersRows = await db.select().from(users || players);
      return filtered.map(m => {
        const u = usersRows.find(u => u.id === (m.userId ?? m.user_id));
        return { ...m, pseudo: u?.pseudo, email: u?.email };
      });
    } catch {
      const { rows } = await pool.query(`SELECT m.*, u.pseudo, u.email FROM ligue_members m JOIN users u ON u.id=m.user_id WHERE m.ligue_id=$1`, [ligueId]);
      return rows;
    }
  });

  app.delete('/api/ligues/:id', { preHandler: requireAuth }, async (req, reply) => {
    const ligueId = Number(req.params.id);
    let ligue;
    try {
      const rows = await db.select().from(liguesTable);
      ligue = rows.find(r => Number(r.id) === ligueId);
    } catch {
      const { rows } = await pool.query(`SELECT * FROM ligues WHERE id=$1`, [ligueId]);
      ligue = rows[0];
    }
    if (!ligue) return reply.code(404).send({ error: 'ligue introuvable' });
    const ownerId = ligue.ownerId ?? ligue.owner_id;
    if (Number(ownerId) !== Number(req.user.id)) return reply.code(403).send({ error: 'seul le owner peut supprimer la ligue' });
    try {
      await pool.query(`DELETE FROM ligues WHERE id=$1`, [ligueId]);
    } catch {
      try { await db.delete(liguesTable).where(eq(liguesTable.id, ligueId)); } catch {}
    }
    return { ok: true };
  });

  app.post('/api/ligues/:id/reset', { preHandler: requireAuth }, async (req, reply) => {
    const ligueId = Number(req.params.id);
    let ligue;
    try {
      const rows = await db.select().from(liguesTable);
      ligue = rows.find(r => Number(r.id) === ligueId);
    } catch {
      const { rows } = await pool.query(`SELECT * FROM ligues WHERE id=$1`, [ligueId]);
      ligue = rows[0];
    }
    if (!ligue) return reply.code(404).send({ error: 'ligue introuvable' });
    const ownerId = ligue.ownerId ?? ligue.owner_id;
    if (Number(ownerId) !== Number(req.user.id)) return reply.code(403).send({ error: 'seul le owner peut reset' });
    try {
      await pool.query(`DELETE FROM matches WHERE ligue_id=$1`, [ligueId]);
    } catch {
      try {
        const all = await db.select().from(matches);
        for (const m of all.filter(x => Number(x.ligueId ?? x.ligue_id) === ligueId)) {
          await db.delete(matches).where(eq(matches.id, m.id));
        }
      } catch {}
    }
    return { ok: true, reset: true };
  });
}
