import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/db.js';
import { users } from '../db/schema.js';
import { signupSchema, loginSchema } from '../validation/authValidation.js';
import { hashPassword, verifyPassword, signToken } from '../utils/authUtils.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const validation = signupSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const { name, email, password } = validation.data;

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);

    const [insertedUser] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning();

    const token = signToken({ id: insertedUser.id, email: insertedUser.email });

    return res.status(201).json({
      data: {
        token,
        user: {
          id: insertedUser.id,
          name: insertedUser.name,
          email: insertedUser.email,
        },
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

authRouter.post('/login', async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const { email, password } = validation.data;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Enumeration prevention: identical response whether the email
    // doesn't exist or the password is wrong.
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, email: user.email });

    return res.status(200).json({
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in' });
  }
});

authRouter.post('/logout', (req, res) => {
  // Stateless JWT — nothing to revoke server-side without a blocklist
  // (deliberately out of scope). Real logout happens client-side.
  return res.status(200).json({ data: { message: 'Logged out' } });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { userId } = req.user;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Token can still be valid for days after an account is deleted —
    // handle that edge case explicitly rather than 500ing.
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      data: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});