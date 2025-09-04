import { redirect } from 'next/navigation';

export default function CommunitiesRedirect() {
  redirect('/communities');
  return null;
}
