import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="integration-wall">
        <p className="integration-kicker">Nowmal · Connect Gmail</p>
        <h1>Account connections are not available yet.</h1>
        <p>You can explore the complete sample inbox now, with no account or Gmail access.</p>
        <div className="integration-actions">
          <Link href="/demo">Try the sample inbox</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/workspace"
      />
    </main>
  );
}
