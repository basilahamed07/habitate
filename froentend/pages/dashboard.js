import Head from "next/head";
import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import ChartCard from "../components/ChartCard";
import HabitTable from "../components/HabitTable";
import SiteHeader from "../components/SiteHeader";
import StatCard from "../components/StatCard";
import { deleteJson, getAuthToken, postJson, safeFetchJson } from "../lib/api";
import {
  dashboardStats,
  progressBars as fallbackProgress,
  dailyCounts as fallbackCounts,
  habitMatrix,
  days as fallbackDays
} from "../lib/mockData";
import styles from "../styles/Dashboard.module.css";

const LineChart = dynamic(() => import("../components/Charts").then((mod) => mod.LineChart), {
  ssr: false
});
const DoughnutChart = dynamic(
  () => import("../components/Charts").then((mod) => mod.DoughnutChart),
  { ssr: false }
);

const fallbackDashboard = {
  stats: dashboardStats,
  progressBars: fallbackProgress,
  dailyCounts: fallbackCounts,
  successRate: dashboardStats.successRate
};

const fallbackHabits = {
  habitMatrix,
  days: fallbackDays
};

export default function DashboardPage({ initialDashboard, initialHabits }) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [habitsData, setHabitsData] = useState(initialHabits);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const loaderRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const token = getAuthToken();
    if (!token) {
      router.push("/login");
      return () => {
        isMounted = false;
      };
    }

    const load = async () => {
      setIsLoading(true);
      const nextDashboard = await safeFetchJson("/dashboard", initialDashboard);
      const nextHabits = await safeFetchJson("/habits", initialHabits);
      const nextProfile = await safeFetchJson("/users/me", null);

      if (isMounted) {
        setDashboard(nextDashboard);
        setHabitsData(nextHabits);
        setUserProfile(nextProfile);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [initialDashboard, initialHabits, router]);

  useEffect(() => {
    if (!loaderRef.current) {
      return;
    }
    const ctx = gsap.context(() => {
      const selector = gsap.utils.selector(loaderRef);
      gsap.to(selector(`.${styles.loadingDot}`), {
        y: -6,
        opacity: 1,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        stagger: 0.15,
        ease: "power1.inOut"
      });
    }, loaderRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!loaderRef.current) {
      return;
    }
    if (isLoading) {
      setShowLoader(true);
      gsap.to(loaderRef.current, { autoAlpha: 1, duration: 0.4, ease: "power1.out" });
    } else {
      gsap.to(loaderRef.current, {
        autoAlpha: 0,
        duration: 0.4,
        ease: "power1.out",
        onComplete: () => setShowLoader(false)
      });
    }
  }, [isLoading]);

  const refreshDashboard = async () => {
    const nextDashboard = await safeFetchJson("/dashboard", dashboard);
    setDashboard(nextDashboard);
  };

  const handleToggle = async (habitId, dayIndex) => {
    if (habitId === undefined || habitId === null) {
      return;
    }
    const previous = habitsData;
    if (!previous?.habitMatrix) {
      return;
    }
    const updatedMatrix = previous.habitMatrix.map((habit) => {
      if (habit.id !== habitId) {
        return habit;
      }
      const nextDays = [...habit.days];
      nextDays[dayIndex] = !nextDays[dayIndex];
      return { ...habit, days: nextDays };
    });
    setHabitsData({ habitMatrix: updatedMatrix, days: previous.days });

    const result = await postJson(`/habits/${habitId}/toggle`, { dayIndex });
    if (result?.habitMatrix) {
      setHabitsData({
        habitMatrix: result.habitMatrix,
        days: previous.days || result.habitMatrix?.[0]?.days?.length || 0
      });
    } else {
      setHabitsData(previous);
    }
    await refreshDashboard();
  };

  const handleAddHabit = async () => {
    const trimmed = newHabit.trim();
    if (!trimmed || isSaving) {
      return;
    }
    setIsSaving(true);
    const result = await postJson("/habits", { name: trimmed });
    if (result?.habitMatrix) {
      setHabitsData({
        habitMatrix: result.habitMatrix,
        days: habitsData?.days || result.habitMatrix?.[0]?.days?.length || 0
      });
      setNewHabit("");
      setIsAdding(false);
      await refreshDashboard();
    }
    setIsSaving(false);
  };

  const handleDeleteHabit = async (habitId) => {
    if (!habitId) {
      return;
    }
    const previous = habitsData;
    if (!previous?.habitMatrix) {
      return;
    }
    const updated = previous.habitMatrix.filter((habit) => habit.id !== habitId);
    setHabitsData({ ...previous, habitMatrix: updated });
    const result = await deleteJson(`/habits/${habitId}`);
    if (!result?.status) {
      setHabitsData(previous);
      return;
    }
    await refreshDashboard();
  };

  const lineData = useMemo(() => {
    const counts = dashboard.dailyCounts || [];
    const labels = counts.map((_, index) => index + 1);

    return {
      labels,
      datasets: [
        {
          label: "Daily completions",
          data: counts,
          tension: 0.4,
          fill: true,
          borderColor: "rgba(122, 147, 111, 0.9)",
          pointRadius: 0,
          pointHoverRadius: 4,
          backgroundColor: (context) => {
            const { chart } = context;
            if (!chart) {
              return "rgba(183, 204, 175, 0.4)";
            }
            const gradient = chart.ctx.createLinearGradient(0, 0, 0, 240);
            gradient.addColorStop(0, "rgba(183, 204, 175, 0.6)");
            gradient.addColorStop(1, "rgba(248, 242, 234, 0.1)");
            return gradient;
          }
        }
      ]
    };
  }, [dashboard.dailyCounts]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#8a8278" }
      },
      y: {
        grid: { color: "rgba(210, 203, 192, 0.5)" },
        ticks: { color: "#8a8278" }
      }
    }
  };

  const successRate = dashboard.successRate || dashboard.stats.successRate;
  const successTrend = dashboard.stats.successTrend || "+0%";
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const avatarSrc = userProfile?.avatarUrl || "/avatars/user-01.svg";
  const remainder = Math.max(0, 100 - successRate);
  const onTrack = Math.round(remainder * 0.6);
  const needsFocus = remainder - onTrack;

  const doughnutData = {
    labels: ["Good", "On Track", "Needs Focus"],
    datasets: [
      {
        data: [successRate, onTrack, needsFocus],
        backgroundColor: ["#A9C1A2", "#D8C7B2", "#E8DED2"],
        borderWidth: 0
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    cutout: "65%"
  };

  const habitRows = habitsData?.habitMatrix || [];
  const habitDays =
    habitsData?.days || habitRows?.[0]?.days?.length || dashboard.dailyCounts?.length || 0;
  const habitSummary = useMemo(() => {
    return habitRows
      .map((row) => {
        const total = row.days?.filter(Boolean).length || 0;
        return { name: row.habit, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [habitRows]);
  const totalHabits = dashboard.stats.totalHabits || habitRows.length;
  const todayProgress =
    totalHabits > 0 ? Math.round((dashboard.stats.completedHabits / totalHabits) * 100) : 0;

  return (
    <main className={`page ${styles.dashboardPage}`}>
      <Head>
        <title>Habit Tracker | Dashboard</title>
        <meta name="description" content="Track habits with calming charts and progress." />
      </Head>

      {showLoader ? (
        <div
          className={styles.loadingOverlay}
          ref={loaderRef}
          aria-hidden={!isLoading}
          style={{ pointerEvents: isLoading ? "auto" : "none" }}
        >
          <div className={styles.loadingCard}>
            <span className={styles.loadingTitle}>Gathering your habits</span>
            <span className={styles.loadingSubtitle}>Breathing in progress.</span>
            <div className={styles.loadingDots}>
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.dashboardMain} aria-busy={isLoading}>
          <SiteHeader
            title="Daily Productivity"
            subtitle="A calm overview of habit momentum, with soft gradients and gentle progress cues."
            actions={
              <div className={styles.headerActions}>
                <button className={styles.dateButton} type="button">
                  {monthLabel}
                </button>
                <Link className={styles.profileLink} href="/profile" aria-label="Open user panel">
                  <Image
                    className={styles.avatar}
                    src={avatarSrc}
                    alt="User avatar"
                    width={40}
                    height={40}
                    unoptimized
                  />
                </Link>
              </div>
            }
          />

          <section className={styles.statsGrid}>
            <StatCard
              label="Success Rate"
              value={`${dashboard.stats.successRate}%`}
              detail={`Good ${successTrend}`}
            />
            <StatCard label="Streak" value={`${dashboard.stats.streakDays} Days`} detail="Consistency streak" />
            <StatCard
              label="Habits"
              value={`${dashboard.stats.completedHabits}/${dashboard.stats.totalHabits}`}
              detail="Completed today"
            />
            <StatCard label="Active Users" value={dashboard.stats.activeUsers} detail="This week" />
          </section>

          <section className={styles.chartsGrid}>
            <ChartCard title="Daily Productivity">
              <div className={styles.chartBody}>
                <LineChart data={lineData} options={lineOptions} />
              </div>
            </ChartCard>
            <div className={styles.chartStack}>
              <div className={styles.overviewCard}>
                <h3>All Habits Overview</h3>
                <div className={styles.overviewValue}>{successRate}%</div>
                <div className={styles.overviewTag}>
                  <span /> Good {successTrend}
                </div>
                <div style={{ height: 180, marginTop: 8 }}>
                  <DoughnutChart data={doughnutData} options={doughnutOptions} />
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: "#A9C1A2" }} />
                    Good {successRate}%
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: "#D8C7B2" }} />
                    On Track {onTrack}%
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: "#E8DED2" }} />
                    Needs Focus {needsFocus}%
                  </div>
                </div>
              </div>
              <div className={styles.summaryCard}>
                <h3>All Habits Overview</h3>
                <div className={styles.summaryList}>
                  {habitSummary.length > 0 ? (
                    habitSummary.map((item) => (
                      <div key={item.name} className={styles.summaryRow}>
                        <span>{item.name}</span>
                        <span className={styles.summaryMeta}>{item.total} days</span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.summaryEmpty}>No habits tracked yet.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.lowerGrid}>
            <div className={styles.tableBlock}>
              <div className={styles.tableHeader}>
                <h3>Habit Tracking</h3>
                {isAdding ? (
                  <div className={styles.addHabitForm}>
                    <input
                      className={styles.addInput}
                      placeholder="New habit name"
                      aria-label="New habit name"
                      value={newHabit}
                      onChange={(event) => setNewHabit(event.target.value)}
                    />
                    <div className={styles.addActions}>
                      <button
                        className={styles.addButton}
                        type="button"
                        onClick={handleAddHabit}
                        disabled={isSaving || !newHabit.trim()}
                      >
                        Save
                      </button>
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setNewHabit("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className={styles.addButton} type="button" onClick={() => setIsAdding(true)}>
                    + Add Habit
                  </button>
                )}
              </div>
              <HabitTable
                rows={habitRows}
                dayCount={habitDays}
                onToggle={handleToggle}
                onDelete={handleDeleteHabit}
              />
            </div>
            <aside className={styles.sidePanel}>
              <div className={styles.analysisCard}>
                <h3>Analysis</h3>
                <div className={styles.analysisList}>
                  <div className={styles.analysisRow}>
                    <span className={styles.analysisDot} style={{ background: "#A9C1A2" }} />
                    <div>
                      <strong>Good: {successRate}%</strong>
                      <span className={styles.analysisMeta}>{successTrend} since last week</span>
                    </div>
                  </div>
                  <div className={styles.analysisRow}>
                    <span className={styles.analysisDot} style={{ background: "#D8C7B2" }} />
                    <div>
                      <strong>On Track: {onTrack}%</strong>
                      <span className={styles.analysisMeta}>Maintaining consistency</span>
                    </div>
                  </div>
                  <div className={styles.analysisRow}>
                    <span className={styles.analysisDot} style={{ background: "#E8DED2" }} />
                    <div>
                      <strong>Progress: {todayProgress}%</strong>
                      <span className={styles.analysisMeta}>
                        {dashboard.stats.completedHabits}/{totalHabits} completed today
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.analysisHabits}>
                  {habitSummary.map((item) => (
                    <div key={item.name} className={styles.analysisHabitRow}>
                      <span>{item.name}</span>
                      <span>{item.total} days</span>
                    </div>
                  ))}
                </div>
                <div className={styles.analysisFoot}>
                  <span>Streak: {dashboard.stats.streakDays} Days</span>
                  <span>Active habits: {totalHabits}</span>
                </div>
              </div>
            </aside>
          </section>
      </div>


      <Image
        className={styles.botanical}
        src="/botanicals/leaf.svg"
        alt="Decorative botanical leaf"
        width={160}
        height={160}
      />
    </main>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      initialDashboard: fallbackDashboard,
      initialHabits: fallbackHabits
    }
  };
}
