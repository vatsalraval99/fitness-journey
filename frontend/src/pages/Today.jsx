import React, { useState, useMemo } from "react";
import { useJourney } from "../context/JourneyContext";
import { CalorieRing, ProgressBar } from "../components/UI";
import { callClaude, estimateCaloriesLocally } from "../utils/api";
import { todayKey } from "../utils/fitness";

const DAY_LABELS = ["D1","D2","D3","D4","D5","D6","D7"];

export default function Today({ onCheckinDay, onGoCheckin }) {
  const { state, dispatch } = useJourney();
  const { journey:j, profile:p, habits, meals, currentWeek } = state;

  const [showModal, setShowModal]     = useState(false);
  const [mealDesc, setMealDesc]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [mealName, setMealName]       = useState("");
  const [mealCal, setMealCal]         = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs]     = useState("");
  const [mealFats, setMealFats]       = useState("");

  const today     = todayKey();
  const todayList = useMemo(() => meals[today]||[], [meals, today]);
  const consumed  = useMemo(() => todayList.reduce((a,m)=>a+m.cal,0), [todayList]);
  const macros    = useMemo(() => todayList.reduce((a,m)=>({
    protein: a.protein+(m.protein||0),
    carbs:   a.carbs+(m.carbs||0),
    fats:    a.fats+(m.fats||0),
  }), {protein:0,carbs:0,fats:0}), [todayList]);

  const target    = j.weekTargets[currentWeek]||j.baseDailyTarget;
  const remaining = target - consumed;
  const mTarget   = j.macros||{protein:0,carbs:0,fats:0};
  const totalW    = j.totalWeeks+j.extensionWeeks;
  const latest    = state.checkins.length ? state.checkins[state.checkins.length-1].weight : j.startWeight;
  const mw        = j.milestoneWeights[currentWeek]||p.targetWeight;
  const doneH     = habits.filter(h=>h.done).length;
  const totalTodos= todayList.length + habits.length;
  const doneTodos = todayList.length + doneH;

  // Journey-relative day
  const journeyStart     = new Date(j.startDate);
  const todayDate        = new Date(today);
  const elapsedDays      = Math.floor((todayDate - journeyStart) / (1000*60*60*24));
  const dayOfCurrentWeek = (elapsedDays % 7) + 1;
  const weekPct          = Math.min(100, Math.round((dayOfCurrentWeek/7)*100));
  const isCheckinUnlock  = dayOfCurrentWeek === 7;

  // Weight progress
  const weightLost    = parseFloat((j.startWeight - latest).toFixed(1));
  const weightToGoal  = parseFloat(Math.abs(latest - p.targetWeight).toFixed(1));
  const journeyPct    = Math.min(100, Math.round((Math.abs(j.startWeight-latest)/Math.abs(j.startWeight-p.targetWeight))*100))||0;

  // Adjustment banner
  const daysLeft = 7 - dayOfCurrentWeek;
  const diff = consumed - target;
  let banner = null;
  if(consumed>0 && Math.abs(diff)>=80 && daysLeft>0){
    const next = target - Math.round(diff/daysLeft);
    const minCal = p.gender==="male"?1200:1000;
    banner = next<minCal
      ? {type:"ext", msg:`Can't safely recover ${Math.abs(diff)} kcal — journey may extend slightly.`}
      : {type:"adj", msg:`${diff>0?"Over":"Under"} by ${Math.abs(diff)} kcal. Aim for ${next} kcal/day for ${daysLeft} more day${daysLeft!==1?"s":""}.`};
  }

  async function estimateMeal() {
    if(!mealDesc.trim()) return;
    setLoading(true); setResult(null);
    let data, usedAI=false;
    try {
      const text = await callClaude({
        system:'You are a nutrition expert. Return ONLY valid JSON, no markdown. Format: {"items":[{"name":"food","qty":"amount","cal":number}],"total":number,"protein":number,"carbs":number,"fats":number}',
        userMessage:`Estimate calories and macros for: ${mealDesc}`,
        maxTokens:500,
      });
      data=JSON.parse(text.replace(/```json|```/g,"").trim()); usedAI=true;
    } catch {
      const local=estimateCaloriesLocally(mealDesc);
      data={items:local.items,total:local.total,protein:Math.round(local.total*0.25/4),carbs:Math.round(local.total*0.45/4),fats:Math.round(local.total*0.30/9)};
    }
    setResult({...data,usedAI});
    setMealCal(String(data.total)); setMealProtein(String(data.protein||0));
    setMealCarbs(String(data.carbs||0)); setMealFats(String(data.fats||0));
    setMealName(mealDesc.slice(0,40)); setLoading(false);
  }

  function addMeal() {
    const cal=parseInt(mealCal); if(!cal||cal<1) return;
    dispatch({type:"ADD_MEAL", payload:{date:today, meal:{name:mealName||"Meal", cal, protein:parseInt(mealProtein)||0, carbs:parseInt(mealCarbs)||0, fats:parseInt(mealFats)||0}}});
    closeModal();
  }

  function closeModal() {
    setShowModal(false); setMealDesc(""); setResult(null);
    setMealName(""); setMealCal(""); setMealProtein(""); setMealCarbs(""); setMealFats("");
  }

  return (
    <div style={{paddingBottom:32}}>

      {/* ── MILESTONE STATS STRIP ── */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"14px 20px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>
            Week {currentWeek} Milestone · {p.goal==="fat_loss"?"Fat Loss":p.goal==="weight_gain"?"Muscle Gain":"Maintenance"}
          </div>
          <div style={{display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none"}}>
            {[
              {label:"BMI",       value:j.bmi,      sub:j.bmi<18.5?"Under":j.bmi<25?"Healthy":j.bmi<30?"Over":"Obese", color:j.bmi>=18.5&&j.bmi<25?"var(--accent)":"var(--warn)"},
              {label:"Body fat",  value:`${j.bf}%`,  sub:j.bf<15?"Athletic":j.bf<25?"Fit":j.bf<30?"Average":"High",     color:j.bf<25?"var(--accent)":"var(--warn)"},
              {label:"BMR",       value:j.bmr,       sub:"kcal / day",   color:"var(--text)"},
              {label:"Maintenance",value:j.tdee,     sub:"TDEE kcal",    color:"var(--accent3)"},
              {label:"Start weight",value:`${j.startWeight} kg`, sub:"journey start", color:"var(--muted)"},
              {label:"Current weight",value:`${latest} kg`,      sub:`${weightLost>=0?"-":"+"}${Math.abs(weightLost)} kg`,  color:"var(--accent)"},
              {label:"Goal weight",value:`${p.targetWeight} kg`, sub:`${weightToGoal} kg to go`, color:"var(--accent3)"},
            ].map((s,i)=>(
              <div key={i} style={{flexShrink:0,padding:"0 20px",borderRight:"1px solid var(--border)",lastChild:{borderRight:"none"}}}>
                <div style={{fontSize:18,fontWeight:800,color:s.color,lineHeight:1,marginBottom:3}}>{s.value}</div>
                <div style={{fontSize:10,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:1}}>{s.sub}</div>
              </div>
            ))}
          </div>
          {/* Weight journey progress bar */}
          <div style={{marginTop:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--muted)",marginBottom:4}}>
              <span>Weight journey progress</span>
              <span style={{color:"var(--accent)",fontWeight:700}}>{journeyPct}%</span>
            </div>
            <div style={{background:"var(--surface2)",borderRadius:99,height:5,overflow:"hidden"}}>
              <div style={{width:`${journeyPct}%`,height:"100%",background:"linear-gradient(90deg,var(--accent3),var(--accent))",borderRadius:99,transition:"width 0.5s"}}/>
            </div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"20px 20px 0"}}>

        {/* Check-in unlock banner */}
        {isCheckinUnlock && (
          <div onClick={onGoCheckin} style={{padding:"14px 18px",background:"rgba(0,229,160,0.08)",border:"1.5px solid rgba(0,229,160,0.25)",borderRadius:12,marginBottom:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(0,229,160,0.13)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(0,229,160,0.08)"}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>🎯 Week {currentWeek} check-in is ready!</div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>Log your weigh-in to unlock Milestone {currentWeek+1} and recalibrate your targets</div>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--accent)",whiteSpace:"nowrap",marginLeft:16,padding:"8px 14px",background:"rgba(0,229,160,0.15)",borderRadius:8}}>Check in →</div>
          </div>
        )}

        {/* ── CALORIE + MILESTONE ROW ── */}
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.4fr)",gap:16,marginBottom:20}}>

          {/* Calorie ring */}
          <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:"2px solid var(--accent)",borderRadius:16,padding:"20px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:16}}>Calories today</div>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <CalorieRing consumed={consumed} target={target}/>
              <div style={{flex:1}}>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Consumed</div>
                  <div style={{fontSize:26,fontWeight:800,color:"var(--accent)",lineHeight:1}}>{consumed}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>kcal</div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Remaining</div>
                  <div style={{fontSize:26,fontWeight:800,color:remaining<0?"var(--danger)":"var(--text)",lineHeight:1}}>{Math.max(0,remaining)}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>kcal</div>
                </div>
                <div style={{fontSize:11,color:"var(--muted)"}}>Target: <strong style={{color:"var(--text)"}}>{target} kcal</strong></div>
              </div>
            </div>
            {banner && (
              <div style={{marginTop:14,padding:"10px 12px",background:banner.type==="ext"?"rgba(255,77,109,0.1)":"rgba(255,179,71,0.1)",border:`1px solid ${banner.type==="ext"?"rgba(255,77,109,0.2)":"rgba(255,179,71,0.2)"}`,borderRadius:8,fontSize:12,color:banner.type==="ext"?"var(--danger)":"var(--warn)"}}>
                {banner.msg}
              </div>
            )}
          </div>

          {/* Milestone + macros */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Milestone week progress */}
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:"2px solid var(--accent3)",borderRadius:16,padding:"20px",flex:1}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px"}}>Milestone {currentWeek}</div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--accent3)",background:"rgba(124,106,247,0.12)",padding:"3px 10px",borderRadius:99}}>Day {dayOfCurrentWeek}/7</div>
              </div>
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontSize:22,fontWeight:800,color:"var(--accent3)",lineHeight:1}}>{mw} kg</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>target weight</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22,fontWeight:800,color:"var(--text)",lineHeight:1}}>{weekPct}%</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>week done</div>
                </div>
              </div>
              <ProgressBar pct={weekPct}/>
              <div style={{display:"flex",gap:4,marginTop:12}}>
                {DAY_LABELS.map((d,i)=>(
                  <div key={i} style={{flex:1,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,
                    background:i<dayOfCurrentWeek-1?"var(--accent)":i===dayOfCurrentWeek-1?"rgba(0,229,160,0.2)":"var(--surface2)",
                    color:i<dayOfCurrentWeek-1?"#0a0a0f":i===dayOfCurrentWeek-1?"var(--accent)":"var(--muted)",
                    border:i===dayOfCurrentWeek-1?"1.5px solid var(--accent)":"1px solid transparent",
                  }}>{d}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── MACROS ROW ── */}
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"20px",marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:16}}>Macros today</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
            {[
              {label:"Protein", val:macros.protein, target:mTarget.protein, color:"#ff6b6b", bg:"rgba(255,107,107,0.08)"},
              {label:"Carbs",   val:macros.carbs,   target:mTarget.carbs,   color:"#ffd93d", bg:"rgba(255,217,61,0.08)"},
              {label:"Fats",    val:macros.fats,    target:mTarget.fats,    color:"#6bcb77", bg:"rgba(107,203,119,0.08)"},
            ].map(m=>{
              const pct=Math.min(100,Math.round((m.val/(m.target||1))*100));
              return (
                <div key={m.label} style={{background:m.bg,borderRadius:12,padding:"16px",border:`1px solid ${m.color}22`}}>
                  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:24,fontWeight:800,color:m.color,lineHeight:1}}>{m.val}<span style={{fontSize:13,fontWeight:600}}>g</span></div>
                      <div style={{fontSize:10,color:"var(--muted)",marginTop:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{m.label}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:m.color}}>{pct}%</div>
                  </div>
                  <div style={{background:"rgba(0,0,0,0.2)",borderRadius:99,height:5,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:m.color,borderRadius:99,transition:"width 0.4s"}}/>
                  </div>
                  <div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>{m.val} / {m.target}g target</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DAILY TODO ── */}
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Today's to-do</div>
              <div style={{fontSize:13,color:"var(--muted)"}}>
                <span style={{fontSize:18,fontWeight:800,color:"var(--accent)"}}>{doneTodos}</span>
                <span style={{fontSize:13,color:"var(--muted)"}}> / {totalTodos} completed</span>
              </div>
            </div>
            <button onClick={()=>setShowModal(true)}
              style={{fontSize:13,padding:"10px 18px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent),#00b87a)",color:"#0a0a0f",cursor:"pointer",fontFamily:"inherit",fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16}}>+</span> Log meal
            </button>
          </div>

          {/* Meals */}
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{fontSize:16}}>🥗</div>
              <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.7px"}}>Meals</div>
              <div style={{flex:1,height:1,background:"var(--border)"}}/>
              <div style={{fontSize:11,color:"var(--muted)"}}>{consumed} / {target} kcal</div>
            </div>
            {todayList.length===0 ? (
              <div style={{padding:"20px",background:"var(--surface2)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:6}}>🍽️</div>
                <div style={{fontSize:13,color:"var(--muted)"}}>No meals logged yet</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Tap + Log meal to add your first meal</div>
              </div>
            ) : todayList.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",background:"var(--surface2)",borderRadius:12,marginBottom:8,border:"1px solid var(--border)"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:"var(--accent)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:8,height:5,borderLeft:"2.5px solid #0a0a0f",borderBottom:"2.5px solid #0a0a0f",transform:"rotate(-45deg) translateY(-1px)"}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,textDecoration:"line-through",color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>
                    <span style={{color:"var(--accent)",fontWeight:600}}>{m.cal} kcal</span>
                    <span style={{margin:"0 6px"}}>·</span>P:{m.protein||0}g
                    <span style={{margin:"0 6px"}}>·</span>C:{m.carbs||0}g
                    <span style={{margin:"0 6px"}}>·</span>F:{m.fats||0}g
                  </div>
                </div>
                <button onClick={()=>dispatch({type:"REMOVE_MEAL",payload:{date:today,index:i}})}
                  style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,padding:"0 4px",lineHeight:1,flexShrink:0}}
                  onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>×</button>
              </div>
            ))}
          </div>

          {/* Habits */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{fontSize:16}}>💪</div>
              <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.7px"}}>Habits</div>
              <div style={{flex:1,height:1,background:"var(--border)"}}/>
              <div style={{fontSize:11,color:"var(--muted)"}}>{doneH}/{habits.length} done</div>
            </div>
            {habits.map(h=>(
              <div key={h.id}
                onClick={()=>dispatch({type:"TOGGLE_HABIT",payload:h.id})}
                style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",background:h.done?"rgba(0,229,160,0.05)":"var(--surface2)",borderRadius:12,marginBottom:8,cursor:"pointer",border:`1px solid ${h.done?"rgba(0,229,160,0.2)":"var(--border)"}`,transition:"all 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=h.done?"rgba(0,229,160,0.3)":"var(--accent3)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=h.done?"rgba(0,229,160,0.2)":"var(--border)"}>
                <div style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${h.done?"var(--accent)":"var(--border)"}`,background:h.done?"var(--accent)":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                  {h.done&&<div style={{width:8,height:5,borderLeft:"2.5px solid #0a0a0f",borderBottom:"2.5px solid #0a0a0f",transform:"rotate(-45deg) translateY(-1px)"}}/>}
                </div>
                <div style={{flex:1,fontSize:14,fontWeight:500,textDecoration:h.done?"line-through":"none",color:h.done?"var(--muted)":"var(--text)",transition:"all 0.2s"}}>{h.label}</div>
                <span style={{fontSize:10,padding:"3px 9px",borderRadius:99,fontWeight:700,background:"rgba(124,106,247,0.12)",color:"var(--accent3)",flexShrink:0}}>Habit</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MEAL MODAL ── */}
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div style={{background:"var(--surface)",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{width:40,height:4,background:"var(--border)",borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{fontSize:18,fontWeight:700,marginBottom:16}}>Log a meal</div>
            <textarea className="form-textarea"
              placeholder="Describe what you ate — e.g. 'two boiled eggs and brown bread with butter'"
              value={mealDesc} onChange={e=>setMealDesc(e.target.value)} rows={3}
              style={{marginBottom:12}}/>
            <button onClick={estimateMeal} disabled={loading||!mealDesc.trim()}
              style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"none",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer",background:"linear-gradient(135deg,var(--accent),#00b87a)",color:"#0a0a0f",opacity:loading||!mealDesc.trim()?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading?<><span className="spinner"/>Estimating…</>:"✨ Estimate with AI"}
            </button>
            {loading&&(
              <div style={{marginTop:14,padding:14,background:"var(--surface2)",borderRadius:10,fontSize:13,color:"var(--muted)",fontStyle:"italic",display:"flex",alignItems:"center",gap:10}}>
                <span className="spinner"/> Analysing your meal…
              </div>
            )}
            {result&&!loading&&(
              <div style={{marginTop:14}}>
                <div style={{background:"var(--surface2)",borderRadius:10,padding:14,marginBottom:14,fontSize:13}}>
                  {result.items.map((it,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--border)"}}>
                      <span style={{textTransform:"capitalize"}}>{it.name}{it.qty&&it.qty!==1&&it.qty!=="1"?` (×${it.qty})`:""}</span>
                      <span style={{fontWeight:600}}>{it.cal} kcal</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,fontWeight:800,color:"var(--accent)",fontSize:14}}>
                    <span>Total {result.usedAI?"(AI)":"(estimated)"}</span>
                    <span>{result.total} kcal</span>
                  </div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:4,textAlign:"right"}}>P:{result.protein}g · C:{result.carbs}g · F:{result.fats}g</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div className="form-group"><label className="form-label">Meal name</label><input className="form-input" value={mealName} onChange={e=>setMealName(e.target.value)} placeholder="e.g. Breakfast"/></div>
                  <div className="form-group"><label className="form-label">Calories (kcal)</label><input className="form-input" type="number" value={mealCal} onChange={e=>setMealCal(e.target.value)}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                  <div className="form-group"><label className="form-label" style={{color:"#ff6b6b"}}>Protein (g)</label><input className="form-input" type="number" value={mealProtein} onChange={e=>setMealProtein(e.target.value)}/></div>
                  <div className="form-group"><label className="form-label" style={{color:"#ffd93d"}}>Carbs (g)</label><input className="form-input" type="number" value={mealCarbs} onChange={e=>setMealCarbs(e.target.value)}/></div>
                  <div className="form-group"><label className="form-label" style={{color:"#6bcb77"}}>Fats (g)</label><input className="form-input" type="number" value={mealFats} onChange={e=>setMealFats(e.target.value)}/></div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={addMeal} style={{flex:1,padding:"12px 16px",borderRadius:10,border:"none",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer",background:"linear-gradient(135deg,var(--accent),#00b87a)",color:"#0a0a0f"}}>
                    Add to today
                  </button>
                  <button onClick={closeModal} style={{padding:"12px 20px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!result&&!loading&&(
              <button onClick={closeModal} style={{width:"100%",marginTop:12,padding:"12px 16px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
