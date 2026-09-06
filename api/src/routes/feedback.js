import { createAuthMiddleware } from '../middleware/auth.js';

// Feedback : activé en prod pour users connectés (auth requis)
// Permet aux users de reporter bugs/idées directement dans l'app sans mail.
export default async function feedbackRoutes(app, { pool }) {
  const { requireAuth, requireAdmin, isAdmin } = createAuthMiddleware();

  const TYPES = new Set(['bug', 'idee', 'amelioration', 'autre']);
  const STATUSES = new Set(['open', 'done', 'wontfix']);

  // ensure table helper (appelé via initDb aussi, mais safe ici)
  const ensureTable = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        pseudo TEXT NOT NULL,
        email TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('bug','idee','amelioration','autre')),
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','wontfix')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  };
  // try ensure at startup (best effort)
  ensureTable().catch(() => {});

  // POST /api/feedbacks — créer un feedback (auth requis)
  app.post('/api/feedbacks', { preHandler: requireAuth }, async (req, reply) => {
    await ensureTable();
    const { type, message } = req.body || {};
    const t = (type || '').trim().toLowerCase();
    const msg = (message || '').trim();
    if (!TYPES.has(t)) return reply.code(400).send({ error: "type doit être bug | idee | amelioration | autre" });
    if (msg.length < 10) return reply.code(400).send({ error: 'message trop court (10 min)' });
    if (msg.length > 2000) return reply.code(400).send({ error: 'message trop long (2000 max)' });
    const pseudo = req.user.pseudo;
    const email = req.user.email;
    const { rows } = await pool.query(
      `INSERT INTO feedbacks (user_id, pseudo, email, type, message) VALUES ($1,$2,$3,$4,$5) RETURNING id, user_id, pseudo, email, type, message, status, created_at`,
      [req.user.id, pseudo, email, t, msg]
    );
    return reply.code(201).send(rows[0]);
  });

  // GET /api/feedbacks — liste : admin voit tout, user voit ses propres
  app.get('/api/feedbacks', { preHandler: requireAuth }, async (req, reply) => {
    await ensureTable();
    const admin = isAdmin(req.user);
    if (admin) {
      const { rows } = await pool.query(`SELECT id, user_id, pseudo, email, type, message, status, created_at FROM feedbacks ORDER BY created_at DESC LIMIT 200`);
      return rows;
    }
    const { rows } = await pool.query(`SELECT id, user_id, pseudo, email, type, message, status, created_at FROM feedbacks WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
    return rows;
  });

  // PATCH /api/feedbacks/:id — admin peut changer status
  app.patch('/api/feedbacks/:id', { preHandler: requireAdmin }, async (req, reply) => {
    await ensureTable();
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!STATUSES.has(status)) return reply.code(400).send({ error: 'status doit être open | done | wontfix' });
    const { rows } = await pool.query(`UPDATE feedbacks SET status=$1 WHERE id=$2 RETURNING id, user_id, pseudo, email, type, message, status, created_at`, [status, id]);
    if (!rows[0]) return reply.code(404).send({ error: 'feedback introuvable' });
    return rows[0];
  });

  // DELETE /api/feedbacks/:id — owner ou admin
  app.delete('/api/feedbacks/:id', { preHandler: requireAuth }, async (req, reply) => {
    await ensureTable();
    const id = Number(req.params.id);
    const { rows } = await pool.query(`SELECT id, user_id FROM feedbacks WHERE id=$1`, [id]);
    if (!rows[0]) return reply.code(404).send({ error: 'feedback introuvable' });
    const admin = isAdmin(req.user);
    if (!admin && Number(rows[0].user_id) !== Number(req.user.id)) return reply.code(403).send({ error: 'non autorisé' });
    await pool.query(`DELETE FROM feedbacks WHERE id=$1`, [id]);
    return { ok: true };
  });
}
