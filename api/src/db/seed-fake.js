import pg from 'pg';
import bcrypt from 'bcryptjs';

const getDatabaseUrl = () => process.env.DATABASE_URL || 'postgres://babyfoot:babyfoot@localhost:5432/babyfoot';

const hashPassword = async (pwd) => await bcrypt.hash(pwd, 10);

const randomPoste = () => ['Attaque', 'Défense', 'Attaque / Défense'][Math.floor(Math.random() * 3)];
const randomNiveau = () => ['Débutant', 'Intermédiaire', 'Confirmé'][Math.floor(Math.random() * 3)];

const fakeUsers = [
  { email: 'marie@example.com', pseudo: 'marie_duchamp', poste: 'Attaque', niveau: 'Débutant' },
  { email: 'jean@example.com', pseudo: 'jean_petit', poste: 'Défense', niveau: 'Intermédiaire' },
  { email: 'sophie@example.com', pseudo: 'sophie_mercier', poste: 'Attaque', niveau: 'Confirmé' },
  { email: 'antoine@example.com', pseudo: 'antoine_you', poste: 'Défense', niveau: 'Débutant' },
  { email: 'charlie@example.com', pseudo: 'charlie_test', poste: 'Attaque', niveau: 'Intermédiaire' },
  { email: 'diana@example.com', pseudo: 'diana_dupont', poste: 'Attaque / Défense', niveau: 'Confirmé' },
  { email: 'elliot@example.com', pseudo: 'elliott_martine', poste: 'Défense', niveau: 'Débutant' },
  { email: 'fiona@example.com', pseudo: 'fiona_boulot', poste: 'Attaque', niveau: 'Confirmé' },
  { email: 'george@example.com', pseudo: 'george_dup', poste: 'Défense', niveau: 'Intermédiaire' },
  { email: 'helen@example.com', pseudo: 'helen_test', poste: 'Attaque / Défense', niveau: 'Débutant' },
];

const randomDate = (daysAgo = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
};

const createUser = async (client, userData) => {
  const pwd = await hashPassword('demo1234');
  const { email, pseudo, poste, niveau } = userData;
  
  const { rows } = await client.query(
    `INSERT INTO users (email, pseudo, password_hash, poste, niveau, role, email_verified) 
     VALUES ($1,$2,$3,$4,$5,'user',1) ON CONFLICT (email) DO NOTHING RETURNING id, pseudo, email`,
    [email, pseudo, pwd, poste, niveau]
  );
  
  if (rows[0]) {
    await client.query(
      `INSERT INTO players (pseudo, poste, niveau) VALUES ($1,$2,$3) ON CONFLICT (pseudo) DO NOTHING`,
      [pseudo, poste, niveau]
    );
  }
  return rows[0] ? rows[0].id : null;
};

export const seedFakeData = async () => {
  const client = new pg.Pool({ connectionString: getDatabaseUrl() });
  await client.connect();
  
  try {
    console.log('=== Seed data fake ===');
    
    // 1. Ensure ligue de demo exists with demo@example.com as owner
    await client.query(`
      INSERT INTO ligues (name, slug, description, owner_id, invite_code, is_private) 
      VALUES ('Ligue Demo', 'ligue-demo', 'Ligue de test pour comptes démo', 2, 'DEMO01', 1)
      ON CONFLICT (slug) DO NOTHING;
    `);
    
    // 2. Ensure demo user exists
    await client.query(`
      INSERT INTO users (email, pseudo, password_hash, poste, niveau, role, email_verified) 
      VALUES ('demo@example.com', 'demo', '\$2b\$10\$KCa2b17FY4XFAMSTzG7hjevXLMTyYq63eLURMJBAeRJ.V8ToeI1LG', 'Attaque', 'Intermédiaire', 'user', 1)
      ON CONFLICT (email) DO NOTHING;
    `);
    
    // 3. Add 5 fake users to the ligue
    const fakeEmails = ['marie@example.com', 'jean@example.com', 'sophie@example.com', 'antoine@example.com', 'charlie@example.com'];
    const usersInLigue = [2]; // demo user id
    
    for (const email of fakeEmails) {
      const userData = fakeUsers.find(u => u.email === email);
      if (!userData) continue;
      
      const userId = await createUser(client, userData);
      if (userId) {
        await client.query(
          `INSERT INTO ligue_members (ligue_id, user_id, role) VALUES (8, $1, 'member') ON CONFLICT DO NOTHING`,
          [userId]
        );
        usersInLigue.push(userId);
        console.log(`  ✓ Ajout: ${userData.pseudo} (${email})`);
      }
    }
    
    // 4. Create 14 matches
    console.log('  --- Génération 14 matchs ---');
    for (let i = 0; i < 14; i++) {
      const format = Math.random() > 0.35 ? '2v2' : '1v1';
      const need = format === '1v1' ? 2 : 4;
      
      const shuffled = [...usersInLigue].sort(() => Math.random() - 0.5).slice(0, need);
      
      let teamBleue, teamRouge;
      if (format === '1v1') {
        teamBleue = `[{"id": ${shuffled[0]}, "pseudo": "${(await client.query(`SELECT pseudo FROM users WHERE id=${shuffled[0]}`)).rows[0].pseudo}"}"}]`;
        teamRouge = `[{"id": ${shuffled[1]}, "pseudo": "${(await client.query(`SELECT pseudo FROM users WHERE id=${shuffled[1]}`)).rows[0].pseudo}"}"}]`;
      } else {
        teamBleue = `[{"id": ${shuffled[0]}, "pseudo": "${(await client.query(`SELECT pseudo FROM users WHERE id=${shuffled[0]}`)).rows[0].pseudo}", "poste": "Attaque"}, {"id": ${shuffled[1]}, "pseudo": "${(await client.query(`SELECT pseudo FROM users WHERE id=${shuffled[1]}`)).rows[0].pseudo}", "poste": "Défense"}}]`;
        teamRouge = `[{"id": ${shuffled[2]}, "pseudo": "${(await client.query(`SELECT pseudo FROM users WHERE id=${shuffled[2]}`)).rows[0].pseudo}", "poste": "Attaque"}, {"id": ${shuffled[3]}, "pseudo": "${(await client.query(`SELECT pseudo FROM users WHERE id=${shuffled[3]}`)).rows[0].pseudo}", "poste": "Défense"}}]`;
      }
      
      const scoreBleue = 10;
      const scoreRouge = Math.floor(Math.random() * 10);
      const wonRouge = Math.random() < 0.42;
      const sBleue = wonRouge ? scoreRouge : scoreBleue;
      const sRouge = wonRouge ? scoreBleue : scoreRouge;
      
      await client.query(
        `INSERT INTO matches (format, team_bleue, team_rouge, score_bleue, score_rouge, ligue_id, team_a, team_b, score_a, score_b, created_at) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [format, teamBleue, teamRouge, sBleue, sRouge, 8, teamBleue, teamRouge, sBleue, sRouge, randomDate(60)]
      );
      
      console.log(`  Match ${i+1}: ${format} - Bleue ${sBleue}-${sRouge} Rouge`);
    }
    
    // 5. Summary
    const { rows: count } = await client.query(`SELECT COUNT(*) as total FROM matches WHERE ligue_id = 8`);
    console.log(`\n✅ Seed fake terminé — ${count[0].total} matchs dans Ligue Demo`);
    console.log(`   Comptes démo: demo@example.com / admin@example.com`);
    console.log(`   Mdp: demo1234`);
    
  } catch (err) {
    console.error('✗ Erreur seed:', err);
  } finally {
    await client.end();
  }
};

// Exécution si appelé directement
if (require.main === module) {
  seedFakeData().then(() => process.exit(0)).catch(() => process.exit(1));
}