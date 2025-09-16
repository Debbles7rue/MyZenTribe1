// app/business/[handle]/page.tsx
import { redirect } from 'next/navigation';

type Params = { params: { handle: string } };

export default function HandleRedirectPage({ params }: Params) {
  // strip a leading '@' if present
  const clean = (params.handle || '').replace('@', '');
  redirect(`/business/${clean}`);
}
