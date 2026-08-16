import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="integration-wall">
        <p className="integration-kicker">Nowmal · Sign in</p>
        <h1>Clerk is not configured yet.</h1>
        <p>The public demo is available now and does not require an account.</p>
        <div className="integration-actions">
          <Link href="/demo">Open the public demo</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <SignIn />
    </main>
  );
}
