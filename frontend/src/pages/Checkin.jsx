import React, { useState } from "react";
import { useJourney } from "../context/JourneyContext";
import { Card, SectionTitle, Badge, Button, Metric, AIBox } from "../components/UI";
import { callClaude } from "../utils/api";
import { calcCheckinTier, calcMacros, TIER_META, MIN_CALORIES } from "../utils/fitness";

export default function Checkin() {
  const { state, dispatch } = useJourney();
  const { journey:j, profile:p, checkins, currentWeek } = state;
  const [weight,  setWeight]  = useState("");
  const [energy,  setEnergy]  = useState(0);
  const [feeling, setFeeling] = useState("good");
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const totalW     = j.totalWeeks+j.extensionWeeks;
  const journeyStart = new Date(j.startDate);
  const todayDate2   = new Date(new Date().toISOString().slice(0,10));
  const elapsedDays  = Math.floor((todayDate2 - journeyStart) / (1000*60*60*24));
  const isCheckinDay = (elapsedDays % 7) + 1 === 7;
  const TIER_BADGE = {on_track:"green",ahead:"green",slightly_ahead:"green",slightly_behind:"amber",behind:"danger"};

  async function runCheckin() {
    const w=parseFloat(weight); if(!w||w<20||w>400){alert("Enter a valid weight");return;}
    setLoading(true);
    const prevW    = checkins.length?checkins[checkins.length-1].weight:j.startWeight;
    const actual   = parseFloat((prevW-w).toFixed(2));
    const mTarget  = p.goal==="fat_loss"?p.intensity:p.goal==="weight_gain"?-p.intensity:0;
    const tier     = calcCheckinTier(actual,mTarget,p.goal);
    const curTarget= j.weekTargets[currentWeek]||j.baseDailyTarget;
    const minCal   = MIN_CALORIES[p.gender];
    const ADJ      = {on_track:0,ahead:p.goal==="fat_loss"?150:-150,slightly_ahead:p.goal==="fat_loss"?75:-75,slightly_behind:p.goal==="fat_loss"?-75:75,behind:p.goal==="fat_loss"?-150:150};
    let calAdj     = p.goal==="maintenance"?0:(ADJ[tier]||0);
    if(energy<=2&&(feeling==="tired"||feeling==="hungry"))calAdj=Math.round(calAdj*0.5);
    const nextCal      = Math.max(minCal,curTarget+calAdj);
    const nextWeek     = currentWeek+1;
    const extAdded     = tier==="behind"&&actual-mTarget<-0.6;
    const newMW        = {};
    if(extAdded){const nl=j.totalWeeks+j.extensionWeeks+1;newMW[nl]=p.targetWeight;}
    j.weekTargets[nextWeek]=nextCal;
    const newMacros=calcMacros(nextCal,p.goal);
    const checkin={week:currentWeek,weight:w,actual,mTarget,tier,feeling,energy,note,calTarget:curTarget};
    let aiText="Keep going — consistency is what matters most!";
    try{
      aiText=await callClaude({system:"You are an adaptive fitness coach. Give warm, specific, data-driven coaching in 3–4 sentences. Factor in energy level and feeling.",userMessage:`Week ${currentWeek}. Goal: ${p.goal} at ${p.intensity}kg/week. Change: ${actual>=0?"-":"+"}${Math.abs(actual).toFixed(2)}kg (target: ${Math.abs(mTarget)}kg). Tier: ${tier}. Energy: ${energy}/5. Feeling: ${feeling}. Note: ${note||"none"}. New target: ${nextCal} kcal/day.`,maxTokens:300});
    }catch{}
    dispatch({type:"COMPLETE_CHECKIN",payload:{checkin,nextWeek,nextCalTarget:nextCal,extensionAdded:extAdded,newMilestoneWeights:newMW,newMacros}});
    setResult({tier,actual,mTarget,aiText,nextCal,nextMilestone:j.milestoneWeights[nextWeek]||p.targetWeight,extAdded});
    setLoading(false);
    setWeight("");setEnergy(0);setNote("");
    document.querySelectorAll(".star-btn").forEach(s=>{s.classList.remove("on");s.textContent="☆";});
  }

  return (
    <div className="page-content">
      {/* Locked state */}
      {!isCheckinDay&&!result&&(
        <div style={{padding:"20px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:14,marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:8}}>🔒</div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Check-in unlocks on Day 7</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>Come back on Sunday to evaluate Week {currentWeek} and unlock Milestone {currentWeek+1}</div>
          <div style={{marginTop:12,padding:"10px 14px",background:"rgba(0,229,160,0.07)",border:"1px solid rgba(0,229,160,0.2)",borderRadius:8,fontSize:12,color:"var(--accent)"}}>
            Today is Day {new Date().getDay()||7} of 7
          </div>
        </div>
      )}

      <Card className="card-accent-purple" style={{opacity:!isCheckinDay&&!result?0.5:1}}>
        <SectionTitle>Week {currentWeek} check-in</SectionTitle>
        <p style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>Log your progress — we'll evaluate your milestone and recalibrate next week's targets.</p>
        <div className="grid-2" style={{marginBottom:12}}>
          <div className="form-group">
            <label className="form-label">Current weight (kg)</label>
            <input className="form-input" type="number" step="0.1" placeholder="79.5" value={weight} onChange={e=>setWeight(e.target.value)} disabled={!isCheckinDay}/>
          </div>
          <div className="form-group">
            <label className="form-label">Energy level this week</label>
            <div className="stars">
              {[1,2,3,4,5].map(n=>(
                <button key={n} className={`star-btn ${energy>=n?"on":""}`} onClick={()=>isCheckinDay&&setEnergy(n)} disabled={!isCheckinDay}>
                  {energy>=n?"★":"☆"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="form-group" style={{marginBottom:12}}>
          <label className="form-label">How did you feel overall?</label>
          <select className="form-select" value={feeling} onChange={e=>setFeeling(e.target.value)} disabled={!isCheckinDay}>
            <option value="great">Great — on top of the world</option>
            <option value="good">Good — steady and focused</option>
            <option value="ok">Ok — manageable</option>
            <option value="tired">Tired / low energy</option>
            <option value="hungry">Very hungry / struggling</option>
          </select>
        </div>
        <div className="form-group" style={{marginBottom:14}}>
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-textarea" placeholder="e.g. Hit the gym 4 times, struggled with cravings on Friday…" value={note} onChange={e=>setNote(e.target.value)} style={{minHeight:52}} disabled={!isCheckinDay}/>
        </div>
        <Button variant="primary" fullWidth onClick={runCheckin} disabled={loading||!isCheckinDay}>
          {loading?"Analysing…":!isCheckinDay?"Available on Day 7":"Evaluate Week & Build Next Milestone"}
        </Button>
      </Card>

      {result&&(
        <Card>
          <SectionTitle>Week analysis</SectionTitle>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
            <Badge color={TIER_BADGE[result.tier]||"amber"}>{TIER_META[result.tier]?.label}</Badge>
            <span style={{fontSize:13,color:"var(--muted)"}}>
              {result.actual>=0?"Lost":"Gained"} {Math.abs(result.actual).toFixed(2)} kg · Target {Math.abs(result.mTarget).toFixed(2)} kg
            </span>
            {result.extAdded&&<Badge color="orange">Journey extended +1 week</Badge>}
          </div>
          <AIBox>{result.aiText}</AIBox>
          <div className="grid-2" style={{marginTop:14}}>
            <Metric label="Next week daily target" value={`${result.nextCal} kcal`}         color="green"/>
            <Metric label="Next milestone target"  value={`${result.nextMilestone} kg`} color="purple"/>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Check-in history</SectionTitle>
        {checkins.length===0?(
          <div style={{color:"var(--muted)",fontSize:14}}>No check-ins yet — complete week 1 first</div>
        ):checkins.map(c=>(
          <div key={c.week} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--border)",fontSize:13,gap:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,minWidth:55}}>Week {c.week}</span>
            <span style={{color:"var(--muted)"}}>{c.weight} kg actual</span>
            <span style={{color:"var(--muted)"}}>Energy {c.energy}/5</span>
            <Badge color={TIER_BADGE[c.tier]||"amber"}>{TIER_META[c.tier]?.label}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
