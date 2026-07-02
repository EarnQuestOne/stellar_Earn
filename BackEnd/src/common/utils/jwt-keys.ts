import { ConfigService } from '@nestjs/config';

function normalizePem(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}

function parsePemList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizePem);
}

export function getJwtPrivateKey(configService: ConfigService): string {
  const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
  if (!privateKey) {
    throw new Error('JWT_PRIVATE_KEY is not defined in environment variables');
  }

  return normalizePem(privateKey);
}

export function getJwtPublicKeys(configService: ConfigService): string[] {
  const keyList = configService.get<string>('JWT_PUBLIC_KEYS');
  if (keyList) {
    const parsed = parsePemList(keyList);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  const singleKey = configService.get<string>('JWT_PUBLIC_KEY');
  if (!singleKey) {
    throw new Error(
      'JWT_PUBLIC_KEY (or JWT_PUBLIC_KEYS) is not defined in environment variables',
    );
  }

  return [normalizePem(singleKey)];
}
