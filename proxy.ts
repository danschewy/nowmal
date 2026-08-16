import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

const clerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? clerkMiddleware() : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerk) return NextResponse.next();
  return clerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
