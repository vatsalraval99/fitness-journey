import React, { useState, useMemo } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, CalorieRing, ProgressBar } from "../components/UI";
import { callClaude, estimateCaloriesLocally } from "../utils/api";
import { todayKey } from "../utils/fitness";

const DAYS = ["M","T","W","T","F","S","S"];

export default function Today({ onLogMeal }) {
  const { state, dispatch } = useJourney();
  const { journey: j, profile: p, habits, meals, currentWeek } = state;

  const [showModal, setShowModal]   = useState(false);
  const [mealDesc, setMealDesc]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [mealName, setMealName]     = useState("");
  const [mealCal, setMealCal]       = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs]   = useState("");
  const [mealFats, setMealFats]     = useState("");

  const today      = todayKey();
  const todayList  = useMemo(() => meals[today] || [], [meals, today]);
  const consumed   = useMemo(() => todayList.reduce((a,m) => a+m.cal, 0), [todayList]);
  const macros     = useMemo(() => todayList.reduce((a,m) => ({ protein:a.protein+(m.protein||0), carbs:a.carbs+(m.carbs||0), fats:a.fats+(m.fats||0) }), { protein:0, carbs:0, fats:0 }), [todayList]);

  const target     = j.weekTargets[currentWeek] || j.baseDailyTarget;
  const remaining  = target - consumed;
  const mTarget    = j.macros || { protein:0, carbs:0, fats:0 };
  const totalW     = j.totalWeeks + j.extensionWeeks;
  const latest     = state.checkins.length ? state.checkins[state.checkins.length-1].weight : j.startWeight;
  const mw         = j.milestoneWeights[currentWeek] || p.targetWeight;
  const todayDow   = (new Date().getDay()||7) - 1;
  const weekPct    = Math.min(100, Math.round(((new Date().getDay()||7)/7)*100));
  const doneH      = habits.filter(h => h.done).length;
  const totalTodos = todayList.length + habits.length;
  const doneTodos  = todayList.length + doneH;

  // Day adjustment banner
  const dow = new Date().getDay()||7;
  const daysLeft = 7 - dow;
  const diff = consumed - target;
  let banner = null;
  if (consumed > 0 && Math.abs(diff) >= 80 && daysLeft > 0) {
    const next = target - Math.round(diff / daysLeft);
    const minCal = p.gender === "male" ? 1200 : 1000;
    banner = next < minCal
      ? { type:"ext", msg:`You're ${Math.abs(diff)} kcal ${diff>0?"over":"under"} today. Gap can't be recovered safely — journey may extend.` }
      : { type:"adj", msg:`You're ${Math.abs(diff)} kcal ${diff>0?"over":"under"}. Aim for ${next} kcal/day for ${daysLeft} more day${daysLeft!==1?"s":""}.` };
  }

  // ── Meal estimation ──────────────────────────────────────────────────────────
  async function estimateMeal() {
    if (!mealDesc.trim()) return;
    setLoading(true); setResult(null);
    let data, usedAI = false;
    try {
      const text = await callClaude({
        system: 'You are a nutrition expert. Return ONLY valid JSON, no markdown. Format: {"items":[{"name":"food","qty":"amount","cal":number}],"total":number,"protein":number,"carbs":number,"fats":number}',
        userMessage: `Estimate calories and macros for: ${mealDesc}`,
        maxTokens: 500,
      });
      data = JSON.parse(text.replace(/```json|```/g,"").trim());
      usedAI = true;
    } catch {
      const local = estimateCaloriesLocally(mealDesc);
      const mp = Math.round(local.total * 0.25 / 4);
      const mc = Math.round(local.total * 0.45 / 4);
      const mf = Math.round(local.total * 0.30 / 9);
      data = { items: local.items, total: local.total, protein: mp, carbs: mc, fats: mf };
    }
    setResult({ ...data, usedAI });
    setMealCal(String(data.total));
    setMealProtein(String(data.protein || 0));
    setMealCarbs(String(data.carbs || 0));
    setMealFats(String(data.fats || 0));
    setMealName(mealDesc.slice(0, 40));
    setLoading(false);
  }

  function addMeal() {
    const cal = parseInt(mealCal);
    if (!cal || cal < 1) return;
    dispatch({ type:"ADD_MEAL", payload:{ date:today, meal:{
      name: mealName || "Meal",
      cal,
      protein: parseInt(mealProtein) || 0,
      carbs:   parseInt(mealCarbs)   || 0,
      fats:    parseInt(mealFats)    || 0,
    }}});
    closeModal();
  }

  function closeModal() {
    setShowModal(false); setMealDesc(""); setResult(null);
    setMealName(""); setMealCal(""); setMealProtein(""); setMealCarbs(""); setMealFats("");
  }

  return (
    <div className="page-content">
      {/* Hero */}
      <div className="hero" style={{ marginBottom:14 }}>
        <div className="hero-title">Fitness Journey</div>
        <div className="hero-sub">{({fat_loss:"Fat Loss",weight_gain:"Muscle Gain",maintenance:"Maintenance"})[p.goal]} · Week {currentWeek} of {totalW} · {Math.abs(latest-p.targetWeight).toFixed(1)} kg to goal</div>
        <div className="hero-stats">
          <div><div className="hero-stat-val" style={{color:"var(--accent)"}}>{target}</div><div className="hero-stat-label">Target kcal</div></div>
          <div><div className="hero-stat-val">{latest}</div><div className="hero-stat-label">Current kg</div></div>
          <div><div className="hero-stat-val" style={{color:"var(--accent3)"}}>{p.targetWeight}</div><div className="hero-stat-label">Target kg</div></div>
          <div><div className="hero-stat-val" style={{color:"var(--accent2)"}}>{state.checkins.length}</div><div className="hero-stat-label">Weeks done</div></div>
        </div>
      </div>

      {/* Calorie ring + Milestone */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:12, marginBottom:12 }}>
        <Card className="card-accent-green" style={{ marginBottom:0 }}>
          <SectionTitle>Calories today</SectionTitle>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <CalorieRing consumed={consumed} target={target} />
            <div style={{ flex:1 }}>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:2 }}>Consumed</div>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--accent)" }}>{consumed} kcal</div>
              </div>
              <div>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:2 }}>Remaining</div>
                <div style={{ fontSize:18, fontWeight:700, color:remaining<0?"var(--danger)":"var(--text)" }}>{Math.max(0,remaining)} kcal</div>
              </div>
              {banner && <div className={banner.type==="ext"?"banner-ext":"banner-adj"} style={{marginTop:8}}>{banner.msg}</div>}
            </div>
          </div>
        </Card>

        <Card className="card-accent-purple" style={{ marginBottom:0 }}>
          <SectionTitle>Milestone {currentWeek}</SectionTitle>
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
              <span style={{color:"var(--muted)"}}>Target: <strong style={{color:"var(--text)"}}>{mw} kg</strong></span>
              <span style={{fontWeight:700, color:"var(--accent3)"}}>{weekPct}%</span>
            </div>
            <ProgressBar pct={weekPct} />
          </div>
          <div style={{ fontSize:11, color:"var(--muted)", marginBottom:6 }}>Days this week</div>
          <div className="day-dots">
            {DAYS.map((d,i) => <div key={i} className={`day-dot ${i<todayDow?"done":i===todayDow?"today":""}`}>{d}</div>)}
          </div>
          <div className="divider" />
          <div style={{ fontSize:12, color:"var(--muted)" }}>
            {p.goal==="fat_loss"?"Lose":p.goal==="weight_gain"?"Gain":"Maintain"}{" "}
            <strong style={{color:"var(--accent)"}}>{p.intensity} kg</strong> this week · Week {currentWeek}/{totalW}
          </div>
        </Card>
      </div>

      {/* Macros */}
      <Card style={{ marginBottom:12 }}>
        <SectionTitle>Macros today</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Protein", val:macros.protein, target:mTarget.protein, color:"#ff6b6b" },
            { label:"Carbs",   val:macros.carbs,   target:mTarget.carbs,   color:"#ffd93d" },
            { label:"Fats",    val:macros.fats,    target:mTarget.fats,    color:"#6bcb77" },
          ].map(m => {
            const pct = Math.min(100, Math.round((m.val / (m.target||1)) * 100));
            return (
              <div key={m.label} style={{ background:"var(--bg)", borderRadius:10, padding:10, textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:700, color:m.color }}>{m.val}g</div>
                <div style={{ fontSize:10, color:"var(--muted)", marginBottom:4 }}>{m.label}</div>
                <div style={{ background:"var(--border)", borderRadius:99, height:4, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:m.color, borderRadius:99, transition:"width 0.4s" }} />
                </div>
                <div style={{ fontSize:9, color:"var(--muted)", marginTop:3 }}>{m.val}/{m.target}g</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Daily Todo */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <SectionTitle style={{marginBottom:0}}>
            Today's to-do{" "}
            <span style={{ color:"var(--accent)", textTransform:"none", letterSpacing:0, fontSize:11 }}>{doneTodos}/{totalTodos} done</span>
          </SectionTitle>
          <button onClick={() => setShowModal(true)}
            style={{ fontSize:12, padding:"6px 12px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", cursor:"pointer", fontFamily:"inherit", fontWeight:600, whiteSpace:"nowrap" }}>
            + Log meal
          </button>
        </div>

        {/* Meals section */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:8 }}>🥗 Meals</div>
          {todayList.length === 0 && (
            <div style={{ color:"var(--muted)", fontSize:13, padding:"8px 0" }}>No meals logged yet — tap + Log meal above</div>
          )}
          {todayList.map((m, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:"var(--surface2)", borderRadius:10, marginBottom:6, opacity:0.8 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:"var(--accent)", border:"2px solid var(--accent)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:8, height:5, borderLeft:"2.5px solid #0a0a0f", borderBottom:"2.5px solid #0a0a0f", transform:"rotate(-45deg) translateY(-1px)" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, textDecoration:"line-through", color:"var(--muted)" }}>{m.name}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{m.cal} kcal · P:{m.protein||0}g · C:{m.carbs||0}g · F:{m.fats||0}g</div>
              </div>
              <button onClick={() => dispatch({type:"REMOVE_MEAL", payload:{date:today, index:i}})}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:18, padding:"0 4px", lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>

        {/* Habits section */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:8 }}>💪 Habits</div>
          {habits.map(h => (
            <div key={h.id} className="habit-row" onClick={() => dispatch({type:"TOGGLE_HABIT", payload:h.id})}>
              <div className={`hcheck ${h.done?"on":""}`} />
              <div style={{ flex:1, fontSize:14, textDecoration:h.done?"line-through":"none", color:h.done?"var(--muted)":"var(--text)" }}>{h.label}</div>
              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600, background:"rgba(124,106,247,0.15)", color:"var(--accent3)", flexShrink:0 }}>Habit</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Meal Modal ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ background:"var(--surface)", borderRadius:"16px 16px 0 0", padding:20, width:"100%", maxWidth:560, maxHeight:"88vh", overflowY:"auto" }}>
            <div style={{ width:36, height:4, background:"var(--border)", borderRadius:2, margin:"0 auto 16px" }} />
            <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>Log a meal</div>

            <textarea className="form-textarea"
              placeholder="Describe what you ate — e.g. 'two boiled eggs and brown bread with butter'"
              value={mealDesc} onChange={e => setMealDesc(e.target.value)} rows={3}
            />
            <button className="btn-primary" onClick={estimateMeal} disabled={loading||!mealDesc.trim()}
              style={{ width:"100%", marginTop:10, padding:"10px 16px", borderRadius:8, border:"none", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:"linear-gradient(135deg,var(--accent),#00b87a)", color:"#0a0a0f", opacity:loading||!mealDesc.trim()?0.5:1 }}>
              {loading ? "Estimating…" : "Estimate with AI"}
            </button>

            {loading && (
              <div style={{ marginTop:12, padding:12, background:"var(--surface2)", borderRadius:8, fontSize:13, color:"var(--muted)", fontStyle:"italic", display:"flex", alignItems:"center", gap:8 }}>
                <span className="spinner" /> Analysing your meal…
              </div>
            )}

            {result && !loading && (
              <div style={{ marginTop:12 }}>
                <div style={{ background:"var(--surface2)", borderRadius:8, padding:12, marginBottom:10, fontSize:13 }}>
                  {result.items.map((it,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid var(--border)" }}>
                      <span style={{ textTransform:"capitalize" }}>{it.name}{it.qty&&it.qty!==1&&it.qty!=="1"?` (×${it.qty})`:""}</span>
                      <span>{it.cal} kcal</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, fontWeight:700, color:"var(--accent)" }}>
                    <span>Total {result.usedAI?"(AI)":"(estimated)"}</span>
                    <span>{result.total} kcal · P:{result.protein}g C:{result.carbs}g F:{result.fats}g</span>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <div className="form-group">
                    <label className="form-label">Meal name</label>
                    <input className="form-input" value={mealName} onChange={e=>setMealName(e.target.value)} placeholder="e.g. Breakfast" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Calories</label>
                    <input className="form-input" type="number" value={mealCal} onChange={e=>setMealCal(e.target.value)} placeholder="kcal" />
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{color:"#ff6b6b"}}>Protein (g)</label>
                    <input className="form-input" type="number" value={mealProtein} onChange={e=>setMealProtein(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{color:"#ffd93d"}}>Carbs (g)</label>
                    <input className="form-input" type="number" value={mealCarbs} onChange={e=>setMealCarbs(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{color:"#6bcb77"}}>Fats (g)</label>
                    <input className="form-input" type="number" value={mealFats} onChange={e=>setMealFats(e.target.value)} />
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={addMeal} style={{ flex:1, padding:"10px 16px", borderRadius:8, border:"none", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:"linear-gradient(135deg,var(--accent),#00b87a)", color:"#0a0a0f" }}>
                    Add to today
                  </button>
                  <button onClick={closeModal} style={{ padding:"10px 16px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!result && !loading && (
              <button onClick={closeModal} style={{ width:"100%", marginTop:10, padding:"10px 16px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
