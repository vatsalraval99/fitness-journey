import React, { useState, useMemo } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, Badge, Metric, ProgressBar, AIBox, Button } from "../components/UI";
import { callClaude } from "../utils/api";
import { TIER_META, todayKey } from "../utils/fitness";

// ── Insights sub-page ─────────────────────────────────────────────────────────
function Insights() {
  const { state } = useJourney();
  const { journey:j, profile:p, checkins, habits, meals, currentWeek } = state;
  const [aiText, setAiText]   = useState("");
  const [loading, setLoading] = useState(false);

  const totalW    = j.totalWeeks+j.extensionWeeks;
  const latest    = checkins.length?checkins[checkins.length-1].weight:j.startWeight;
  const lost      = parseFloat((j.startWeight-latest).toFixed(2));
  const pct       = Math.round((checkins.length/totalW)*100);
  const weeksLeft = totalW-currentWeek+1;
  const doneH     = habits.filter(h=>h.done).length;
  const avgChange = checkins.length?parseFloat((checkins.reduce((s,c)=>s+c.actual,0)/checkins.length).toFixed(2)):null;
  const allDays   = Object.entries(meals);
  const target    = j.weekTargets[currentWeek]||j.baseDailyTarget;

  const weightPoints = useMemo(()=>[{week:0,weight:j.startWeight},...checkins.map(c=>({week:c.week,weight:c.weight}))],[checkins,j.startWeight]);
  const adherence    = useMemo(()=>allDays.slice(-7).map(([date,dm])=>({date,tot:dm.reduce((s,m)=>s+m.cal,0),pct:Math.round(dm.reduce((s,m)=>s+m.cal,0)/target*100)})),[allDays,target]);
  const avgAdh       = adherence.length?Math.round(adherence.reduce((s,a)=>s+a.pct,0)/adherence.length):0;

  async function runTrend(){
    if(allDays.length<2){alert("Log meals for at least 2 days first");return;}
    setLoading(true);setAiText("Analysing your patterns…");
    const summary=allDays.map(([d,dm])=>`${d}: ${dm.reduce((s,m)=>s+m.cal,0)} kcal`).join("\n");
    try{
      const text=await callClaude({system:"You are a nutrition analyst. Detect eating patterns from daily calorie logs. Identify under-eating, over-eating, inconsistency, and meal frequency trends. Be specific and actionable in 4–5 sentences.",userMessage:`Daily target: ${target} kcal\n\nLogs:\n${summary}\n\nDetect trends and give recommendations.`,maxTokens:350});
      setAiText(text);
    }catch{setAiText("AI unavailable — try again shortly.");}
    setLoading(false);
  }

  const W=240,H=80,pad=8;
  const maxWt=weightPoints.length?Math.max(...weightPoints.map(w=>w.weight)):0;
  const minWt=weightPoints.length?Math.min(...weightPoints.map(w=>w.weight)):0;
  const rangeWt=maxWt-minWt||1;
  const svgPts=weightPoints.map((w,i)=>({x:pad+(i/(weightPoints.length-1||1))*(W-2*pad),y:H-pad-((w.weight-minWt)/rangeWt)*(H-2*pad),weight:w.weight}));

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <Card className="card-accent-green" style={{marginBottom:0}}><div className="ct">Progress</div><div style={{fontSize:26,fontWeight:800,color:"var(--accent)"}}>{Math.abs(lost).toFixed(1)} kg</div><div style={{fontSize:11,color:"var(--muted)"}}>since journey start</div></Card>
        <Card className="card-accent-purple" style={{marginBottom:0}}><div className="ct">Completion</div><div style={{fontSize:26,fontWeight:800,color:"var(--accent3)"}}>{pct}%</div><div style={{fontSize:11,color:"var(--muted)"}}>{weeksLeft} week{weeksLeft!==1?"s":""} remaining</div></Card>
        <Card className="card-accent-orange" style={{marginBottom:0}}><div className="ct">Avg weekly change</div><div style={{fontSize:26,fontWeight:800,color:"var(--accent2)"}}>{avgChange!==null?`${avgChange>=0?"-":"+"}${Math.abs(avgChange)} kg`:"—"}</div><div style={{fontSize:11,color:"var(--muted)"}}>per check-in</div></Card>
        <Card style={{marginBottom:0}}><div className="ct">Habits today</div><div style={{fontSize:26,fontWeight:800,color:doneH===habits.length?"var(--accent)":doneH>habits.length/2?"var(--warn)":"var(--muted)"}}>{doneH}/{habits.length}</div><div style={{fontSize:11,color:"var(--muted)"}}>completed</div></Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <Card style={{marginBottom:0}}>
          <SectionTitle>Weight trend</SectionTitle>
          {weightPoints.length<2?<div style={{color:"var(--muted)",fontSize:12,padding:"8px 0"}}>Complete first check-in to see trend</div>:(
            <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:80,overflow:"visible"}}>
              <polyline points={svgPts.map(pt=>`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {svgPts.map((pt,i)=><g key={i}><circle cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r="3" fill="var(--accent)"/><text x={pt.x.toFixed(1)} y={(pt.y-7).toFixed(1)} textAnchor="middle" fontSize="8" fill="var(--muted)">{pt.weight}</text></g>)}
            </svg>
          )}
        </Card>
        <Card style={{marginBottom:0}}>
          <SectionTitle>Calorie adherence</SectionTitle>
          {!adherence.length?<div style={{color:"var(--muted)",fontSize:12,padding:"8px 0"}}>Log meals to see adherence</div>:(
            <>
              <div style={{display:"flex",alignItems:"flex-end",gap:5,height:60}}>
                {adherence.map((a,i)=>{const h=Math.min(52,Math.round(a.pct*0.52));const col=a.pct>110?"var(--danger)":a.pct>95?"var(--accent)":a.pct>80?"var(--warn)":"var(--muted)";return(<div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1}}><div style={{width:"100%",height:52,background:"var(--surface2)",borderRadius:4,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",bottom:0,width:"100%",height:h,background:col,borderRadius:4}}/></div><div style={{fontSize:8,color:"var(--muted)"}}>{a.date.slice(5)}</div></div>);})}
              </div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>Avg: <strong style={{color:"var(--text)"}}>{avgAdh}%</strong> · {adherence.length} days logged</div>
            </>
          )}
        </Card>
      </div>
      <Card>
        <SectionTitle>AI trend analysis</SectionTitle>
        <AIBox loading={loading}>{aiText||"Complete at least 2 days of meal logging for AI analysis."}</AIBox>
        <Button variant="primary" onClick={runTrend} disabled={loading} style={{marginTop:10}}>{loading?"Analysing…":"Analyse My Trends"}</Button>
      </Card>
    </div>
  );
}

// ── Milestone detail view ─────────────────────────────────────────────────────
function MilestoneDetail({ week, onBack }) {
  const { state } = useJourney();
  const { journey:j, profile:p, checkins, meals } = state;
  const ci     = checkins.find(c=>c.week===week);
  const mw     = j.milestoneWeights[week]||p.targetWeight;
  const cal    = j.weekTargets[week]||j.baseDailyTarget;
  const isDone = week < state.currentWeek;
  const isActive = week === state.currentWeek;

  // Build 7 days for this milestone week
  // We approximate: startDate + (week-1)*7 days
  const startDate = new Date(j.startDate);
  const weekStart = new Date(startDate);
  weekStart.setDate(startDate.getDate() + (week-1)*7);

  const days = Array.from({length:7},(_,i)=>{
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate()+i);
    const key = d.toISOString().slice(0,10);
    const dayMeals = meals[key]||[];
    const consumed = dayMeals.reduce((s,m)=>s+m.cal,0);
    const protein  = dayMeals.reduce((s,m)=>s+(m.protein||0),0);
    const carbs    = dayMeals.reduce((s,m)=>s+(m.carbs||0),0);
    const fats     = dayMeals.reduce((s,m)=>s+(m.fats||0),0);
    const DAYNAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return { key, label:`${DAYNAMES[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`, consumed, protein, carbs, fats, logged:dayMeals.length>0 };
  });

  const totalConsumed = days.reduce((s,d)=>s+d.consumed,0);
  const avgCal        = Math.round(totalConsumed/7);
  const TIER_COLOR    = {on_track:"green",ahead:"green",slightly_ahead:"green",slightly_behind:"amber",behind:"danger"};

  return (
    <div>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontFamily:"inherit",fontSize:13,marginBottom:14,padding:0}}>
        ← Back to roadmap
      </button>

      <div style={{padding:"16px 20px",background:"linear-gradient(135deg,#0d1f1a,#0a0a1f 50%,#1a0d1f)",border:"1px solid var(--border)",borderRadius:14,marginBottom:14,position:"relative",overflow:"hidden"}}>
        <div style={{fontSize:11,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Week {week} — Milestone {week}</div>
        <div style={{fontSize:20,fontWeight:800,background:"linear-gradient(135deg,var(--accent),var(--accent3))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
          Target: {mw} kg
        </div>
        <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{cal} kcal/day target · {isDone?"Completed":isActive?"In progress":"Not started yet"}</div>
        {ci&&<div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}><Badge color={TIER_COLOR[ci.tier]||"amber"}>{TIER_META[ci.tier]?.label}</Badge><span style={{fontSize:12,color:"var(--muted)"}}>Actual: {ci.weight} kg · Energy {ci.energy}/5</span></div>}
      </div>

      {/* Week summary stats */}
      <div className="grid-4" style={{marginBottom:12}}>
        <Metric label="Avg daily kcal" value={avgCal||"—"} color={avgCal?"green":""} />
        <Metric label="Days logged"    value={days.filter(d=>d.logged).length+"/7"} />
        <Metric label="Weekly target"  value={`${mw} kg`} color="purple" />
        <Metric label="Daily target"   value={`${cal} kcal`} color="orange" />
      </div>

      {/* Daily breakdown */}
      <Card>
        <SectionTitle>Daily progress</SectionTitle>
        {days.map((d,i)=>{
          const pct=Math.min(100,Math.round((d.consumed/cal)*100));
          const isToday=d.key===todayKey();
          return (
            <div key={i} style={{padding:"12px 0",borderBottom:i<6?"1px solid var(--border)":"none"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:d.logged?6:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:isToday?"var(--accent)":"var(--text)"}}>{d.label}{isToday&&<span style={{fontSize:10,marginLeft:6,color:"var(--accent)"}}>Today</span>}</div>
                </div>
                {d.logged?(
                  <div style={{fontSize:12,fontWeight:700,color:d.consumed>cal?"var(--danger)":"var(--accent)"}}>{d.consumed} kcal</div>
                ):(
                  <div style={{fontSize:12,color:"var(--muted)"}}>—</div>
                )}
              </div>
              {d.logged&&(
                <>
                  <div class="pbar-wrap" style={{height:4,marginBottom:4}}><div class="pbar" style={{width:`${pct}%`,background:d.consumed>cal?"var(--danger)":"var(--accent)"}}/></div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>P:{d.protein}g · C:{d.carbs}g · F:{d.fats}g</div>
                </>
              )}
              {!d.logged&&<div style={{fontSize:11,color:"var(--muted)"}}>No meals logged</div>}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── Journey overview (roadmap) ────────────────────────────────────────────────
function JourneyOverview({ onSelectMilestone }) {
  const { state } = useJourney();
  const { journey:j, profile:p, checkins, currentWeek } = state;
  const totalW  = j.totalWeeks+j.extensionWeeks;
  const latest  = checkins.length?checkins[checkins.length-1].weight:j.startWeight;
  const overallPct = Math.round((checkins.length/totalW)*100);
  const TIER_COLOR = {on_track:"green",ahead:"green",slightly_ahead:"green",slightly_behind:"amber",behind:"danger"};

  return (
    <div>
      <Card style={{marginBottom:14}}>
        <SectionTitle>Journey overview</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          <Metric label="Start weight"  value={`${j.startWeight} kg`}/>
          <Metric label="Current"       value={`${latest} kg`} color="orange"/>
          <Metric label="Target"        value={`${p.targetWeight} kg`} color="green"/>
        </div>
        <ProgressBar pct={overallPct} height={8}/>
        <div style={{fontSize:12,color:"var(--muted)",marginTop:6}}>
          Week {currentWeek} of {totalW} · {overallPct}% complete · {Math.abs(latest-p.targetWeight).toFixed(1)} kg to go
        </div>
      </Card>

      <Card>
        <SectionTitle>Milestones — click to view details</SectionTitle>
        <div className="roadmap">
          {Array.from({length:totalW},(_,i)=>i+1).map(w=>{
            const isDone=w<currentWeek, isActive=w===currentWeek;
            const ci=checkins.find(c=>c.week===w);
            const mw=j.milestoneWeights[w]||p.targetWeight;
            const cal=j.weekTargets[w]||j.baseDailyTarget;
            const pf=isDone?100:isActive?Math.min(100,Math.round(((new Date().getDay()||7)/7)*100)):0;
            const sc=isDone?"done":isActive?"active":"locked";
            return (
              <div key={w} className="rm-week">
                <div className="rm-spine">
                  <div className={`rm-dot ${sc}`}/>
                  {w<totalW&&<div className={`rm-line ${isDone?"done":""}`}/>}
                </div>
                <div className={`rm-card ${sc}`} onClick={()=>onSelectMilestone(w)} style={{cursor:"pointer",transition:"opacity 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:isDone?"var(--accent)":isActive?"var(--accent3)":"var(--muted)"}}>
                      Week {w} — Milestone {w}{w>j.totalWeeks&&<span style={{fontSize:10,color:"var(--accent2)",marginLeft:6}}>(Ext)</span>}
                    </div>
                    <Badge color={isDone?"green":isActive?"purple":"gray"}>{isDone?"Done":isActive?"Active":"Locked"}</Badge>
                  </div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>
                    Target: <strong style={{color:"var(--text)"}}>{mw} kg</strong> · <strong style={{color:"var(--text)"}}>{cal} kcal/day</strong>
                  </div>
                  <ProgressBar pct={pf} height={4}/>
                  {ci&&(
                    <div style={{display:"flex",gap:10,marginTop:8,fontSize:11,color:"var(--muted)",flexWrap:"wrap",alignItems:"center"}}>
                      <span>Actual: <strong style={{color:"var(--text)"}}>{ci.weight} kg</strong></span>
                      <span>Energy: {ci.energy}/5</span>
                      <Badge color={TIER_COLOR[ci.tier]||"amber"}>{TIER_META[ci.tier]?.label}</Badge>
                    </div>
                  )}
                  <div style={{fontSize:10,color:"var(--muted)",marginTop:6,opacity:0.7}}>Tap to view daily breakdown →</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Main Journey page with sub-tabs ──────────────────────────────────────────
export default function Journey() {
  const [subTab, setSubTab]             = useState("overview");
  const [selectedMilestone, setSelected] = useState(null);

  function selectMilestone(w) { setSelected(w); }
  function backToRoadmap()    { setSelected(null); }

  return (
    <div className="page-content">
      {/* Sub-tab switcher */}
      {!selectedMilestone&&(
        <div style={{display:"flex",gap:4,background:"var(--surface2)",borderRadius:10,padding:4,marginBottom:16}}>
          {[{id:"overview",label:"🗺️ Journey Overview"},{id:"insights",label:"💡 Insights"}].map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)} style={{flex:1,padding:"9px 16px",borderRadius:8,border:"none",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s",
              background:subTab===t.id?"var(--surface)":"transparent",
              color:subTab===t.id?"var(--text)":"var(--muted)",
              boxShadow:subTab===t.id?"0 1px 3px rgba(0,0,0,0.2)":"none"}}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {selectedMilestone ? (
        <MilestoneDetail week={selectedMilestone} onBack={backToRoadmap}/>
      ) : subTab==="overview" ? (
        <JourneyOverview onSelectMilestone={selectMilestone}/>
      ) : (
        <Insights/>
      )}
    </div>
  );
}
