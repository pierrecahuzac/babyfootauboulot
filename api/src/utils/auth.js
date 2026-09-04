import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET manquant en prod — renseigne .env');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod-please-override-32-chars';
if (process.env.NODE_ENV !== 'test' && JWT_SECRET.length < 32) {
  console.warn('⚠️ JWT_SECRET trop court (<32), risque faible entropie');
}
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

export const hashPassword = async (pwd) => bcrypt.hash(pwd, 10);
export const verifyPassword = async (pwd, hash) => bcrypt.compare(pwd, hash);
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRES });
export const verifyToken = (token) => jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

export const authFromRequest = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
};
