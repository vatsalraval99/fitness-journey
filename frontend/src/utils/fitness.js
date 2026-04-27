export const calcBMR = (weight, height, age, gender) =>
  gender === "male"
    ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
    : Math.round(10 * weight + 6.25 * height - 5 * age - 161);

export const calcTDEE = (bmr, activityMultiplier) =>
  Math.round(bmr * activityMultiplier);

export const calcBMI = (weight, height) =>
  parseFloat((weight / (height / 100) ** 2).toFixed(1));

export const calcBodyFat = (bmi, age, gender) =>
  Math.max(5, Math.round(
    gender === "male"
      ? 1.2 * bmi + 0.23 * age - 16.2
      : 1.2 * bmi + 0.23 * age - 5.4
  ));

export const dailyDelta = (intensity) =>
  Math.round((intensity * 7700) / 7);

export const calcMacros = (calories, goal) => {
  if (goal === "fat_loss") {
    return {
      protein: Math.round(calories * 0.35 / 4),
      carbs:   Math.round(calories * 0.35 / 4),
      fats:    Math.round(calories * 0.30 / 9),
    };
  }
  if (goal === "weight_gain") {
    return {
      protein: Math.round(calories * 0.30 / 4),
      carbs:   Math.round(calories * 0.45 / 4),
      fats:    Math.round(calories * 0.25 / 9),
    };
  }
  return {
    protein: Math.round(calories * 0.25 / 4),
    carbs:   Math.round(calories * 0.45 / 4),
    fats:    Math.round(calories * 0.30 / 9),
  };
};

export const bmiCategory = (bmi) => {
  if (bmi < 18.5) return { label: "Underweight", color: "warn" };
  if (bmi < 25)   return { label: "Healthy",     color: "green" };
  if (bmi < 30)   return { label: "Overweight",  color: "warn" };
  return               { label: "Obese",         color: "danger" };
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const MIN_CALORIES = { male: 1200, female: 1000 };

export function buildJourneyPlan({ weight, targetWeight, intensity, goal, baseDailyTarget }) {
  const totalKg    = Math.abs(weight - targetWeight);
  const totalWeeks = goal === "maintenance" ? 8 : Math.ceil(totalKg / intensity);
  const weekTargets = {};
  const milestoneWeights = {};

  for (let w = 1; w <= totalWeeks; w++) {
    weekTargets[w] = baseDailyTarget;
    milestoneWeights[w] =
      goal === "fat_loss"    ? parseFloat((weight - w * intensity).toFixed(2))
      : goal === "weight_gain" ? parseFloat((weight + w * intensity).toFixed(2))
      : weight;
  }

  return { totalWeeks, weekTargets, milestoneWeights };
}

export function calcCheckinTier(actual, milestoneTarget, goal) {
  if (goal === "maintenance") return "on_track";
  const diff = actual - milestoneTarget;
  if (Math.abs(diff) <= 0.1) return "on_track";
  if (diff <= -0.4) return "behind";
  if (diff < 0)    return "slightly_behind";
  if (diff >= 0.4) return "ahead";
  return "slightly_ahead";
}

export const TIER_META = {
  on_track:        { label: "On track",        color: "green"  },
  ahead:           { label: "Ahead",           color: "green"  },
  slightly_ahead:  { label: "Slightly ahead",  color: "green"  },
  slightly_behind: { label: "Slightly behind", color: "amber"  },
  behind:          { label: "Behind",          color: "danger" },
};
