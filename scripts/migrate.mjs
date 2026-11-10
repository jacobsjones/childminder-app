// Usage: npm run db:migrate   (uses .env.local, which must point at the dev branch)
// lib/*.js are ES modules inside a CommonJS package, so tsx loads them as
// CommonJS and the exports can arrive on `default`.
const loaded = await import('@/lib/migrate');
const { migrateDatabase } = loaded.migrateDatabase ? loaded : loaded.default;

await migrateDatabase();
console.log('Migration complete');
process.exit(0);
