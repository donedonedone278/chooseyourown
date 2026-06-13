'use server';

import { signIn } from '@/lib/auth';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? '')
  };
}

export async function signUp(formData: FormData) {
  const displayName = String(formData.get('displayName') ?? '').trim();
  const { email, password } = readCredentials(formData);

  if (!displayName || !email || !password) {
    throw new Error('Display name, email, and password are all required.');
  }

  const passwordHash = await hashPassword(password);
  await db.user.create({ data: { displayName, email, passwordHash } });

  // On success this throws a redirect to '/', which Next handles.
  await signIn('credentials', { email, password, redirectTo: '/' });
}

export async function signInWithCredentials(formData: FormData) {
  const { email, password } = readCredentials(formData);
  await signIn('credentials', { email, password, redirectTo: '/' });
}
