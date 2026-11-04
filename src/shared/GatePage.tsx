import type { ReactNode } from "react";
// Entry screens of the restricted area: sign-in, new password, demo notice.
export default function GatePage({
  title = "Gestão do Desvio",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <main className="admin admin-gate">
      <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
