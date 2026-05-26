/**
 * app/layout.js — Root layout (Server Component)
 * Imports global CSS + PrimeReact theme, wraps with PrimeReactProvider.
 */
import "primereact/resources/themes/lara-dark-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./globals.css";

import { PrimeReactProvider } from "primereact/api";

export const metadata = {
  title: "JP Tourism Platform",
  description: "Travel & Visa Services Platform — powered by JP Tourism",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PrimeReactProvider value={{ ripple: true }}>
          {children}
        </PrimeReactProvider>
      </body>
    </html>
  );
}
