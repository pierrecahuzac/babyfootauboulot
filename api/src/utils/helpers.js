import crypto from 'crypto';

export const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'ligue';
export const genInvite = () => crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
export const genSlug = (name) => `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (e) => typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e.trim());
export const genToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const genVerificationToken = () => genToken(32);
export const genResetToken = () => genToken(32);
