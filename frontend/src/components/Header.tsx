import { useState } from "react";
import type { AppView } from "../types";

interface HeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  lastUpdated?: string | null;
  onRefresh?: () => void;
  apiAvailable?: boolean;
  apiConnected?: boolean;
  refreshDisabled?: boolean;
  refreshStatus?: "idle" | "loading" | "error" | "success";
}

const navItems: Array<{ label: string; view: AppView }> = [
  { label: "Matches", view: "predictions" },
  { label: "Predictions", view: "predictions" },
  { label: "Groups", view: "groups" },
  { label: "Performance", view: "performance" },
  { label: "Trading", view: "trading" },
  { label: "Model", view: "model" },
  { label: "Backtesting", view: "backtesting" },
];

export function Header({
  activeView,
  onNavigate,
  lastUpdated,
  onRefresh,
  apiAvailable,
  apiConnected,
  refreshDisabled,
  refreshStatus = "idle",
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">26</span>
        <div>
          <h1>World Cup Predictor</h1>
          <p>Match outcome and goal prediction model</p>
        </div>
      </div>
      <button
        aria-expanded={mobileMenuOpen}
        aria-label="Open navigation menu"
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen(true)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
      <nav className="nav-links" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            className={activeView === item.view ? "nav-link active" : "nav-link"}
            key={item.label}
            onClick={() => onNavigate(item.view)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="refresh-controls">
        <button className="refresh-button" disabled={refreshDisabled} onClick={onRefresh} type="button">
          {refreshStatus === "loading" ? "Refreshing..." : "Refresh World Cup data"}
        </button>
        <span className="status-pill">
          {apiConnected
            ? `Last updated: ${lastUpdated ? formatTime(lastUpdated) : "pending refresh"}`
            : apiAvailable
              ? "Connecting live API..."
              : "Live API not connected"}
        </span>
      </div>
      {mobileMenuOpen ? (
        <div className="mobile-nav-layer">
          <button
            aria-label="Close navigation menu"
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          />
          <nav className="mobile-nav-drawer" aria-label="Mobile navigation">
            <div className="mobile-nav-header">
              <span>Navigation</span>
              <button aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} type="button">
                Close
              </button>
            </div>
            {navItems.map((item) => (
              <button
                className={activeView === item.view ? "mobile-nav-link active" : "mobile-nav-link"}
                key={item.label}
                onClick={() => handleNavigate(item.view)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
