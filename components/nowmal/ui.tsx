import type { ButtonHTMLAttributes, ReactNode } from "react";

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

export function ActionButton({ tone = "outline", className = "", ...props }: ActionButtonProps) {
  return <button className={`action-button action-${tone} ${className}`} {...props} />;
}

export function StatusSquare({ status }: { status: "now" | "wait" | "later" | "done" }) {
  return <span className={`status-square status-${status}`} aria-hidden="true" />;
}

export function EmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="empty-state">
      <Eyebrow>Not connected</Eyebrow>
      <h1>There is nothing here yet, and that is correct.</h1>
      <p>
        Nowmal has nothing of its own. Every task, tracker and cluster in it is read out of your
        mail. Connect the account and the first pass takes about a minute.
      </p>
      <ActionButton tone="solid" onClick={onSetup}>
        Go to setup
      </ActionButton>
    </div>
  );
}
