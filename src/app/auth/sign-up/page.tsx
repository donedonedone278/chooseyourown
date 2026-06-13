import Link from 'next/link';

import { signUp } from '@/actions/auth-actions';
import styles from '@/components/chapters/chapter-form.module.css';

export default function SignUpPage() {
  return (
    <main>
      <div className={styles.authCard}>
        <h1>Create your account</h1>
        <form action={signUp} className={styles.form}>
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
          <button type="submit" className={`btn btn--primary ${styles.submit}`}>
            Create account
          </button>
        </form>
        <p className={styles.authFooter}>
          Already have an account? <Link href="/auth/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
