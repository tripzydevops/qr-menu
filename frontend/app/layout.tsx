import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tripzy QR Menu - Premium Digital Menus",
  description: "A fast, gorgeous, and seamless digital menu experience for restaurants, cafes, and hotels in Turkey.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
