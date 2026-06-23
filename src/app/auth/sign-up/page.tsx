import Link from 'next/link';

import { signUp } from '@/actions/auth-actions';
import { HandleField } from '@/components/auth/handle-field';
import styles from '@/components/chapters/chapter-form.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  EmailTaken: 'That email is already registered.',
  HandleTaken: 'That handle is already taken.',
  InvalidHandle: 'Handles are 3-30 characters: lowercase letters, numbers, and hyphens — and not a reserved word.',
  MissingFields: 'Display name, email, password, and handle are all required.'
};

const DISPLAY_NAME_INPUT_ID = 'sign-up-display-name';

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.') : null;

  return (
    <main>
      <div className={styles.authCard}>
        <h1>Create your account</h1>
        {message ? (
          <p className={styles.formError} role="alert">
            {message}
          </p>
        ) : null}
        <form action={signUp} className={styles.form}>
          <label>
            Display name
            <input id={DISPLAY_NAME_INPUT_ID} name="displayName" type="text" required />
          </label>
          <HandleField displayNameInputId={DISPLAY_NAME_INPUT_ID} />
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
