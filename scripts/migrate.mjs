// Usage: npm run db:migrate   (uses .env.local, which must point at the dev branch)
import { migrateDatabase } from '@/lib/migrate';

await migrateDatabase();
console.log('Migration complete');
process.exit(0);
