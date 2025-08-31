// app/messages/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import MessagesClient from "./MessagesClient";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(180deg, #f5f3ff 0%, #fff7ed 100%)",
      }}
    >
      <MessagesClient />
    </div>
  );
}
