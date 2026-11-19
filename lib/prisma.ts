import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl(): string {
  // If running on Vercel serverless functions, the root filesystem is read-only.
  // Copy the SQLite database to /tmp so both reads and writes work seamlessly.
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/leetcode_tracker.db';
    if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'leetcode_tracker.db'),
        path.join('/var/task', 'prisma', 'leetcode_tracker.db'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
          try {
            fs.copyFileSync(candidate, tmpDbPath);
            break;
          } catch (err) {
            console.error('Error copying sqlite db to /tmp:', err);
          }
        }
      }
    }
    return `file:${tmpDbPath}`;
  }

  return process.env.DATABASE_URL || 'file:./leetcode_tracker.db';
}

const dbUrl = getDatabaseUrl();
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = dbUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
