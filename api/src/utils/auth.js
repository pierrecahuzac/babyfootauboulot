import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRES = '7d';

export const hashPassword = async (pwd) => bcrypt.hash(pwd, 10);
export const verifyPassword = async (pwd, hash) => bcrypt.compare(pwd, hash);

export const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const authFromRequest = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
};
