import React, { useState, useMemo } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, Button } from "../components/UI";
import { callClaude, estimateCaloriesLocally } from "../utils/api";
import { todayKey } from "../utils/fitness";

export default function Meals() {
  const { state, dispatch } = useJourney();
  const today  = todayKey();
  const meals  = useMemo(() => state.meals[today]||[], [state.meals, today]);
  const total  = useMemo(() => meals.reduce((a,m)=>a+m.cal,0), [meals]);

  const [desc, setDesc]       = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [mealName, setMealName] = useState("");
  const [mealCal, setMealCal]   = useState("");

  async function estimate() {
    if (!desc.trim()) return;
    setLoading(true); setResult(null);
    let items=[], total=0, usedAI=false;
    try {
      const text = await callClaude({
        system: 'You are a nutrition expert. Return ONLY a JSON object, no markdown. Format: {"items":[{"name":"food","qty":"amount","cal":number}],"total":number}',
        userMessage: `Estimate calories for: ${desc}`,
        maxTokens: 400,
      });
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      items=parsed.items||[]; total=parsed.total||0; usedAI=true;
    } catch {
      const local = estimateCaloriesLocally(desc);
      items=local.items; total=local.total;
    }
    setResult({ items, total, usedAI });
    setMealCal(String(total));
    setMealName(desc.slice(0,40));
    setLoading(false);
  }

  function addMeal() {
    const cal = parseInt(mealCal);
    if (!cal||cal<1) return;
    dispatch({ type:"ADD_MEAL", payload:{ date:today, meal:{ name:mealName||"Meal", cal } } });
    setDesc(""); setResult(null); setMealName(""); setMealCal("");
  }

  return (
    <div className="page-content">
      <Card className="card-accent-orange">
        <SectionTitle>Log a meal</SectionTitle>
        <textarea
          className="form-textarea"
          placeholder="Describe what you ate — e.g. 'two boiled eggs and brown bread with butter' or '1 cup oats with milk and banana'"
          value={desc} onChange={e=>setDesc(e.target.value)} rows={3}
        />
        <div style={{ marginTop:10 }}>
          <Button variant="primary" fullWidth onClick={estimate} disabled={loading||!desc.trim()}>
            {loading ? "Estimating…" : "Estimate Calories with AI"}
          </Button>
        </div>

        {loading && (
          <div style={{ marginTop:12, padding:14, background:"var(--surface2)", borderRadius:8, fontSize:13, color:"var(--muted)", fontStyle:"italic", display:"flex", alignItems:"center", gap:8 }}>
            <span className="spinner" /> Analysing your meal…
          </div>
        )}

        {result && !loading && (
          <div style={{ marginTop:12 }}>
            <div className="cal-breakdown">
              {result.items.map((it,i) => (
                <div key={i} className="cal-row">
                  <span style={{textTransform:"capitalize"}}>{it.name}{it.qty&&it.qty!=="1"?` (×${it.qty})`:""}</span>
                  <span>{it.cal} kcal</span>
                </div>
              ))}
              <div className="cal-row">
                <span>Total {result.usedAI?"(AI estimate)":"(local estimate)"}</span>
                <span>{result.total} kcal</span>
              </div>
            </div>
            <div className="row">
              <input className="form-input" placeholder="Meal name" value={mealName} onChange={e=>setMealName(e.target.value)} style={{flex:2}} />
              <input className="form-input" type="number" placeholder="kcal" value={mealCal} onChange={e=>setMealCal(e.target.value)} style={{flex:1,maxWidth:80}} />
              <Button variant="primary" onClick={addMeal}>Add</Button>
              <Button onClick={()=>{setResult(null);setDesc("");}}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Today's meals</SectionTitle>
        {meals.length===0 && <div style={{color:"var(--muted)",fontSize:14,padding:"6px 0"}}>No meals logged yet today</div>}
        {meals.map((m,i) => (
          <div key={i} className="meal-row">
            <div style={{fontWeight:600}}>{m.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontWeight:700,color:"var(--accent)"}}>{m.cal} kcal</span>
              <Button className="btn-danger" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>dispatch({type:"REMOVE_MEAL",payload:{date:today,index:i}})}>Remove</Button>
            </div>
          </div>
        ))}
        <div className="divider" />
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:15}}>
          <span>Total</span><span style={{color:"var(--accent)"}}>{total} kcal</span>
        </div>
      </Card>
    </div>
  );
}
