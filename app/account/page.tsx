import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { product } from "@/lib/domain/config";

export default function AccountPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="integration-wall">
        <p className="integration-kicker">Nowmal · Send access</p>
        <h1>Send access is not available yet.</h1>
        <p>You can still explore every approval step in the sample inbox without connecting an account.</p>
        <div className="integration-actions"><Link href="/demo">Try the sample inbox</Link></div>
      </main>
    );
  }
  return (
    <main className="auth-page">
      <div className="account-page-heading">
        <Link href="/workspace">← Back to Nowmal</Link>
        <div>
          <p className="integration-kicker">Nowmal · Google access</p>
          <h1>Review Gmail permissions.</h1>
          <p>Read access refreshes the bounded index. Send access is separate and every send still requires approval.</p>
        </div>
      </div>
      <UserProfile additionalOAuthScopes={{ google: [product.gmailSendScope] }} />
    </main>
  );
}
