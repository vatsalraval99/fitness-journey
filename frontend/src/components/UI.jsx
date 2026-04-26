import React from "react";

export function Card({ children, style, className = "" }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

export function Badge({ color = "gray", children }) {
  const map = { green:"green", purple:"purple", orange:"orange", amber:"warn", warn:"warn", red:"danger", danger:"danger", gray:"gray", blue:"gray" };
  return <span className={`badge badge-${map[color]||"gray"}`}>{children}</span>;
}

export function Button({ children, variant = "default", onClick, disabled, style, fullWidth, className="" }) {
  const cls = `btn ${variant==="primary"?"btn-primary":variant==="danger"?"btn-danger":""} ${fullWidth?"btn-full":""} ${className}`;
  return <button className={cls} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

export function Input({ label, error, ...props }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input className={`form-input${error?" form-input-err":""}`} {...props} />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <select className="form-select" {...props}>{children}</select>
    </div>
  );
}

export function Metric({ label, value, color="", sub="" }) {
  const colorMap = { green:"metric-green", purple:"metric-purple", orange:"metric-orange", warn:"metric-warn", danger:"metric-danger" };
  return (
    <div className="metric-tile">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${colorMap[color]||""}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

export function AIBox({ children, loading }) {
  return (
    <div className={`ai-box${loading?" ai-box-dim":""}`}>
      {loading ? <span style={{display:"flex",alignItems:"center",gap:8}}><span className="spinner"/>{children}</span> : children}
    </div>
  );
}

export function CalorieRing({ consumed, target }) {
  const pct = Math.min(1, consumed / (target || 1));
  const C = 339.3;
  const offset = C * (1 - pct);
  const over = consumed > target;
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      <circle cx="70" cy="70" r="54" fill="none" stroke="#1a1a26" strokeWidth="13"/>
      <circle cx="70" cy="70" r="54" fill="none"
        stroke={over ? "var(--danger)" : "var(--accent)"}
        strokeWidth="13" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 0.5s" }}
      />
      <text x="70" y="65" textAnchor="middle" fontSize="22" fontWeight="800" fill="#f0f0f5">{consumed}</text>
      <text x="70" y="83" textAnchor="middle" fontSize="10" fill="#888899">of {target} kcal</text>
    </svg>
  );
}

export function ProgressBar({ pct, height = 6 }) {
  return (
    <div className="pbar-wrap" style={{ height }}>
      <div className="pbar" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}
