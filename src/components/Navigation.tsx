import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import type { Category } from "../../shared/contracts";
import {
  navigationCategories,
  navigationShortcuts,
  navigationInput,
  type NavigationSettings,
} from "../../shared/navigation";

export function Navigation({
  categories,
  settings,
  count,
  loading = false,
}: {
  categories: Category[];
  settings?: NavigationSettings;
  count: number;
  loading?: boolean;
}) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const desktopButton = useRef<HTMLButtonElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const options = navigationInput.parse(settings ?? {});
  const links = navigationCategories(categories);
  const shortcuts = navigationShortcuts(links, options);
  const close = () => {
    setDesktopOpen(false);
    setMobileOpen(false);
  };
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setDesktopOpen(false);
        setMobileOpen(false);
      }
    };
    const breakpoint = matchMedia("(max-width: 767px)");
    const resize = () => {
      const focused = document.activeElement;
      const wasInside = root.current?.contains(focused);
      setDesktopOpen(false);
      setMobileOpen(false);
      if (wasInside) {
        (breakpoint.matches
          ? mobileButton.current
          : desktopButton.current
        )?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    breakpoint.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      breakpoint.removeEventListener("change", resize);
    };
  }, []);
  function follow(id: string) {
    close();
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    });
  }
  const categoryLinks = links.map((c) => (
    <li key={c.id}>
      <a href={`#${c.slug}`} onClick={() => follow(c.slug)}>
        {c.name}
      </a>
    </li>
  ));
  return (
    <header
      className="header"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && (desktopOpen || mobileOpen)) {
          e.preventDefault();
          (mobileOpen ? mobileButton.current : desktopButton.current)?.focus();
          close();
        }
      }}
    >
      <div className="site-header-inner container">
        <a
          href="#home"
          className="wordmark"
          aria-label="Sourdough Made Sweet Bakehouse home"
          onClick={() => follow("home")}
        >
          Sourdough <i>Made Sweet</i>
          <small>BAKEHOUSE</small>
        </a>
        <nav className="desktop-navigation" aria-label="Main navigation">
          <a href="#home" onClick={() => follow("home")}>
            Home
          </a>
          <div className="category-shortcuts">
            {shortcuts.map((c) => (
              <a
                key={c.id}
                href={`#${c.slug}`}
                title={c.name}
                onClick={() => follow(c.slug)}
              >
                {c.name}
              </a>
            ))}
          </div>
          <div className="catalog-disclosure">
            <button
              type="button"
              ref={desktopButton}
              className="catalog-toggle"
              aria-expanded={desktopOpen}
              aria-controls="desktop-category-links"
              onClick={() => setDesktopOpen(!desktopOpen)}
            >
              {options.menuLabel}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <div
              id="desktop-category-links"
              className="catalog-panel"
              hidden={!desktopOpen}
            >
              <span className="eyebrow">EXPLORE THE BAKEHOUSE</span>
              {links.length ? (
                <ul>{categoryLinks}</ul>
              ) : (
                <p role="status">
                  {loading
                    ? "Loading our menu…"
                    : "Our menu is currently unavailable."}
                </p>
              )}
            </div>
          </div>
        </nav>
        <a
          className="button header-order"
          href="#order"
          aria-label={`Request an order${count ? `, ${count} items selected` : ""}`}
          onClick={() => follow("order")}
        >
          <span className="order-label-desktop">Request an Order</span>
          <span className="order-label-mobile">Order</span>
          <ShoppingBag size={16} aria-hidden="true" />
          {count > 0 && <span className="order-count">{count}</span>}
        </a>
        <button
          type="button"
          className="mobile-toggle icon-button"
          ref={mobileButton}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-category-links"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>
      <nav
        id="mobile-category-links"
        className="mobile-navigation"
        aria-label="Main navigation"
        hidden={!mobileOpen}
      >
        <a href="#home" onClick={() => follow("home")}>
          Home
        </a>
        <span className="eyebrow">{options.menuLabel}</span>
        {links.length ? (
          <ul>{categoryLinks}</ul>
        ) : (
          <p role="status">
            {loading
              ? "Loading our menu…"
              : "Our menu is currently unavailable."}
          </p>
        )}
        <a
          className="mobile-order-link"
          href="#order"
          onClick={() => follow("order")}
        >
          Request an Order
        </a>
      </nav>
    </header>
  );
}
