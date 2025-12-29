export const days = 30;
export const habits = [
  "Morning Walk",
  "Read",
  "Drink Water",
  "Meditate",
  "Make Bed",
  "Save Money",
  "Eat Healthy",
  "No Sugar",
  "Exercise"
];

export const dashboardStats = {
  successRate: 82,
  successTrend: "+4%",
  streakDays: 12,
  completedHabits: 5,
  totalHabits: habits.length,
  activeUsers: 186,
  totalHabitsTracked: 54
};

export const progressBars = [
  { label: "Hydration", value: 78 },
  { label: "Movement", value: 64 },
  { label: "Mindfulness", value: 52 },
  { label: "Nutrition", value: 71 }
];

export const dailyCounts = Array.from({ length: days }, (_, index) => {
  const seed = (index * 7 + 4) % 20;
  return Math.max(2, 6 + seed - (index % 5));
});

export const habitMatrix = habits.map((habit, index) => {
  return {
    id: index + 1,
    habit,
    days: Array.from({ length: days }, (_, dayIndex) => {
      const seed = (index * 3 + dayIndex * 7) % 10;
      return seed > 4;
    })
  };
});

export const users = Array.from({ length: 28 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    name: `User${String(id).padStart(2, "0")}`,
    status: id % 4 === 0 ? "Paused" : "Active",
    habits: 3 + (id % 6),
    joined: `202${id % 3 + 2}-0${(id % 9) + 1}-1${id % 9}`,
    email: `user${String(id).padStart(2, "0")}@email.com`
  };
});

export const adminStats = {
  overallSuccessRate: dashboardStats.successRate,
  successTrend: dashboardStats.successTrend,
  totalHabits: dashboardStats.totalHabitsTracked,
  activeUsers: dashboardStats.activeUsers
};

export const sleepEntries = Array.from({ length: days }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1 - index));
  const hours = Math.max(3, 6 + ((index * 3) % 5));
  return {
    id: index + 1,
    date: date.toISOString().slice(0, 10),
    hours
  };
});

export const sleepDailyHours = sleepEntries.map((entry) => entry.hours);
export const sleepDayBuckets = sleepDailyHours.map((hours) => {
  if (hours < 3) return 0;
  if (hours < 5) return 1;
  if (hours < 7) return 2;
  if (hours < 9) return 3;
  return 4;
});

export const sleepCategories = [
  { index: 0, label: "0-3 hrs", minHours: 0, maxHours: 3, count: 0, percent: 0 },
  { index: 1, label: "3-5 hrs", minHours: 3, maxHours: 5, count: 0, percent: 0 },
  { index: 2, label: "5-7 hrs", minHours: 5, maxHours: 7, count: 0, percent: 0 },
  { index: 3, label: "7-9 hrs", minHours: 7, maxHours: 9, count: 0, percent: 0 },
  { index: 4, label: "9+ hrs", minHours: 9, maxHours: null, count: 0, percent: 0 }
];

export const sleepResponse = {
  entries: sleepEntries,
  dailyHours: sleepDailyHours,
  dayBuckets: sleepDayBuckets,
  categories: sleepCategories,
  averageHours: 6.8,
  totalEntries: days,
  bestSleep: 8.5,
  days
};

export const sleepReport = {
  averageHours: 6.6,
  totalEntries: 120,
  topSleepers: [
    { name: "User08", email: "user08@email.com", averageHours: 8.4, totalEntries: 20 },
    { name: "User12", email: "user12@email.com", averageHours: 7.9, totalEntries: 18 },
    { name: "User03", email: "user03@email.com", averageHours: 7.6, totalEntries: 19 }
  ]
};
