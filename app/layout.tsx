import type { Metadata } from "next";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/lara-dark-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "JP Tourism Platform",
  description: "Travel & Visa Services Platform — powered by JP Tourism",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body style={{ minHeight: "100vh", width: "100%", margin: 0 }}>
        <PrimeReactProvider value={{ ripple: true }}>{children}</PrimeReactProvider>
      </body>
    </html>
  );
}
