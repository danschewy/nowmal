import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "Nowmal — a quiet layer over Gmail",
  description:
    "Nowmal reads the work hiding in Gmail, keeps promises and tasks together, and makes every send pass through a human gate.",
  openGraph: {
    title: "Nowmal — a quiet layer over Gmail",
    description:
      "Tasks, promises, trackers, and a human-gated Eve assistant over Gmail.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return document;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/workspace"
      signUpFallbackRedirectUrl="/workspace"
    >
      {document}
    </ClerkProvider>
  );
}
