import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'beta_cognitive_secret_key_32_chars!'; // Must be 32 chars
const IV_LENGTH = 16; // For AES

export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const key = Buffer.alloc(32);
    Buffer.from(ENCRYPTION_KEY).copy(key);
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (e) {
    return `enc:${Buffer.from(text).toString('base64')}`;
  }
}

export function decrypt(text: string): string {
  if (!text) return "";
  try {
    if (text.startsWith('enc:')) {
      return Buffer.from(text.substring(4), 'base64').toString('utf-8');
    }
    const parts = text.split(':');
    if (parts.length < 2) return text;
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    
    const key = Buffer.alloc(32);
    Buffer.from(ENCRYPTION_KEY).copy(key);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}
