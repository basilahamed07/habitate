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
