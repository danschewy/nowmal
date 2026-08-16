export function workspaceFromContext(ctx: {
  session: { id: string; auth: { current: { principalId: string; principalType: string } | null } };
}) {
  const principal = ctx.session.auth.current;
  if (!principal) throw new Error("Nowmal needs an authenticated workspace principal.");
  return {
    workspaceId: principal.principalId,
    actorId: principal.principalId,
    principalType: principal.principalType,
    sessionId: ctx.session.id,
  };
}
