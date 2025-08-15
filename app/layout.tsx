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
