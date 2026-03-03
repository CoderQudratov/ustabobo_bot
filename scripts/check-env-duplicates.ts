#!/usr/bin/env node
/**
 * Fail if .env contains duplicate keys (BOT_TOKEN, DATABASE_URL, PORT, WEBAPP_URL).
 * Prevents "Invalid Telegram init data signature" when a later placeholder overwrites real BOT_TOKEN.
 * Run via: npx tsx scripts/check-env-duplicates.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ENV_PATH = join(process.cwd(), '.env');
const CRITICAL_KEYS = ['BOT_TOKEN', 'DATABASE_URL', 'PORT', 'WEBAPP_URL'];

function main(): void {
  if (!existsSync(ENV_PATH)) {
    console.warn('[check-env] .env not found, skip duplicate check');
    process.exit(0);
    return;
  }
  const content = readFileSync(ENV_PATH, 'utf-8');
  const seen = new Map<string, number[]>();
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      const key = match[1];
      const indices = seen.get(key) ?? [];
      indices.push(i + 1);
      seen.set(key, indices);
    }
  });
  const duplicates: string[] = [];
  for (const key of CRITICAL_KEYS) {
    const indices = seen.get(key);
    if (indices && indices.length > 1) {
      duplicates.push(`${key} (qatorlar: ${indices.join(', ')})`);
    }
  }
  if (duplicates.length > 0) {
    console.error('[check-env] XATO: .env da takrorlangan kalitlar. Bitta kalit bitta marta bo\'lishi kerak.');
    console.error('Takrorlangan:', duplicates.join('; '));
    console.error('Tuzatish: .env ni oching, har bir kalitni faqat bitta qatorga qo\'ying (birinchi qiymat qoladi).');
    process.exit(1);
  }
  console.log('[check-env] .env da muhim kalitlar takrorlanmagan.');
}

main();
