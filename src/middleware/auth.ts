import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  findUserById,
  getOrCreateFirebaseUser,
  sanitizeUser,
} from '../db/repository.ts';

const JWT_SECRET =
  process.env.JWT_SECRET && !process.env.JWT_SECRET.startsWith('YOUR_')
    ? process.env.JWT_SECRET
    : 'approval-pwa-enterprise-jwt-secret-key-2026-ibat';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  mobile: string;
  employeeId: string;
  department: string;
  designation: string;
  role: 'super_admin' | 'employee';
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function signJwtToken(user: {
  id: number;
  mobile: string;
  role: string;
}) {
  return jwt.sign(
    {
      sub: String(user.id),
      mobile: user.mobile,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyJwtToken(token: string): {
  sub: string;
  mobile: string;
  role: string;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      sub: string;
      mobile: string;
      role: string;
    };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const queryToken =
    typeof req.query.token === 'string' ? req.query.token : undefined;

  const rawToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1]
      : queryToken;

  if (!rawToken) {
    return res
      .status(401)
      .json({ error: 'Unauthorized: Authentication token is required.' });
  }

  try {
    // 1. Check application JWT token first (Mobile + Password Login)
    const jwtPayload = verifyJwtToken(rawToken);
    if (jwtPayload && jwtPayload.sub) {
      const dbUser = await findUserById(Number(jwtPayload.sub));
      if (!dbUser) {
        return res
          .status(401)
          .json({ error: 'Unauthorized: Account no longer exists.' });
      }
      if (dbUser.status !== 'active') {
        return res.status(403).json({
          error:
            'Your account has been deactivated. Please contact a Super Admin.',
        });
      }
      req.user = sanitizeUser(dbUser) as AuthenticatedUser;
      return next();
    }

    // 2. Fallback to Firebase ID Token verification (Google OAuth Sign-In)
    const decodedToken = await adminAuth.verifyIdToken(rawToken);
    const dbUser = await getOrCreateFirebaseUser(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name
    );

    if (dbUser.status !== 'active') {
      return res.status(403).json({
        error:
          'Your account has been deactivated. Please contact a Super Admin.',
      });
    }

    req.user = sanitizeUser(dbUser) as AuthenticatedUser;
    return next();
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return res
      .status(401)
      .json({ error: 'Unauthorized: Session expired or invalid token.' });
  }
};

export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Forbidden: Super Admin privileges are required for this action.',
    });
  }
  next();
};

// Rate limiter for login endpoint
const loginAttempts = new Map<
  string,
  { count: number; resetAt: number }
>();

export const loginRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = req.ip || 'global';
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return next();
  }

  if (entry.count >= 25) {
    return res.status(429).json({
      error:
        'Too many login attempts from this device. Please wait a few minutes and try again.',
    });
  }

  entry.count += 1;
  next();
};
