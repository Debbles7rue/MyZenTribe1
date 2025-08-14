// app/(public)/layout.tsx
export const metadata = {
  title: "MyZenTribe",
  description: "Connect. Support. Make the world a little better.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        background: "#f3e8ff" /* lavender */,
        color: "#171717"      /* neutral-900 */
      }}>
        <main style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 16px" }}>
          {children}
        </main>
        <footer style={{ borderTop: "1px solid #e5e7eb", padding: "24px 0",
                          textAlign: "center", fontSize: 12, opacity: .7 }}>
          © {new Date().getFullYear()} MyZenTribe — All love, no spam.
        </footer>
      </body>
    </html>
  );
}
