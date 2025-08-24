// app/(protected)/calendar/page.tsx
import dynamic from "next/dynamic";

const CalendarClient = dynamic(() => import("@/components/CalendarClient"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-5xl p-8 text-center text-sm text-zinc-500">
      Loading calendar…
    </div>
  ),
});

export default function CalendarPage() {
  return (
    <div className="page">
      <div className="container-app">
        <h1 className="page-title">Calendar</h1>
        <CalendarClient />
      </div>
    </div>
  );
}
