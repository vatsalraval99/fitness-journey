import React, { useState } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, Button, AIBox } from "../components/UI";
import { callClaude } from "../utils/api";

export default function Habits() {
  const { state, dispatch } = useJourney();
  const { habits, profile } = state;
  const [newHabit, setNewHabit] = useState("");
  const [aiText,   setAiText]   = useState("");
  const [loading,  setLoading]  = useState(false);

  const doneCount = habits.filter(h => h.done).length;
  const pct       = habits.length ? Math.round((doneCount/habits.length)*100) : 0;

  function addHabit() {
    if (!newHabit.trim()) return;
    dispatch({ type:"ADD_HABIT", payload:{ id:Date.now(), label:newHabit.trim(), done:false } });
    setNewHabit("");
  }

  async function getSuggestions() {
    setLoading(true); setAiText("Getting suggestions…");
    try {
      const text = await callClaude({
        system:"You are a fitness coach. Suggest 5 specific, practical daily habits. Number them 1–5, one per line. Be concise and actionable.",
        userMessage:`Goal: ${profile.goal}, pace: ${profile.intensity}kg/week, age: ${profile.age}, gender: ${profile.gender}`,
        maxTokens:300,
      });
      setAiText(text);
    } catch { setAiText("Could not reach AI — try again shortly."); }
    setLoading(false);
  }

  return (
    <div className="page-content">

      {/* Progress header */}
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:"2px solid var(--accent3)",borderRadius:16,padding:"20px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Daily habits</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:32,fontWeight:800,color:"var(--accent3)"}}>{doneCount}</span>
              <span style={{fontSize:16,color:"var(--muted)"}}>/ {habits.length} done today</span>
            </div>
          </div>
          <div style={{width:64,height:64,borderRadius:"50%",background:`conic-gradient(var(--accent3) ${pct*3.6}deg, var(--surface2) 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            <div style={{width:50,height:50,borderRadius:"50%",background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"var(--accent3)"}}>{pct}%</div>
          </div>
        </div>
        <div style={{background:"var(--surface2)",borderRadius:99,height:6,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,var(--accent3),var(--accent))",borderRadius:99,transition:"width 0.5s"}}/>
        </div>
      </div>

      {/* Habit list */}
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"20px",marginBottom:16}}>
        <SectionTitle>Your habits</SectionTitle>
        {habits.length === 0 && (
          <div style={{padding:"24px",textAlign:"center",color:"var(--muted)",fontSize:13}}>
            <div style={{fontSize:32,marginBottom:8}}>✨</div>
            No habits yet — add one below or use AI suggestions
          </div>
        )}
        {habits.map(h => (
          <div key={h.id}
            onClick={() => dispatch({type:"TOGGLE_HABIT", payload:h.id})}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:h.done?"rgba(0,229,160,0.05)":"var(--surface2)",borderRadius:12,marginBottom:8,cursor:"pointer",border:`1px solid ${h.done?"rgba(0,229,160,0.2)":"var(--border)"}`,transition:"all 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=h.done?"rgba(0,229,160,0.35)":"var(--accent3)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=h.done?"rgba(0,229,160,0.2)":"var(--border)"}>
            <div style={{width:26,height:26,borderRadius:"50%",border:`2px solid ${h.done?"var(--accent)":"var(--border)"}`,background:h.done?"var(--accent)":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
              {h.done&&<div style={{width:9,height:6,borderLeft:"2.5px solid #0a0a0f",borderBottom:"2.5px solid #0a0a0f",transform:"rotate(-45deg) translateY(-1px)"}}/>}
            </div>
            <div style={{flex:1,fontSize:14,fontWeight:500,textDecoration:h.done?"line-through":"none",color:h.done?"var(--muted)":"var(--text)",transition:"color 0.2s"}}>{h.label}</div>
            {h.done && <span style={{fontSize:11,color:"var(--accent)",fontWeight:700}}>✓ Done</span>}
            <button
              onClick={e=>{e.stopPropagation(); dispatch({type:"REMOVE_HABIT", payload:h.id});}}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"var(--muted)",padding:"0 4px",lineHeight:1,flexShrink:0}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>×</button>
          </div>
        ))}

        <div style={{height:1,background:"var(--border)",margin:"16px 0"}}/>
        <div style={{display:"flex",gap:10}}>
          <input className="form-input" placeholder="Add a custom habit…" value={newHabit}
            onChange={e=>setNewHabit(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addHabit()}
            style={{flex:1}}/>
          <Button onClick={addHabit}>Add</Button>
        </div>
      </div>

      {/* AI suggestions */}
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:"2px solid var(--accent3)",borderRadius:16,padding:"20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <SectionTitle style={{marginBottom:0}}>AI habit suggestions</SectionTitle>
          <Button variant="primary" onClick={getSuggestions} disabled={loading}>
            {loading?"Generating…":"✨ Generate"}
          </Button>
        </div>
        <AIBox loading={loading}>
          {aiText||"Hit generate to get AI-curated habits based on your goal and intensity."}
        </AIBox>
      </div>
    </div>
  );
}
