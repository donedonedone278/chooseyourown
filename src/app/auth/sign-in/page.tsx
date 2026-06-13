import Link from 'next/link';

import { signInWithCredentials } from '@/actions/auth-actions';
import styles from '@/components/chapters/chapter-form.module.css';

export default function SignInPage() {
  return (
    <main>
      <div className={styles.authCard}>
        <h1>Sign in</h1>
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
