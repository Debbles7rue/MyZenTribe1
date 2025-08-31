// app/messages/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import MessagesClient from "./MessagesClient";

export default function Page() {
  return (
    <div className="messages-page-wrap">
      <MessagesClient />
      <style jsx global>{`
        .messages-page-wrap {
          min-height: calc(100vh - 64px);
          background: linear-gradient(180deg, #f5f3ff 0%, #fff7ed 100%);
        }
      `}</style>
    </div>
  );
}
