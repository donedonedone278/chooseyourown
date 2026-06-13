import Link from 'next/link';

import { signInWithCredentials } from '@/actions/auth-actions';

export default function SignInPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <form action={signInWithCredentials}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <button type="submit">Sign in</button>
      </form>
      <p>
        Need an account? <Link href="/auth/sign-up">Create one</Link>
      </p>
    </main>
  );
}
