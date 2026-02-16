import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "./auth-wrapper";
import { Providers } from "./providers";
import { TooltipProvider } from "@/Components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Odon",
  description: "Created By Vansh Jain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full h-screen`}
      >
        <Providers>
          <AuthWrapper>
            <TooltipProvider delayDuration={300}>
              {children}
            </TooltipProvider>
          </AuthWrapper>
        </Providers>
      </body>
    </html>
  );
}
