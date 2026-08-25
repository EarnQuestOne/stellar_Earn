/**
 * Fix for issue #2231:
 * Adds an i18n missing-key checker that can be run in CI or dev to surface
 * any translation keys present in the default locale but absent in others.
 *
 * Usage: npx ts-node FrontEnd/my-app/scripts/check-i18n-keys.ts
 */
import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.resolve(__dirname, '../messages');
const DEFAULT_LOCALE = 'en';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof val === 'object' && val !== null
      ? flattenKeys(val as Record<string, unknown>, fullKey)
      : [fullKey];
  });
}

function loadMessages(locale: string): Record<string, unknown> {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function checkMissingKeys(): void {
  const defaultMessages = loadMessages(DEFAULT_LOCALE);
  const defaultKeys = flattenKeys(defaultMessages);

  const localeFiles = fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith('.json'));
  let hasErrors = false;

  for (const file of localeFiles) {
    const locale = file.replace('.json', '');
    if (locale === DEFAULT_LOCALE) continue;

    const messages = loadMessages(locale);
    const keys = new Set(flattenKeys(messages));
    const missing = defaultKeys.filter((k) => !keys.has(k));

    if (missing.length > 0) {
      console.error(`[i18n] ${locale} is missing ${missing.length} key(s):`);
      missing.forEach((k) => console.error(`  - ${k}`));
      hasErrors = true;
    } else {
      console.log(`[i18n] ${locale}: all keys present`);
    }
  }

  if (hasErrors) process.exit(1);
}

checkMissingKeys();
