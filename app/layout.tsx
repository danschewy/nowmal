import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "Nowmal — Turn Gmail into a clear plan",
  description:
    "Nowmal finds tasks and promises in Gmail, groups related threads, and helps you reply with evidence and approval before every send.",
  openGraph: {
    title: "Nowmal — Turn Gmail into a clear plan",
    description:
      "See what needs attention, why it matters, and what to do next—without giving up control of your inbox.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Nowmal — Turn Gmail into a clear plan. Evidence before action.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nowmal — Turn Gmail into a clear plan",
    description:
      "See what needs attention, why it matters, and what to do next—without giving up control of your inbox.",
    images: ["/og.png"],
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
