// app/messages/page.tsx
// Server component wrapper that disables prerendering for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

import MessagesClient from "./MessagesClient";

export default function Page() {
  return <MessagesClient />;
}
