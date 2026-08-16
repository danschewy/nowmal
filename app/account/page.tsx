import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { product } from "@/lib/domain/config";

export default function AccountPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="integration-wall">
        <p className="integration-kicker">Nowmal · Gmail permission</p>
        <h1>Clerk is not configured yet.</h1>
        <p>Connect the external account first; the public demo does not need this permission.</p>
        <div className="integration-actions"><Link href="/demo">Open the public demo</Link></div>
      </main>
    );
  }
  return (
    <main className="auth-page">
      <UserProfile additionalOAuthScopes={{ google: [product.gmailSendScope] }} />
    </main>
  );
}
