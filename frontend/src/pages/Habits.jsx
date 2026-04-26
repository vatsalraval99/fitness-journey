import React, { useState } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, Button, AIBox } from "../components/UI";
import { callClaude } from "../utils/api";

export default function Habits() {
  const { state, dispatch } = useJourney();
  const { habits, profile } = state;
  const [newHabit, setNewHabit] = useState("");
  const [aiText, setAiText]     = useState("");
  const [loading, setLoading]   = useState(false);

  function addHabit() {
    if (!newHabit.trim()) return;
    dispatch({ type:"ADD_HABIT", payload:{ id:Date.now(), label:newHabit.trim(), done:false } });
    setNewHabit("");
  }

  async function getSuggestions() {
    setLoading(true); setAiText("Getting suggestions…");
    try {
      const text = await callClaude({
        system: "You are a fitness coach. Suggest 5 specific, practical daily habits. Number them 1–5, one per line. Be concise.",
        userMessage: `Goal: ${profile.goal}, pace: ${profile.intensity}kg/week, age: ${profile.age}, gender: ${profile.gender}`,
        maxTokens: 300,
      });
      setAiText(text);
    } catch { setAiText("Could not reach AI — try again shortly."); }
    setLoading(false);
  }

  return (
    <div className="page-content">
      <Card className="card-accent-green">
        <SectionTitle>Daily habits</SectionTitle>
        {habits.map(h => (
          <div key={h.id} className="habit-row" onClick={()=>dispatch({type:"TOGGLE_HABIT",payload:h.id})}>
            <div className={`hcheck ${h.done?"on":""}`} />
            <div style={{flex:1,fontSize:14,textDecoration:h.done?"line-through":"none",color:h.done?"var(--muted)":"var(--text)"}}>
              {h.label}
            </div>
            <button
              onClick={e=>{e.stopPropagation();dispatch({type:"REMOVE_HABIT",payload:h.id});}}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"var(--muted)",padding:"0 4px",lineHeight:1}}
            >×</button>
          </div>
        ))}
        <div className="divider" />
        <div className="row">
          <input className="form-input" placeholder="Add a custom habit…" value={newHabit}
            onChange={e=>setNewHabit(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addHabit()}
            style={{flex:1}}
          />
          <Button onClick={addHabit}>Add</Button>
        </div>
      </Card>

      <Card className="card-accent-purple">
        <SectionTitle>AI habit suggestions</SectionTitle>
        <AIBox loading={loading}>
          {aiText || "Hit generate to get AI-curated habits based on your goal and intensity."}
        </AIBox>
        <Button variant="primary" onClick={getSuggestions} disabled={loading} style={{marginTop:12}}>
          {loading ? "Generating…" : "Generate Suggestions"}
        </Button>
      </Card>
    </div>
  );
}
