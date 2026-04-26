import React, { useMemo } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, Metric, CalorieRing, ProgressBar } from "../components/UI";
import { todayKey } from "../utils/fitness";

const DAYS = ["M","T","W","T","F","S","S"];

export default function Dashboard() {
  const { state, dispatch } = useJourney();
  const { journey: j, profile: p, habits, meals, currentWeek } = state;

  const consumed = useMemo(() => (meals[todayKey()]||[]).reduce((a,m)=>a+m.cal,0), [meals]);
  const target   = j.weekTargets[currentWeek] || j.baseDailyTarget;
  const remaining = target - consumed;
  const totalW   = j.totalWeeks + j.extensionWeeks;
  const latest   = state.checkins.length ? state.checkins[state.checkins.length-1].weight : j.startWeight;
  const mw       = j.milestoneWeights[currentWeek] || p.targetWeight;
  const todayDow = (new Date().getDay()||7) - 1;
  const weekPct  = Math.min(100, Math.round(((new Date().getDay()||7)/7)*100));
  const doneH    = habits.filter(h=>h.done).length;
  const goalVerb = { fat_loss:"Fat Loss", weight_gain:"Muscle Gain", maintenance:"Maintenance" }[p.goal];

  // Adjustment banner
  const dow = new Date().getDay()||7;
  const daysLeft = 7 - dow;
  const diff = consumed - target;
  let banner = null;
  if (consumed > 0 && Math.abs(diff) >= 80 && daysLeft > 0) {
    const next = target - Math.round(diff / daysLeft);
    const minCal = p.gender === "male" ? 1200 : 1000;
    banner = next < minCal
      ? { type: "ext", msg: `You're ${Math.abs(diff)} kcal ${diff>0?"over":"under"} today. Gap can't be safely recovered — journey may extend slightly.` }
      : { type: "adj", msg: `You're ${Math.abs(diff)} kcal ${diff>0?"over":"under"} today. Aim for ${next} kcal/day for the next ${daysLeft} day${daysLeft!==1?"s":""} to stay on track.` };
  }

  return (
    <div className="page-content">
      {/* Hero */}
      <div className="hero" style={{ marginBottom: 16 }}>
        <div className="hero-title">Fitness Journey</div>
        <div className="hero-sub">{goalVerb} · Week {currentWeek} of {totalW} · {Math.abs(latest - p.targetWeight).toFixed(1)} kg to goal</div>
        <div className="hero-stats">
          <div><div className="hero-stat-val" style={{color:"var(--accent)"}}>{target}</div><div className="hero-stat-label">Daily target kcal</div></div>
          <div><div className="hero-stat-val">{latest}</div><div className="hero-stat-label">Current weight (kg)</div></div>
          <div><div className="hero-stat-val" style={{color:"var(--accent3)"}}>{p.targetWeight}</div><div className="hero-stat-label">Target weight (kg)</div></div>
          <div><div className="hero-stat-val" style={{color:"var(--accent2)"}}>{state.checkins.length}</div><div className="hero-stat-label">Weeks completed</div></div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <Metric label="BMR"          value={j.bmr}    sub="kcal/day base" />
        <Metric label="TDEE"         value={j.tdee}   sub="maintenance kcal" color="purple" />
        <Metric label="BMI"          value={j.bmi}    sub={j.bmi<18.5?"Underweight":j.bmi<25?"Healthy":j.bmi<30?"Overweight":"Obese"} color={j.bmi<18.5||j.bmi>25?"warn":"green"} />
        <Metric label="Est. body fat" value={`${j.bf}%`} sub="estimated" color="orange" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:14, marginBottom:14 }}>
        {/* Calorie ring */}
        <Card className="card-accent-green" style={{ marginBottom:0 }}>
          <SectionTitle>Calories today</SectionTitle>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <CalorieRing consumed={consumed} target={target} />
            <div style={{ flex:1 }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:3 }}>Consumed</div>
                <div style={{ fontSize:20, fontWeight:700, color:"var(--accent)" }}>{consumed} kcal</div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:3 }}>Remaining</div>
                <div style={{ fontSize:20, fontWeight:700, color: remaining<0?"var(--danger)":"var(--text)" }}>{Math.max(0,remaining)} kcal</div>
              </div>
              {banner && <div className={banner.type==="ext"?"banner-ext":"banner-adj"}>{banner.msg}</div>}
            </div>
          </div>
        </Card>

        {/* Milestone card */}
        <Card className="card-accent-purple" style={{ marginBottom:0 }}>
          <SectionTitle>Milestone {currentWeek} progress</SectionTitle>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
              <span style={{ color:"var(--muted)" }}>Target: <strong style={{color:"var(--text)"}}>{mw} kg</strong></span>
              <span style={{ fontWeight:700, color:"var(--accent3)" }}>{weekPct}%</span>
            </div>
            <ProgressBar pct={weekPct} />
          </div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:8 }}>Days this week</div>
          <div className="day-dots">
            {DAYS.map((d,i) => (
              <div key={i} className={`day-dot ${i<todayDow?"done":i===todayDow?"today":""}`}>{d}</div>
            ))}
          </div>
          <div className="divider" />
          <div style={{ fontSize:13, color:"var(--muted)" }}>
            {p.goal==="fat_loss"?"Lose":p.goal==="weight_gain"?"Gain":"Maintain"}{" "}
            <strong style={{color:"var(--accent)"}}>{p.intensity} kg</strong> by end of week {currentWeek} · Week {currentWeek}/{totalW}
          </div>
        </Card>
      </div>

      {/* Habits */}
      <Card>
        <SectionTitle>
          Today's habits{" "}
          <span style={{ color:"var(--accent)", textTransform:"none", letterSpacing:0, fontSize:11 }}>{doneH}/{habits.length} done</span>
        </SectionTitle>
        {habits.slice(0,4).map(h => (
          <div key={h.id} className="habit-row" onClick={() => dispatch({ type:"TOGGLE_HABIT", payload:h.id })}>
            <div className={`hcheck ${h.done?"on":""}`} />
            <div style={{ fontSize:14, textDecoration:h.done?"line-through":"none", color:h.done?"var(--muted)":"var(--text)" }}>{h.label}</div>
          </div>
        ))}
        {habits.length > 4 && <div style={{ fontSize:12, color:"var(--muted)", padding:"4px 0" }}>+{habits.length-4} more in Habits tab</div>}
      </Card>
    </div>
  );
}
