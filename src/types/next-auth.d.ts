import type { DefaultSession } from 'next-auth';

// Augment Auth.js types so our app-specific fields (the user id and the
// isAdmin flag) are available on the session and the JWT throughout the app.
declare module 'next-auth' {
  interface User {
    isAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
  }
}
