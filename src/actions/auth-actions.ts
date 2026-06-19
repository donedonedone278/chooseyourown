'use server';

import { Prisma } from '@prisma/client';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

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
    redirect('/auth/sign-up?error=MissingFields');
  }

  try {
    const passwordHash = await hashPassword(password);
    await db.user.create({ data: { displayName, email, passwordHash } });
  } catch (error) {
    // A duplicate email is a known, user-facing case — not a crash.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
