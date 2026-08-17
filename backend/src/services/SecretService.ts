import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { EnvConfig } from '../config';

/** Resolves the machine-local encryption key used for protected application settings. */
export const resolveSecretKeyPath = (config: EnvConfig): string => {
  const dataDir = config.APPLICATION_DATA_DIR
    ?? path.join(process.env.PROGRAMDATA ?? process.env.LOCALAPPDATA ?? os.homedir(), 'IT-Inventory-Server');
  return path.resolve(dataDir, 'secrets', 'email.key');
};

/** Returns the existing key, or securely creates it on first use. */
export const ensureSecretKey = (config: EnvConfig): Buffer => {
  const keyPath = resolveSecretKeyPath(config);
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  if (!fs.existsSync(keyPath)) fs.writeFileSync(keyPath, crypto.randomBytes(32), { mode: 0o600 });
  const key = fs.readFileSync(keyPath);
  if (key.length !== 32) throw new Error('The email encryption key is invalid.');
  return key;
};

/** Encrypts application secrets with a machine-local key stored outside SQLite. */
export class SecretService {
  private readonly key: Buffer;

  constructor(config: EnvConfig) {
    this.key = ensureSecretKey(config);
  }

  /** Encrypts a plaintext secret with AES-256-GCM. */
  encrypt(value: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
  }

  /** Decrypts a value previously encrypted by this application instance. */
  decrypt(value: string): string {
    if (!value) return '';
    const [version, iv, tag, encrypted] = value.split(':');
    if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('The saved SMTP password cannot be decrypted. Re-enter it in Settings.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
  }
}
