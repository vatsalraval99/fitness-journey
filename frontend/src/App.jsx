import React, { useState, useEffect } from "react";
import { JourneyProvider, useJourney } from "./context/JourneyContext";
import Setup    from "./pages/Setup";
import Today    from "./pages/Today";
import Journey  from "./pages/Journey";
import Habits   from "./pages/Habits";
import Checkin  from "./pages/Checkin";
import "./components/styles.css";

const NAV = [
  { id:"today",   label:"Today",    icon:"✅" },
  { id:"journey", label:"Journey",  icon:"🗺️" },
  { id:"habits",  label:"Habits",   icon:"💪" },
  { id:"checkin", label:"Check-in", icon:"📊" },
];

function Main() {
  const { state, dispatch } = useJourney();
  const [tab, setTab]       = useState("today");
  const [mobile, setMobile] = useState(window.innerWidth <= 640);
  const hasJourney = !!state.profile;

  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Is today Day 7 of the milestone week?
  const isCheckinDay = (new Date().getDay() || 7) === 7;

  function resetJourney() {
    if (window.confirm("Reset your journey? All data will be cleared.")) {
      dispatch({ type:"RESET" }); setTab("today");
    }
  }

  const pages = { today:<Today onCheckinDay={isCheckinDay} onGoCheckin={()=>setTab("checkin")}/>, journey:<Journey/>, habits:<Habits/>, checkin:<Checkin/> };

  if (!hasJourney) return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <div className="topbar"><div className="logo"><div className="logo-mark">FJ</div>Fitness Journey</div></div>
      <Setup/>
    </div>
  );

  if (mobile) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",paddingBottom:64}}>
      <div className="topbar">
        <div className="logo"><div className="logo-mark">FJ</div>Fitness Journey</div>
        <button onClick={resetJourney} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--danger)",fontFamily:"inherit"}}>Reset</button>
      </div>
      {pages[tab]}
      <nav style={{position:"fixed",bottom:0,left:0,right:0,height:64,background:"var(--surface)",borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100,padding:"0 4px"}}>
        {NAV.map(n=>(
          <div key={n.id} onClick={()=>setTab(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 8px",borderRadius:8,cursor:"pointer",flex:1,color:tab===n.id?"var(--accent)":"var(--muted)",transition:"color 0.15s"}}>
            <div style={{fontSize:20,lineHeight:1,position:"relative"}}>
              {n.icon}
              {n.id==="checkin"&&isCheckinDay&&<div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:"var(--accent)",border:"1.5px solid var(--bg)"}}/>}
            </div>
            <div style={{fontSize:9,fontWeight:600}}>{n.label}</div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg)"}}>
      <nav style={{width:220,background:"var(--surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",padding:"16px 12px",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",marginBottom:20}}>
          <div className="logo-mark">FJ</div>
          <div style={{fontSize:15,fontWeight:700,letterSpacing:"-0.3px"}}>Fitness Journey</div>
        </div>
        {NAV.map(n=>(
          <div key={n.id} onClick={()=>setTab(n.id)} className={`nav-item ${tab===n.id?"active":""}`}>
            <span style={{fontSize:16,width:20,textAlign:"center",flexShrink:0,position:"relative"}}>
              {n.icon}
              {n.id==="checkin"&&isCheckinDay&&<span style={{position:"absolute",top:-2,right:-4,width:7,height:7,borderRadius:"50%",background:"var(--accent)",display:"inline-block"}}/>}
            </span>
            {n.label}
            {n.id==="checkin"&&isCheckinDay&&<span style={{marginLeft:"auto",fontSize:10,background:"rgba(0,229,160,0.15)",color:"var(--accent)",padding:"2px 7px",borderRadius:99,fontWeight:700}}>Ready</span>}
          </div>
        ))}
        <div style={{marginTop:"auto",paddingTop:12,borderTop:"1px solid var(--border)"}}>
          <button onClick={resetJourney} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500,color:"var(--danger)",background:"none",border:"none",fontFamily:"inherit",width:"100%"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,77,109,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span>🔄</span> Reset Journey
          </button>
        </div>
      </nav>
      <div style={{flex:1,overflow:"auto"}}>{pages[tab]}</div>
    </div>
  );
}

export default function App() { return <JourneyProvider><Main/></JourneyProvider>; }
