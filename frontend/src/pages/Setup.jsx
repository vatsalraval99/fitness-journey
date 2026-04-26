import React, { useState } from "react";
import { useJourney } from "../context/JourneyContext";
import { Button, Input, Select } from "../components/UI";
import { calcBMR, calcTDEE, calcBMI, calcBodyFat, dailyDelta, buildJourneyPlan, todayKey, MIN_CALORIES } from "../utils/fitness";

const ACTIVITY = [
  { value:"1.2",   label:"Sedentary — desk job, little exercise" },
  { value:"1.375", label:"Lightly active — 1–3 days/week" },
  { value:"1.55",  label:"Moderately active — 3–5 days/week" },
  { value:"1.725", label:"Very active — 6–7 days/week" },
  { value:"1.9",   label:"Extremely active — athlete or physical job" },
];
const INTENSITY = [
  { value:"0.25", label:"Gentle — 0.25 kg/week" },
  { value:"0.5",  label:"Moderate — 0.5 kg/week" },
  { value:"0.75", label:"Aggressive — 0.75 kg/week" },
  { value:"1.0",  label:"Max — 1 kg/week" },
];

function defaultHabits(goal) {
  const base = [{ id:1,label:"Drink 2.5L water",done:false },{ id:2,label:"7+ hours sleep",done:false },{ id:3,label:"Log all meals",done:false }];
  if (goal==="fat_loss")    return [...base,{id:4,label:"30 min cardio",done:false},{id:5,label:"Avoid ultra-processed food",done:false}];
  if (goal==="weight_gain") return [...base,{id:4,label:"Strength training session",done:false},{id:5,label:"Post-workout protein meal",done:false}];
  return [...base,{id:4,label:"30 min movement",done:false},{id:5,label:"Mindful eating",done:false}];
}

export default function Setup() {
  const { dispatch } = useJourney();
  const [step, setStep] = useState(1);
  const [errs, setErrs] = useState({});
  const [form, setForm] = useState({ age:"", gender:"male", height:"", weight:"", activity:"1.55", goal:"fat_loss", targetWeight:"", intensity:"0.5" });

  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrs(e=>({...e,[k]:""})); };

  const showPreview = form.goal!=="maintenance" && form.weight && form.targetWeight
    && ((form.goal==="fat_loss" && +form.targetWeight < +form.weight)
      || (form.goal==="weight_gain" && +form.targetWeight > +form.weight));
  const previewWeeks = showPreview ? Math.ceil(Math.abs(+form.weight - +form.targetWeight) / +form.intensity) : null;

  function goStep2() {
    const e={};
    if (!form.age||+form.age<15||+form.age>80) e.age="Valid age (15–80)";
    if (!form.height||+form.height<120||+form.height>250) e.height="Valid height (120–250 cm)";
    if (!form.weight||+form.weight<30||+form.weight>300) e.weight="Valid weight (30–300 kg)";
    if (Object.keys(e).length) { setErrs(e); return; }
    setStep(2);
  }

  function validateTarget(val) {
    if (!val) return "";
    const t=+val, w=+form.weight;
    if (form.goal==="fat_loss"&&t>=w) return `Must be less than your current weight (${w} kg)`;
    if (form.goal==="weight_gain"&&t<=w) return `Must be more than your current weight (${w} kg)`;
    if (Math.abs(t-w)<0.5) return "Target must differ by at least 0.5 kg";
    return "";
  }

  function handleBuild() {
    const e={};
    if (form.goal!=="maintenance") {
      const tErr = validateTarget(form.targetWeight);
      if (!form.targetWeight) e.targetWeight="Please enter your target weight";
      else if (tErr) e.targetWeight=tErr;
    }
    if (Object.keys(e).length) { setErrs(e); return; }
    const age=+form.age, gender=form.gender, height=+form.height, weight=+form.weight;
    const act=+form.activity, goal=form.goal, intensity=+form.intensity;
    const targetWeight = goal==="maintenance" ? weight : +form.targetWeight;
    const bmr=calcBMR(weight,height,age,gender), tdee=calcTDEE(bmr,act);
    const bmi=calcBMI(weight,height), bf=calcBodyFat(bmi,age,gender);
    const delta=dailyDelta(intensity), minCal=MIN_CALORIES[gender];
    const base = goal==="maintenance"?tdee:goal==="fat_loss"?Math.max(minCal,tdee-delta):tdee+delta;
    const { totalWeeks, weekTargets, milestoneWeights } = buildJourneyPlan({ weight, targetWeight, intensity, goal, baseDailyTarget:base });
    dispatch({ type:"START_JOURNEY", payload:{
      profile:{ age,gender,height,weight,act,goal,intensity,targetWeight },
      journey:{ bmr,tdee,bmi,bf,baseDailyTarget:base,totalWeeks,weekTargets,milestoneWeights,startWeight:weight,startDate:todayKey(),extensionWeeks:0 },
      habits:defaultHabits(goal), meals:{}, checkins:[], currentWeek:1,
    }});
  }

  return (
    <div className="page-content" style={{ maxWidth:540, margin:"0 auto" }}>
      <div className="card">
        <div className="setup-hero">
          <h2>Build Your Fitness Journey</h2>
          <p>Set your goal — we'll engineer a week-by-week plan and adapt it as you progress</p>
        </div>
        <div className="step-dots">
          {[1,2].map(i=><div key={i} className={`step-dot ${i<step?"done":i===step?"active":""}`}/>)}
        </div>

        {step===1 && (
          <>
            <div className="section-title">Body stats</div>
            <div className="grid-2" style={{marginBottom:12}}>
              <Input label="Age" type="number" placeholder="25" value={form.age} onChange={e=>set("age",e.target.value)} error={errs.age} />
              <Select label="Gender" value={form.gender} onChange={e=>set("gender",e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
              <Input label="Height (cm)" type="number" placeholder="175" value={form.height} onChange={e=>set("height",e.target.value)} error={errs.height} />
              <Input label="Current weight (kg)" type="number" placeholder="80" step="0.1" value={form.weight} onChange={e=>set("weight",e.target.value)} error={errs.weight} />
            </div>
            <Select label="Activity level" value={form.activity} onChange={e=>set("activity",e.target.value)} style={{marginBottom:14}}>
              {ACTIVITY.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Button variant="primary" fullWidth onClick={goStep2}>Continue →</Button>
          </>
        )}

        {step===2 && (
          <>
            <div className="section-title">Your goal</div>
            <div className="grid-2" style={{marginBottom:12}}>
              <Select label="Goal" value={form.goal} onChange={e=>{ set("goal",e.target.value); set("targetWeight",""); }}>
                <option value="fat_loss">Fat loss</option>
                <option value="weight_gain">Weight / muscle gain</option>
                <option value="maintenance">Maintenance</option>
              </Select>
              {form.goal!=="maintenance" && (
                <Input
                  label={form.goal==="fat_loss"?"Target weight — less than current (kg)":"Target weight — more than current (kg)"}
                  type="number" step="0.1"
                  placeholder={form.goal==="fat_loss"?"e.g. 72":"e.g. 85"}
                  value={form.targetWeight}
                  onChange={e=>set("targetWeight",e.target.value)}
                  onBlur={e=>{ const err=validateTarget(e.target.value); if(err) setErrs(es=>({...es,targetWeight:err})); }}
                  error={errs.targetWeight}
                />
              )}
            </div>
            {form.goal!=="maintenance" && (
              <Select label="Weekly milestone intensity" value={form.intensity} onChange={e=>set("intensity",e.target.value)} style={{marginBottom:14}}>
                {INTENSITY.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            )}
            {showPreview && (
              <div className="preview-box">
                <strong>{previewWeeks}-week journey</strong> &nbsp;·&nbsp;
                <strong>{Math.abs(+form.weight - +form.targetWeight).toFixed(1)} kg</strong> to go &nbsp;·&nbsp;
                <strong>{form.intensity} kg/week</strong> milestone &nbsp;·&nbsp;
                ~<strong>{dailyDelta(+form.intensity)} kcal</strong> {form.goal==="fat_loss"?"deficit":"surplus"}/day
              </div>
            )}
            {errs.targetWeight && <div className="form-error" style={{marginBottom:10}}>{errs.targetWeight}</div>}
            <div className="row">
              <Button onClick={()=>setStep(1)}>Back</Button>
              <Button variant="primary" style={{flex:1}} onClick={handleBuild}>Build My Journey</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
