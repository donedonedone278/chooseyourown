import Link from 'next/link';

import { signUp } from '@/actions/auth-actions';

export default function SignUpPage() {
  return (
    <main>
      <h1>Create your account</h1>
      <form action={signUp}>
        <label>
          Display name
          <input name="displayName" type="text" required />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required minLength={8} />
        </label>
        <button type="submit">Create account</button>
      </form>
      <p>
        Already have an account? <Link href="/auth/sign-in">Sign in</Link>
      </p>
    </main>
  );
}
