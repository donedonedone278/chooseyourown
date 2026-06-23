import Link from 'next/link';

import { signInWithCredentials } from '@/actions/auth-actions';
import styles from '@/components/chapters/chapter-form.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Incorrect email or password.'
};

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.') : null;

  return (
    <main>
      <div className={styles.authCard}>
        <h1>Sign in</h1>
        {message ? (
          <p className={styles.formError} role="alert">
            {message}
          </p>
        ) : null}
        <form action={signInWithCredentials} className={styles.form}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" required />
          </label>
          <button type="submit" className={`btn btn--primary ${styles.submit}`}>
            Sign in
          </button>
        </form>
        <p className={styles.authFooter}>
          Need an account? <Link href="/auth/sign-up">Create one</Link>
        </p>
      </div>
    </main>
  );
}
