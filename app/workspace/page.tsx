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
        <p className="integration-kicker">Nowmal · Your workspace</p>
        <h1>Turn Gmail into a clear plan.</h1>
        <p>
          Connect Google to find the tasks, commitments, and follow-ups in your recent mail.
          Nowmal starts with read-only access; sending is separate and always requires approval.
        </p>
        <div className="integration-actions">
          <Link href="/sign-up">Connect with Google</Link>
          <Link href="/demo">Try the sample inbox</Link>
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
      <p className="integration-kicker">Nowmal · Your workspace</p>
      <h1>The connected workspace is not available yet.</h1>
      <p>
        Account connections are still being configured. You can explore the complete sample
        inbox now—no sign-in or Gmail access required.
      </p>
      <div className="integration-actions">
        <Link href="/demo">Try the sample inbox</Link>
      </div>
    </main>
  );
}
