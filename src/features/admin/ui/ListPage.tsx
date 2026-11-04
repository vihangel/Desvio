import type { ReactNode } from "react";
export function ListPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="list-page">
      <div className="list-header">
        <div>
          <h1>{title}</h1>
          <p className="section-description">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
// One row of a list: thumbnail, text and a chevron, as one big button.
export function ItemCard({
  thumb,
  onOpen,
  children,
}: {
  thumb: ReactNode;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="item-card" onClick={onOpen}>
      {thumb}
      <span className="item-text">{children}</span>
      <span className="item-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}
