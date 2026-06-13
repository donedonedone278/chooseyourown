import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/passwords';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { signIn: '/auth/sign-in' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.displayName, isAdmin: user.isAdmin };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      // The callback's `token` is typed via Auth.js core JWT, which our
      // `next-auth/jwt` augmentation doesn't merge into, so these read back as
      // `unknown`. We set both in the jwt callback above, so cast at this seam.
      session.user.id = (token.id as string | undefined) ?? '';
      session.user.isAdmin = (token.isAdmin as boolean | undefined) ?? false;
      return session;
    }
  }
});

/** Require a signed-in user; redirects to sign-in when absent. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/sign-in');
  return session;
}

/** Require a signed-in admin; redirects non-admins home. */
export async function requireAdminUser() {
  const session = await requireUser();
  if (!session.user.isAdmin) redirect('/');
  return session;
}
