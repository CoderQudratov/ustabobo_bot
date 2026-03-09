/**
 * E2E setup: suppress noisy logs from dependencies (e.g. dotenv).
 */
const originalLog = console.log;
console.log = (...args: unknown[]) => {
  if (args.some((a) => typeof a === 'string' && a.includes('dotenv'))) return;
  originalLog.apply(console, args);
};
