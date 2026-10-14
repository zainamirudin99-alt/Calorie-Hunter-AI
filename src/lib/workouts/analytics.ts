import { WorkoutLog } from "@/types/database";

export interface WorkoutTimeDataPoint {
  label: string; // e.g. "SEN", "W-1", "OKT"
  fullLabel: string; // e.g. "Senin, 12 Okt", "Minggu 41", "Oktober 2026"
  dateKey: string; // YYYY-MM-DD or YYYY-MM or YYYY-Www
  calories: number;
  duration_minutes: number;
  sessions: number;
}

export interface WorkoutAnalyticsSummary {
  daily: WorkoutTimeDataPoint[];
  weekly: WorkoutTimeDataPoint[];
  monthly: WorkoutTimeDataPoint[];
  stats: {
    total_kcal: number;
    total_duration_minutes: number;
    total_sessions: number;
    top_sport_name: string | null;
  };
}

const INDONESIAN_DAY_NAMES = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
const INDONESIAN_MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGS", "SEP", "OKT", "NOV", "DES"];
const INDONESIAN_FULL_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Aggregates user's workout logs into daily, weekly, and monthly analytics
 */
export function buildWorkoutAnalytics(workouts: Array<Partial<WorkoutLog>>, referenceDate: Date = new Date()): WorkoutAnalyticsSummary {
  const safeWorkouts = Array.isArray(workouts) ? workouts : [];

  // 1. Overall Stats
  let totalKcal = 0;
  let totalDuration = 0;
  const sportCounts: Record<string, { count: number; kcal: number }> = {};

  safeWorkouts.forEach((w) => {
    const kcal = Number(w.calories_burned) || 0;
    const dur = Number(w.duration_minutes) || 0;
    totalKcal += kcal;
    totalDuration += dur;

    const sName = w.sport_name || "Lainnya";
    if (!sportCounts[sName]) {
      sportCounts[sName] = { count: 0, kcal: 0 };
    }
    sportCounts[sName].count += 1;
    sportCounts[sName].kcal += kcal;
  });

  let topSportName: string | null = null;
  let maxCount = 0;
  Object.entries(sportCounts).forEach(([name, data]) => {
    if (data.count > maxCount) {
      maxCount = data.count;
      topSportName = name;
    }
  });

  // Map workouts by date string YYYY-MM-DD
  const workoutsByDate: Record<string, Partial<WorkoutLog>[]> = {};
  safeWorkouts.forEach((w) => {
    const dateStr = w.logged_date ? w.logged_date.split("T")[0] : (w.created_at ? w.created_at.split("T")[0] : "");
    if (!dateStr) return;
    if (!workoutsByDate[dateStr]) {
      workoutsByDate[dateStr] = [];
    }
    workoutsByDate[dateStr].push(w);
  });

  // 2. DAILY ANALYTICS: Last 7 Days (including today)
  const daily: WorkoutTimeDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - i);
    const dateKey = formatDateKey(d);
    const dayName = i === 0 ? "HARI INI" : INDONESIAN_DAY_NAMES[d.getDay()];
    const fullDate = `${d.getDate()} ${INDONESIAN_MONTH_NAMES[d.getMonth()]}`;

    const logs = workoutsByDate[dateKey] || [];
    const cal = logs.reduce((sum, item) => sum + (Number(item.calories_burned) || 0), 0);
    const dur = logs.reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0);

    daily.push({
      label: dayName,
      fullLabel: `${dayName} (${fullDate})`,
      dateKey,
      calories: cal,
      duration_minutes: dur,
      sessions: logs.length,
    });
  }

  // 3. WEEKLY ANALYTICS: Last 4 Weeks
  const weekly: WorkoutTimeDataPoint[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekEnd = new Date(referenceDate);
    weekEnd.setDate(referenceDate.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    let weekKcal = 0;
    let weekDur = 0;
    let weekSessions = 0;

    // Iterate through 7 days of this week
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dKey = formatDateKey(d);
      const logs = workoutsByDate[dKey] || [];
      weekKcal += logs.reduce((sum, item) => sum + (Number(item.calories_burned) || 0), 0);
      weekDur += logs.reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0);
      weekSessions += logs.length;
    }

    const weekLabel = w === 0 ? "MGG INI" : `W-${w}`;
    const fullWeekLabel = `${weekStart.getDate()} ${INDONESIAN_MONTH_NAMES[weekStart.getMonth()]} - ${weekEnd.getDate()} ${INDONESIAN_MONTH_NAMES[weekEnd.getMonth()]}`;

    weekly.push({
      label: weekLabel,
      fullLabel: fullWeekLabel,
      dateKey: `W${w}`,
      calories: weekKcal,
      duration_minutes: weekDur,
      sessions: weekSessions,
    });
  }

  // 4. MONTHLY ANALYTICS: Last 6 Months
  const monthly: WorkoutTimeDataPoint[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - m, 1);
    const year = d.getFullYear();
    const monthIdx = d.getMonth();
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

    let monthKcal = 0;
    let monthDur = 0;
    let monthSessions = 0;

    safeWorkouts.forEach((w) => {
      const dateStr = w.logged_date ? w.logged_date.split("T")[0] : (w.created_at ? w.created_at.split("T")[0] : "");
      if (dateStr && dateStr.startsWith(monthKey)) {
        monthKcal += Number(w.calories_burned) || 0;
        monthDur += Number(w.duration_minutes) || 0;
        monthSessions += 1;
      }
    });

    const mLabel = INDONESIAN_MONTH_NAMES[monthIdx];
    const fullMLabel = `${INDONESIAN_FULL_MONTHS[monthIdx]} ${year}`;

    monthly.push({
      label: mLabel,
      fullLabel: fullMLabel,
      dateKey: monthKey,
      calories: monthKcal,
      duration_minutes: monthDur,
      sessions: monthSessions,
    });
  }

  return {
    daily,
    weekly,
    monthly,
    stats: {
      total_kcal: totalKcal,
      total_duration_minutes: totalDuration,
      total_sessions: safeWorkouts.length,
      top_sport_name: topSportName,
    },
  };
}
