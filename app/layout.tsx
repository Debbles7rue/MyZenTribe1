import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="page-wrap">{children}</div>
      </body>
    </html>
  );
}
