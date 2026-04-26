import React from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, Badge, Metric, ProgressBar } from "../components/UI";

export default function Journey() {
  const { state } = useJourney();
  const { journey: j, profile: p, checkins, currentWeek } = state;
  const totalW  = j.totalWeeks + j.extensionWeeks;
  const latest  = checkins.length ? checkins[checkins.length-1].weight : j.startWeight;
  const overallPct = Math.round((checkins.length / totalW) * 100);

  const TIER_COLOR = { on_track:"green", ahead:"green", slightly_ahead:"green", slightly_behind:"warn", behind:"danger" };

  return (
    <div className="page-content">
      <Card style={{ marginBottom:14 }}>
        <SectionTitle>Journey overview</SectionTitle>
        <div className="grid-3" style={{ marginBottom:14 }}>
          <Metric label="Start weight"  value={`${j.startWeight} kg`} />
          <Metric label="Current"       value={`${latest} kg`}        color="orange" />
          <Metric label="Target weight" value={`${p.targetWeight} kg`} color="green" />
        </div>
        <ProgressBar pct={overallPct} height={8} />
        <div style={{ fontSize:12, color:"var(--muted)", marginTop:6 }}>
          Week {currentWeek} of {totalW} · {overallPct}% complete · {Math.abs(latest-p.targetWeight).toFixed(1)} kg to go
        </div>
      </Card>

      <Card>
        <SectionTitle>Milestone roadmap</SectionTitle>
        <div className="roadmap">
          {Array.from({ length: totalW }, (_,i) => i+1).map(w => {
            const isDone   = w < currentWeek;
            const isActive = w === currentWeek;
            const ci  = checkins.find(c => c.week === w);
            const mw  = j.milestoneWeights[w] || p.targetWeight;
            const cal = j.weekTargets[w] || j.baseDailyTarget;
            const pf  = isDone ? 100 : isActive ? Math.min(100, Math.round(((new Date().getDay()||7)/7)*100)) : 0;
            const sc  = isDone ? "done" : isActive ? "active" : "locked";

            return (
              <div key={w} className="rm-week">
                <div className="rm-spine">
                  <div className={`rm-dot ${sc}`} />
                  {w < totalW && <div className={`rm-line ${isDone?"done":""}`} />}
                </div>
                <div className={`rm-card ${sc}`}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: isDone?"var(--accent)":isActive?"var(--accent3)":"var(--muted)" }}>
                      Week {w} — Milestone {w}
                      {w > j.totalWeeks && <span style={{ fontSize:10, color:"var(--accent2)", marginLeft:6 }}>(Extension)</span>}
                    </div>
                    <Badge color={isDone?"green":isActive?"purple":"gray"}>
                      {isDone?"Completed":isActive?"Current":"Locked"}
                    </Badge>
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted)", marginBottom:8 }}>
                    Target: <strong style={{color:"var(--text)"}}>{mw} kg</strong>
                    &nbsp;·&nbsp;
                    Daily: <strong style={{color:"var(--text)"}}>{cal} kcal</strong>
                  </div>
                  <ProgressBar pct={pf} height={4} />
                  {ci && (
                    <div style={{ display:"flex", gap:12, marginTop:8, fontSize:11, color:"var(--muted)", flexWrap:"wrap", alignItems:"center" }}>
                      <span>Actual: <strong style={{color:"var(--text)"}}>{ci.weight} kg</strong></span>
                      <span>Energy: {ci.energy}/5</span>
                      <span>Feeling: {ci.feeling}</span>
                      <Badge color={TIER_COLOR[ci.tier]||"warn"}>{ci.tier.replace(/_/g," ")}</Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
