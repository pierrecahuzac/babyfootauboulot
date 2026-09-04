import { eq } from 'drizzle-orm';
import { createAuthMiddleware } from '../middleware/auth.js';

export default async function adminRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers }) {
  const getUsersTable = () => users || players;
  const { requireAdmin } = createAuthMiddleware();

  app.get('/api/admin/users', { preHandler: requireAdmin }, async () => {
    const target = getUsersTable();
    try {
      const rows = await db.select().from(target);
      return rows.map(u => ({ id: u.id, email: u.email, pseudo: u.pseudo, poste: u.poste, niveau: u.niveau, role: u.role || 'user', emailVerified: Boolean(u.emailVerified ?? u.email_verified), createdAt: u.createdAt || u.created_at }));
    } catch {
      const { rows } = await pool.query(`SELECT id, email, pseudo, poste, niveau, role, email_verified, created_at FROM users ORDER BY created_at DESC`);
      return rows.map(r => ({ id: r.id, email: r.email, pseudo: r.pseudo, poste: r.poste, niveau: r.niveau, role: r.role || 'user', emailVerified: Boolean(r.email_verified), createdAt: r.created_at }));
    }
  });

  app.patch('/api/admin/users/:id/role', { preHandler: requireAdmin }, async (req, reply) => {
    const id = Number(req.params.id);
    const { role } = req.body || {};
    if (!['admin','user'].includes(role)) return reply.code(400).send({ error: 'role doit être admin ou user' });
    if (Number(req.user.id) === id && role !== 'admin') return reply.code(400).send({ error: 'ne peut pas se rétrograder soi-même' });
    try {
      const { rows } = await pool.query(`UPDATE users SET role=$1 WHERE id=$2 RETURNING id, email, pseudo, role`, [role, id]);
      if (!rows[0]) return reply.code(404).send({ error: 'utilisateur introuvable' });
      return rows[0];
    } catch {
      try {
        const [row] = await db.update(getUsersTable()).set({ role }).where(eq(getUsersTable().id, id)).returning();
        if (!row) return reply.code(404).send({ error: 'utilisateur introuvable' });
        return row;
      } catch (e) { throw e; }
    }
  });

  app.delete('/api/admin/users/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const id = Number(req.params.id);
    if (Number(req.user.id) === id) return reply.code(400).send({ error: 'ne peut pas se supprimer soi-même' });
    try {
      await pool.query(`DELETE FROM ligue_members WHERE user_id=$1`, [id]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
      await pool.query(`DELETE FROM players WHERE pseudo IN (SELECT pseudo FROM users WHERE id=$1)`, [id]).catch(()=>{});
    } catch {
      try { await db.delete(getUsersTable()).where(eq(getUsersTable().id, id)); } catch {}
    }
    return { ok: true };
  });
}
