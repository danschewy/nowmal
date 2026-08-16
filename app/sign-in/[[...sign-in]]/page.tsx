import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="integration-wall">
        <p className="integration-kicker">Nowmal · Sign in</p>
        <h1>Sign-in is not available yet.</h1>
        <p>You can explore the complete sample inbox now, with no account or Gmail access.</p>
        <div className="integration-actions">
          <Link href="/demo">Try the sample inbox</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/workspace"
      />
    </main>
  );
}
