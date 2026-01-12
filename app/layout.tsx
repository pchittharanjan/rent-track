import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { HouseProvider } from "@/contexts/HouseContext";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Rent Tracking - Manage Rent & Utilities",
  description: "Track rent and utilities for you and your roommates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <UserProvider>
          <HouseProvider>
            {children}
          </HouseProvider>
        </UserProvider>
      </body>
    </html>
  );
}
