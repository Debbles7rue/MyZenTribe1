// app/(protected)/calendar/error.tsx
"use client";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-app">
      <div className="card p-5">
        <h2 className="text-xl font-semibold mb-2">We hit a snag</h2>
        <p className="mb-3">
          Something went wrong while loading the calendar. Try refresh. If it continues,
          copy the first red error from the browser console and share it.
        </p>
        <button className="btn btn-brand" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
