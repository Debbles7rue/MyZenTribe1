import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "MyZenTribe",
  description: "Feel the vibe, find your tribe.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
