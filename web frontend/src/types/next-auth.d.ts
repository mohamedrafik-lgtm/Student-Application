import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN' | 'ACCOUNTANT' | 'MARKETER';
  }

  interface Session {
    user: User;
  }
} 