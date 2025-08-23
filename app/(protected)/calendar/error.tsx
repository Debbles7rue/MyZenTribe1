"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Always log to the console for extra details
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[/calendar] route error:", error);
  }, [error]);

  return (
    <div
      style={{
        margin: "12px auto",
        maxWidth: 980,
        background: "#FFF6ED",
        border: "1px solid #F4DEC8",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <h2 style={{ fontSize: 28, margin: 0 }}>We hit a snag</h2>
      <p style={{ marginTop: 10 }}>
        The calendar page had a rendering error. You can try again, and if it
        keeps happening, please copy the details below and share them with me.
      </p>

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Show error details
        </summary>
        <pre
          style={{
            marginTop: 10,
            whiteSpace: "pre-wrap",
            background: "#fff",
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 10,
            maxHeight: 320,
            overflow: "auto",
          }}
        >
{String(error?.message || "(no message)")}
{"\n\n"}
{String(error?.stack || "(no stack)")}
        </pre>
      </details>

      <button
        onClick={reset}
        style={{
          marginTop: 14,
          padding: "8px 14px",
          borderRadius: 10,
          border: "1px solid #d8c49b",
          background: "linear-gradient(#ffe9be, #f7dca6)",
          fontWeight: 700,
          color: "#221b0f",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
