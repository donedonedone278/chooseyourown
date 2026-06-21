'use server';

import { Prisma } from '@prisma/client';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn } from '@/lib/auth';
import { db } from '@/lib/db';
import { isValidHandle, RESERVED_HANDLES } from '@/lib/handles';
import { hashPassword } from '@/lib/passwords';

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? '')
  };
}

export async function signUp(formData: FormData) {
  const displayName = String(formData.get('displayName') ?? '').trim();
  const handle = String(formData.get('handle') ?? '').trim().toLowerCase();
  const { email, password } = readCredentials(formData);

  if (!displayName || !email || !password || !handle) {
    redirect('/auth/sign-up?error=MissingFields');
  }

  if (!isValidHandle(handle) || RESERVED_HANDLES.has(handle)) {
    redirect('/auth/sign-up?error=InvalidHandle');
  }

  try {
    const passwordHash = await hashPassword(password);
    await db.user.create({ data: { displayName, email, username: handle, passwordHash } });
  } catch (error) {
    // A duplicate email or handle is a known, user-facing case — not a crash.
    // `meta.target` tells us which unique constraint fired.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
      if (fields.some((field) => field.includes('username'))) {
        redirect('/auth/sign-up?error=HandleTaken');
      }
      redirect('/auth/sign-up?error=EmailTaken');
    }
    throw error;
  }

  // On success this throws a redirect to '/', which Next handles.
  await signIn('credentials', { email, password, redirectTo: '/' });
}

export async function signInWithCredentials(formData: FormData) {
  const { email, password } = readCredentials(formData);

  try {
    // On success this throws a redirect to '/', which Next handles.
    await signIn('credentials', { email, password, redirectTo: '/' });
  } catch (error) {
    // Bad/unknown credentials surface as an AuthError (e.g. CredentialsSignin).
    // Turn that into a friendly message instead of an unhandled 500; re-throw
    // everything else, including the success redirect (NEXT_REDIRECT).
    if (error instanceof AuthError) {
      redirect('/auth/sign-in?error=CredentialsSignin');
    }
    throw error;
  }
}
