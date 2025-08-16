// app/signin/page.tsx  (REPLACE ENTIRE FILE WITH THIS)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import SignInClient from './SignInClient';

export default function SignInPage() {
  return <SignInClient />;
}
