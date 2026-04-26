import React, { useMemo, useState } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, AIBox, Button } from "../components/UI";
import { callClaude } from "../utils/api";
import { todayKey } from "../utils/fitness";

export default function Insights() {
  const { state } = useJourney();
  const { journey: j, profile: p, checkins, habits, meals, currentWeek } = state;
  const [aiText,   setAiText]   = useState("");
  const [loading,  setLoading]  = useState(false);

  const totalW   = j.totalWeeks + j.extensionWeeks;
  const latest   = checkins.length ? checkins[checkins.length-1].weight : j.startWeight;
  const lost     = parseFloat((j.startWeight - latest).toFixed(2));
  const pct      = Math.round((checkins.length / totalW) * 100);
  const weeksLeft = totalW - currentWeek + 1;
  const doneH    = habits.filter(h => h.done).length;
  const avgChange = checkins.length
    ? parseFloat((checkins.reduce((s,c)=>s+c.actual,0)/checkins.length).toFixed(2))
    : null;

  const allDays = Object.entries(meals);
  const target  = j.weekTargets[currentWeek] || j.baseDailyTarget;

  // Weight chart points
  const weightPoints = useMemo(() => {
    if (!checkins.length) return [];
    return [{ week:0, weight:j.startWeight }, ...checkins.map(c=>({ week:c.week, weight:c.weight }))];
  }, [checkins, j.startWeight]);

  // Calorie adherence (last 7 days)
  const adherence = useMemo(() => {
    return allDays.slice(-7).map(([date, dayMeals]) => {
      const tot = dayMeals.reduce((s,m)=>s+m.cal,0);
      return { date, tot, pct: Math.round(tot/target*100) };
    });
  }, [allDays, target]);

  const avgAdherencePct = adherence.length
    ? Math.round(adherence.reduce((s,a)=>s+a.pct,0)/adherence.length)
    : 0;

  async function runTrend() {
    if (allDays.length < 2) { alert("Log meals for at least 2 days first"); return; }
    setLoading(true); setAiText("Analysing your patterns…");
    const summary = allDays.map(([date,dm])=>`${date}: ${dm.reduce((s,m)=>s+m.cal,0)} kcal (${dm.length} meals)`).join("\n");
    try {
      const text = await callClaude({
        system: "You are a nutrition analyst. Detect eating patterns from daily calorie logs. Identify under-eating, over-eating, inconsistency, and meal frequency trends. Be specific and actionable in 4–5 sentences.",
        userMessage: `Daily target: ${target} kcal\n\nLogs:\n${summary}\n\nDetect trends and give recommendations.`,
        maxTokens: 350,
      });
      setAiText(text);
    } catch { setAiText("AI unavailable — try again shortly."); }
    setLoading(false);
  }

  // SVG weight chart
  const W=280, H=90, pad=10;
  const maxWt = weightPoints.length ? Math.max(...weightPoints.map(w=>w.weight)) : 0;
  const minWt = weightPoints.length ? Math.min(...weightPoints.map(w=>w.weight)) : 0;
  const rangeWt = maxWt - minWt || 1;
  const pts = weightPoints.map((w,i)=>({
    x: pad + (i/(weightPoints.length-1||1))*(W-2*pad),
    y: H-pad - ((w.weight-minWt)/rangeWt)*(H-2*pad),
    weight: w.weight,
  }));

  return (
    <div className="page-content">
      {/* Top stat cards */}
      <div className="insight-grid">
        <Card className="card-accent-green" style={{marginBottom:0}}>
          <SectionTitle>Total {p.goal==="weight_gain"?"gained":"lost"} so far</SectionTitle>
          <div className="insight-num" style={{color:"var(--accent)"}}>{Math.abs(lost).toFixed(1)} kg</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>since journey start</div>
        </Card>
        <Card className="card-accent-purple" style={{marginBottom:0}}>
          <SectionTitle>Journey completion</SectionTitle>
          <div className="insight-num" style={{color:"var(--accent3)"}}>{pct}%</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>{weeksLeft} week{weeksLeft!==1?"s":""} remaining</div>
        </Card>
        <Card className="card-accent-orange" style={{marginBottom:0}}>
          <SectionTitle>Avg weekly change</SectionTitle>
          <div className="insight-num" style={{color:"var(--accent2)"}}>
            {avgChange!==null ? `${avgChange>=0?"-":"+"}${Math.abs(avgChange)} kg` : "—"}
          </div>
          <div style={{fontSize:12,color:"var(--muted)"}}>per week checked in</div>
        </Card>
        <Card style={{marginBottom:0}}>
          <SectionTitle>Habits today</SectionTitle>
          <div className="insight-num" style={{color: doneH===habits.length?"var(--accent)":doneH>habits.length/2?"var(--warn)":"var(--muted)"}}>
            {doneH}/{habits.length}
          </div>
          <div style={{fontSize:12,color:"var(--muted)"}}>completed today</div>
        </Card>
      </div>

      <div style={{height:14}} />

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:14,marginBottom:14}}>
        {/* Weight trend chart */}
        <Card style={{marginBottom:0}}>
          <SectionTitle>Weight trend</SectionTitle>
          {weightPoints.length < 2 ? (
            <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>Complete your first check-in to see weight trend</div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:90,overflow:"visible"}}>
              <polyline
                points={pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {pts.map((pt,i)=>(
                <g key={i}>
                  <circle cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r="3" fill="var(--accent)" />
                  <text x={pt.x.toFixed(1)} y={(pt.y-8).toFixed(1)} textAnchor="middle" fontSize="9" fill="var(--muted)">{pt.weight}</text>
                </g>
              ))}
            </svg>
          )}
        </Card>

        {/* Calorie adherence bars */}
        <Card style={{marginBottom:0}}>
          <SectionTitle>Calorie adherence</SectionTitle>
          {!adherence.length ? (
            <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>Log meals to see calorie adherence</div>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"flex-end",gap:6,height:70}}>
                {adherence.map((a,i)=>{
                  const h = Math.min(60, Math.round(a.pct*0.6));
                  const col = a.pct>110?"var(--danger)":a.pct>95?"var(--accent)":a.pct>80?"var(--warn)":"var(--muted)";
                  return (
                    <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{width:24,height:60,background:"var(--surface2)",borderRadius:4,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",bottom:0,width:"100%",height:h,background:col,borderRadius:4}} />
                      </div>
                      <div style={{fontSize:9,color:"var(--muted)"}}>{a.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>
                Avg adherence: <strong style={{color:"var(--text)"}}>{avgAdherencePct}%</strong> of daily target · {adherence.length} days logged
              </div>
            </>
          )}
        </Card>
      </div>

      {/* AI trend analysis */}
      <Card>
        <SectionTitle>AI trend analysis</SectionTitle>
        <AIBox loading={loading}>
          {aiText || "Complete at least 2 days of meal logging for AI trend analysis."}
        </AIBox>
        <Button variant="primary" onClick={runTrend} disabled={loading} style={{marginTop:12}}>
          {loading ? "Analysing…" : "Analyse My Trends"}
        </Button>
      </Card>
    </div>
  );
}
