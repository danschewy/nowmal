import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function PageHeading({ children }: { children: ReactNode }) {
  return <h1 className="page-heading">{children}</h1>;
}

export function Lede({ children }: { children: ReactNode }) {
  return <p className="lede">{children}</p>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-label">
      <span>{children}</span>
      {right ? <span>{right}</span> : null}
    </div>
  );
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "solid" | "outline" | "ghost" | "danger";
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  { tone = "outline", className = "", ...props },
  ref,
) {
  return <button ref={ref} className={`action-button action-${tone} ${className}`} {...props} />;
});

export function StatusSquare({ status }: { status: "now" | "wait" | "later" | "done" }) {
  return <span className={`status-square status-${status}`} aria-hidden="true" />;
}

export function EmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="empty-state">
      <Eyebrow>Your workspace is empty</Eyebrow>
      <h1>Connect Gmail to see what needs your attention.</h1>
      <p>
        Nowmal starts with up to 300 threads from the last 30 days and turns them into tasks,
        promises, and useful groups. The first connection is read-only; no email can be sent.
      </p>
      <ActionButton tone="solid" onClick={onSetup}>
        Connect Gmail
      </ActionButton>
    </div>
  );
}
