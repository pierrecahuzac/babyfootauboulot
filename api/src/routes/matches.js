import { eq, desc } from 'drizzle-orm';
import { calculateClassement, normalizeMatch, validateMatchPayload } from '../utils/stats.js';
import { authFromRequest } from '../utils/auth.js';

export default async function matchesRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers }) {
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

  app.get('/api/matches', async (req, reply) => {
    const ligueId = getLigueId(req);
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      try {
        const rows = await pool.query(`SELECT * FROM matches WHERE ligue_id=$1 ORDER BY created_at DESC LIMIT 50`, [ligueId]).then(r=>r.rows);
        return rows.map(normalizeMatch);
      } catch {
        const rows = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(50);
        return rows.filter(r => Number(r.ligueId ?? r.ligue_id) === ligueId).map(normalizeMatch);
      }
    }
    const rows = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(50);
    return rows.map(normalizeMatch);
  });

  app.post('/api/matches', async (req, reply) => {
    const team_bleue = req.body.team_bleue ?? req.body.team_a;
    const team_rouge = req.body.team_rouge ?? req.body.team_b;
    const score_bleue = req.body.score_bleue ?? req.body.score_a;
    const score_rouge = req.body.score_rouge ?? req.body.score_b;
    const { format, ligue_id } = req.body;
    const ligueId = Number(ligue_id || req.query.ligue_id || req.headers['x-ligue-id']) || null;
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
    }
    const err = validateMatchPayload({ format, team_bleue, team_rouge, score_bleue, score_rouge });
    if (err) return reply.code(400).send({ error: err });
    const [row] = await db.insert(matches).values({
      format, teamBleue: team_bleue, teamRouge: team_rouge, scoreBleue: Number(score_bleue), scoreRouge: Number(score_rouge), ligueId: ligueId || null
    }).returning();
    if (ligueId) await pool.query(`UPDATE matches SET ligue_id=$2, team_a=$3, team_b=$4, score_a=$5, score_b=$6 WHERE id=$1`, [row.id, ligueId, JSON.stringify(team_bleue), JSON.stringify(team_rouge), Number(score_bleue), Number(score_rouge)]).catch(()=>{});
    else await pool.query(`UPDATE matches SET team_a=$2, team_b=$3, score_a=$4, score_b=$5 WHERE id=$1`, [row.id, JSON.stringify(team_bleue), JSON.stringify(team_rouge), Number(score_bleue), Number(score_rouge)]).catch(()=>{});
    return reply.code(201).send(normalizeMatch(row));
  });

  app.get('/api/stats', async (req, reply) => {
    const ligueId = getLigueId(req);
    let allPlayers, allMatches;
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      try {
        const { rows: mRows } = await pool.query(`SELECT * FROM matches WHERE ligue_id=$1`, [ligueId]);
        allMatches = mRows;
        const { rows: pRows } = await pool.query(`SELECT u.id, u.pseudo, u.poste, u.niveau, u.created_at FROM users u JOIN ligue_members m ON m.user_id=u.id WHERE m.ligue_id=$1`, [ligueId]);
        allPlayers = pRows.length ? pRows.map(r=>({ id:r.id, pseudo:r.pseudo, poste:r.poste, niveau:r.niveau, createdAt:r.created_at })) : await db.select().from(players);
      } catch {
        const rawPlayers = await db.select().from(players);
        const rawMatches = await db.select().from(matches);
        const members = await db.select().from(membersTable).catch(()=>[]);
        const ids = members.filter(m=> Number(m.ligueId ?? m.ligue_id)===ligueId).map(m=>Number(m.userId ?? m.user_id));
        allPlayers = rawPlayers.filter(p=> ids.includes(Number(p.id)));
        allMatches = rawMatches.filter(m=> Number(m.ligueId ?? m.ligue_id)===ligueId);
      }
    } else {
      allPlayers = await db.select().from(players);
      allMatches = await db.select().from(matches);
    }
    const classement = calculateClassement(allPlayers, allMatches);
    const normalizedMatches = allMatches.map(normalizeMatch);
    return { classement, matches: normalizedMatches };
  });
}
