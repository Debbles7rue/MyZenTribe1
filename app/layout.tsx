import "react-big-calendar/lib/css/react-big-calendar.css"; // ← needed for proper calendar layout
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="page-wrap">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
