import React, { createContext, useContext, useReducer, useEffect } from "react";

const JourneyContext = createContext(null);

const INITIAL = { profile:null, journey:null, habits:[], meals:{}, checkins:[], currentWeek:1 };

function reducer(state, action) {
  switch(action.type) {
    case "START_JOURNEY":
      return { ...INITIAL, ...action.payload };
    case "ADD_MEAL": {
      const { date, meal } = action.payload;
      return { ...state, meals:{ ...state.meals, [date]:[...(state.meals[date]||[]), meal] } };
    }
    case "REMOVE_MEAL": {
      const { date, index } = action.payload;
      const updated = [...(state.meals[date]||[])];
      updated.splice(index, 1);
      return { ...state, meals:{ ...state.meals, [date]:updated } };
    }
    case "TOGGLE_HABIT":
      return { ...state, habits:state.habits.map(h=>h.id===action.payload?{...h,done:!h.done}:h) };
    case "ADD_HABIT":
      return { ...state, habits:[...state.habits, action.payload] };
    case "REMOVE_HABIT":
      return { ...state, habits:state.habits.filter(h=>h.id!==action.payload) };
    case "COMPLETE_CHECKIN": {
      const { checkin, nextWeek, nextCalTarget, extensionAdded, newMilestoneWeights, newMacros } = action.payload;
      const newJourney = {
        ...state.journey,
        weekTargets:{ ...state.journey.weekTargets, [nextWeek]:nextCalTarget },
        milestoneWeights:{ ...state.journey.milestoneWeights, ...newMilestoneWeights },
        extensionWeeks:state.journey.extensionWeeks+(extensionAdded?1:0),
        macros: newMacros || state.journey.macros,
      };
      return { ...state, checkins:[...state.checkins, checkin], currentWeek:nextWeek, journey:newJourney };
    }
    case "RESET":
      return INITIAL;
    default:
      return state;
  }
}

const STORAGE_KEY = "fitness_journey_v2";

export function JourneyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL, init => {
    try { const s=localStorage.getItem(STORAGE_KEY); return s?JSON.parse(s):init; } catch { return init; }
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  return <JourneyContext.Provider value={{ state, dispatch }}>{children}</JourneyContext.Provider>;
}

export const useJourney = () => {
  const ctx = useContext(JourneyContext);
  if(!ctx) throw new Error("useJourney must be used within JourneyProvider");
  return ctx;
};
