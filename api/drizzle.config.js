// ATTENTION: Drizzle Studio est DEV UNIQUEMENT — INTERDIT en prod !
// Ne jamais exposer ce studio en production (données sensibles).
// Usage dev:
//   - Host:  DATABASE_URL=postgres://babyfoot:babyfoot@localhost:5432/babyfoot npm run db:studio
//   - Docker: docker compose --profile dev up studio  -> http://localhost:4983
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DRIZZLE_STUDIO) {
  console.error('⛔ Drizzle Studio INTERDIT en prod — ENABLE_DRIZZLE_STUDIO doit rester vide en prod');
}
export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL || 'postgres://babyfoot:babyfoot@localhost:5432/babyfoot' },
};
