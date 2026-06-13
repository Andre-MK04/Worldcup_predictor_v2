import type { AppView } from "../types";

interface HeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const navItems: Array<{ label: string; view: AppView }> = [
  { label: "Matches", view: "predictions" },
  { label: "Predictions", view: "predictions" },
  { label: "Groups", view: "groups" },
  { label: "Model", view: "model" },
  { label: "Backtesting", view: "backtesting" },
];

export function Header({ activeView, onNavigate }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">26</span>
        <div>
          <h1>World Cup Predictor</h1>
          <p>Match outcome and goal prediction model</p>
        </div>
      </div>
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
      <span className="status-pill">Model v1.0 · Updated today</span>
    </header>
  );
}
