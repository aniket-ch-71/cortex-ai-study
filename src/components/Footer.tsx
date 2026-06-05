import { Zap, Twitter, Instagram, Github } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-5 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
              <Zap className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span>
              <span className="gradient-brand-text">P</span>ARIKSHA
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            India's AI-powered study platform for competitive exams. Built for the way Indian students actually study.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {[
              { Icon: Twitter, label: "Twitter" },
              { Icon: Instagram, label: "Instagram" },
              { Icon: Github, label: "GitHub" },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="tap-target grid place-items-center rounded-lg border border-border/70 bg-card text-muted-foreground transition hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Product</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground">Features</a></li>
            <li><a href="#exams" className="hover:text-foreground">Exams</a></li>
            <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
            <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Company</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">About</a></li>
            <li><a href="#" className="hover:text-foreground">Careers</a></li>
            <li><a href="#" className="hover:text-foreground">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Legal</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Privacy</a></li>
            <li><a href="#" className="hover:text-foreground">Terms</a></li>
          </ul>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-5 inline-block rounded-lg gradient-brand-bg px-3.5 py-2 text-xs font-medium text-white"
          >
            Start free →
          </Link>
        </div>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground md:px-6">
          © {new Date().getFullYear()} PARIKSHA. Made in India for Indian students.
        </p>
      </div>
    </footer>
  );
}
