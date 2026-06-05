import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const links = [
    { href: "#features", label: "Features" },
    { href: "#exams", label: "Exams" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled
          ? "border-border/80 bg-background/85 backdrop-blur-xl"
          : "border-transparent bg-background/40 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight focus-ring">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
            <Zap className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </span>
          <span>
            <span className="gradient-brand-text">P</span>
            <span className="text-foreground">ARIKSHA</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {authed ? (
            <Link
              to="/dashboard"
              className="rounded-lg gradient-brand-bg px-4 py-2 text-sm font-medium text-white shadow-elev-1 transition hover:shadow-glow-blue"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                Login
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-lg gradient-brand-bg px-4 py-2 text-sm font-medium text-white shadow-elev-1 transition hover:shadow-glow-blue"
              >
                Start Free
              </Link>
            </>
          )}
        </div>

        <button
          className="tap-target rounded-lg border border-border p-2 md:hidden focus-ring"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-1 px-4 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            {authed ? (
              <Link
                to="/dashboard"
                className="block rounded-lg gradient-brand-bg px-3 py-2.5 text-center text-sm font-medium text-white"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="block rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  Login
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="block rounded-lg gradient-brand-bg px-3 py-2.5 text-center text-sm font-medium text-white"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
