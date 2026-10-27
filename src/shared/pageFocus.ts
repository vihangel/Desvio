// After a client-side navigation, screen readers stay where they were unless
// focus moves. Focusing the new page's main heading announces it.
export function focusPageHeading(attempts = 10) {
  const heading = document.querySelector<HTMLElement>("#conteudo h1");
  if (!heading) {
    // Lazy pages render a moment later.
    if (attempts > 0)
      window.setTimeout(() => focusPageHeading(attempts - 1), 100);
    return;
  }
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}
