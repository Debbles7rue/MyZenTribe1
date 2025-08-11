import localFont from "next/font/local";

/**
 * Load the same font family your logo uses.
 * Put the files in /public/fonts and make sure the paths below match.
 */
export const brand = localFont({
  src: [
    { path: "../public/fonts/Brand-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Brand-Italic.woff2",  weight: "400", style: "italic" }
  ],
  variable: "--font-brand"
});
