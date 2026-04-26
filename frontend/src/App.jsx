import React, { useState } from "react";
import { JourneyProvider, useJourney } from "./context/JourneyContext";
import Setup    from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Journey  from "./pages/Journey";
import Meals    from "./pages/Meals";
import Habits   from "./pages/Habits";
import Checkin  from "./pages/Checkin";
import Insights from "./pages/Insights";
import "./components/styles.css";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "journey",   label: "Journey"   },
  { id: "meals",     label: "Meals"     },
  { id: "habits",    label: "Habits"    },
  { id: "checkin",   label: "Check-in"  },
  { id: "insights",  label: "Insights"  },
];

function Main() {
  const { state, dispatch } = useJourney();
  const [tab, setTab] = useState("dashboard");
  const hasJourney = !!state.profile;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark">FJ</div>
          Fitness Journey
        </div>
        {hasJourney && (
          <nav className="nav">
            {TABS.map(t => (
              <button key={t.id} className={`nb ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
            <button
              className="nb danger"
              style={{ marginLeft: 8 }}
              onClick={() => { if (window.confirm("Reset your journey? All data will be cleared.")) dispatch({ type: "RESET" }); }}
            >
              Reset
            </button>
          </nav>
        )}
      </header>

      {!hasJourney              && <Setup />}
      {hasJourney && tab === "dashboard" && <Dashboard />}
      {hasJourney && tab === "journey"   && <Journey />}
      {hasJourney && tab === "meals"     && <Meals />}
      {hasJourney && tab === "habits"    && <Habits />}
      {hasJourney && tab === "checkin"   && <Checkin />}
      {hasJourney && tab === "insights"  && <Insights />}
    </div>
  );
}

export default function App() {
  return (
    <JourneyProvider>
      <Main />
    </JourneyProvider>
  );
}
