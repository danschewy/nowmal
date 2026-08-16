import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NowmalApp } from "@/components/nowmal/NowmalApp";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <MissingCredentials />;
  }

  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="integration-wall">
        <p className="integration-kicker">Nowmal · Connected workspace</p>
        <h1>Bring your own inbox.</h1>
        <p>
          The public demo needs no account. Connecting Gmail uses Clerk so the narrow Google
          permissions stay attached to you.
        </p>
        <div className="integration-actions">
        <Link href="/sign-up">Continue with Google</Link>
          <Link href="/demo">Open the public demo</Link>
        </div>
      </main>
    );
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "connected@gmail.com";
  return <NowmalApp mode="connected" accountEmail={email} />;
}

function MissingCredentials() {
  return (
    <main className="integration-wall">
      <p className="integration-kicker">Nowmal · Connected workspace</p>
      <h1>The product is ready for its keys.</h1>
      <p>
        Add Clerk, Neon, and Google OAuth credentials to activate the private workspace. The
        complete product demo remains available without any account.
      </p>
      <div className="integration-actions">
        <Link href="/demo">Open the public demo</Link>
      </div>
    </main>
  );
}
