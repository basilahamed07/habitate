import Head from "next/head";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ChartCard from "../components/ChartCard";
import SiteHeader from "../components/SiteHeader";
import { postJson, safeFetchJson } from "../lib/api";
import styles from "../styles/Sleep.module.css";

const BarChart = dynamic(() => import("../components/Charts").then((mod) => mod.BarChart), {
  ssr: false
});

const toIsoDate = (value) => value.toISOString().slice(0, 10);

const formatMonthKey = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const formatMonthLabel = (key) => {
  if (!key) {
    return "";
  }
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return key;
  }
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
};

const getMonthBounds = (key) => {
  if (!key) {
    return { startIso: "", endIso: "" };
  }
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) {
    return { startIso: "", endIso: "" };
  }
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { startIso: toIsoDate(start), endIso: toIsoDate(end) };
};

const fallbackMonth = formatMonthKey(new Date());
const emptySleep = {
  entries: [],
  dailyHours: [],
  dayBuckets: [],
  categories: [],
  averageHours: 0,
  totalEntries: 0,
  bestSleep: 0,
  days: 0,
  month: fallbackMonth,
  availableMonths: [fallbackMonth]
};

export default function SleepPage({ initialSleep }) {
  const router = useRouter();
  const currentMonthKey = useMemo(() => formatMonthKey(new Date()), []);
  const [sleepData, setSleepData] = useState(initialSleep);
  const [selectedMonth, setSelectedMonth] = useState(
    initialSleep?.month || currentMonthKey
  );
  const [availableMonths, setAvailableMonths] = useState(
    initialSleep?.availableMonths || [currentMonthKey]
  );
  const [sleepDate, setSleepDate] = useState(toIsoDate(new Date()));
  const [hours, setHours] = useState("7.0");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const isCurrentMonth = selectedMonth === currentMonthKey;
  const monthBounds = useMemo(() => getMonthBounds(selectedMonth), [selectedMonth]);
  const monthLabel = formatMonthLabel(selectedMonth || currentMonthKey);
  const [isPrintView, setIsPrintView] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.body.classList.add("sleep-print");
    return () => {
      document.body.classList.remove("sleep-print");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleBeforePrint = () => setIsPrintView(true);
    const handleAfterPrint = () => setIsPrintView(false);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    const mediaQuery = window.matchMedia?.("print");
    const handleMediaChange = (event) => setIsPrintView(event.matches);
    mediaQuery?.addEventListener?.("change", handleMediaChange);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      mediaQuery?.removeEventListener?.("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const monthQuery = selectedMonth ? `?month=${encodeURIComponent(selectedMonth)}` : "";
      const nextSleep = await safeFetchJson(`/sleep${monthQuery}`, initialSleep);
      const nextProfile = await safeFetchJson("/users/me", null);
      if (!isMounted) {
        return;
      }
      if (!nextProfile) {
        router.push("/login");
        return;
      }
      if (nextProfile.status === "pending_reset") {
        router.push("/profile?reset=1");
        return;
      }
      if (!nextSleep) {
        return;
      }
      setSleepData(nextSleep);
      const monthsFromApi = nextSleep?.availableMonths || [];
      const normalizedMonths = Array.from(
        new Set([currentMonthKey, ...monthsFromApi])
      );
      setAvailableMonths(normalizedMonths);
      if (nextSleep?.month && nextSleep.month !== selectedMonth) {
        setSelectedMonth(nextSleep.month);
      } else if (!normalizedMonths.includes(selectedMonth)) {
        setSelectedMonth(currentMonthKey);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [currentMonthKey, initialSleep, router, selectedMonth]);

  useEffect(() => {
    if (!selectedMonth) {
      return;
    }
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) {
      return;
    }
    const monthStart = new Date(year, month - 1, 1);
    if (selectedMonth === currentMonthKey) {
      setSleepDate(toIsoDate(new Date()));
    } else {
      setSleepDate(toIsoDate(monthStart));
    }
    setStatus("");
  }, [currentMonthKey, selectedMonth]);

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const handleDownloadPdf = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.print();
  };

  const handleLogSleep = async () => {
    if (!isCurrentMonth) {
      setStatus("Past months are read only.");
      return;
    }
    if (sleepDate && !sleepDate.startsWith(selectedMonth)) {
      setStatus("Select a date within this month.");
      return;
    }
    const trimmedHours = Number.parseFloat(hours);
    if (Number.isNaN(trimmedHours) || trimmedHours < 0 || trimmedHours > 24 || isSaving) {
      setStatus("Enter a valid number of hours (0-24).");
      return;
    }
    setIsSaving(true);
    setStatus("");
    const result = await postJson("/sleep", { date: sleepDate, hours: trimmedHours });
    if (result?.entries) {
      setSleepData(result);
      setStatus("Sleep logged.");
    } else {
      setStatus("Unable to save. Try again.");
    }
    setIsSaving(false);
  };

  const entries = sleepData?.entries || [];
  const monthDayCount = useMemo(() => {
    if (monthBounds.endIso) {
      const day = Number(monthBounds.endIso.split("-")[2]);
      if (Number.isFinite(day) && day > 0) {
        return day;
      }
    }
    return sleepData?.days || entries.length || 0;
  }, [monthBounds.endIso, sleepData?.days, entries]);
  const monthEntries = useMemo(() => {
    if (!selectedMonth) {
      return [];
    }
    const today = new Date();
    const todayDay = today.getDate();
    return entries.filter((entry) => {
      const dateValue = String(entry?.date || "");
      const [year, month, day] = dateValue.split("-");
      if (!year || !month || !day) {
        return false;
      }
      const entryMonth = `${year}-${month}`;
      if (entryMonth !== selectedMonth) {
        return false;
      }
      if (isCurrentMonth) {
        const dayNum = Number(day);
        return Number.isFinite(dayNum) && dayNum <= todayDay;
      }
      return true;
    });
  }, [entries, isCurrentMonth, selectedMonth]);
  const dailyHours = useMemo(() => {
    const totalDays = monthDayCount || 0;
    if (!totalDays) {
      return [];
    }
    const hours = Array.from({ length: totalDays }, () => null);
    monthEntries.forEach((entry) => {
      const dateValue = String(entry?.date || "");
      const day = Number(dateValue.split("-")[2]);
      if (!Number.isFinite(day) || day < 1 || day > totalDays) {
        return;
      }
      hours[day - 1] = entry.hours;
    });
    return hours;
  }, [monthDayCount, monthEntries]);
  const dayLabels = Array.from({ length: dailyHours.length }, (_, index) => index + 1);
  const normalizedDailyHours = useMemo(() => {
    if (!dailyHours.length) {
      return [];
    }
    if (!isCurrentMonth) {
      return dailyHours;
    }
    const today = new Date();
    const cutoff = today.getDate();
    return dailyHours.map((value, index) => (index + 1 <= cutoff ? value : null));
  }, [dailyHours, isCurrentMonth]);
  const loggedValues = monthEntries
    .map((entry) => entry?.hours)
    .filter((value) => typeof value === "number");
  const displayTotalEntries = loggedValues.length;
  const displayAverageHours = displayTotalEntries
    ? Number((loggedValues.reduce((sum, value) => sum + value, 0) / displayTotalEntries).toFixed(2))
    : 0;
  const displayBestSleep = displayTotalEntries
    ? Number(Math.max(...loggedValues).toFixed(2))
    : 0;

  const chartData = useMemo(() => {
    const rollingAverage = normalizedDailyHours.map((value, index) => {
      if (typeof value !== "number") {
        return null;
      }
      const start = Math.max(0, index - 6);
      const window = normalizedDailyHours
        .slice(start, index + 1)
        .filter((value) => typeof value === "number");
      if (!window.length) {
        return null;
      }
      const avg = window.reduce((sum, value) => sum + value, 0) / window.length;
      return Number(avg.toFixed(2));
    });
    return {
      labels: dayLabels,
      datasets: [
        {
          type: "bar",
          label: "Hours slept",
          data: normalizedDailyHours.map((value) => value ?? 0),
          borderRadius: 10,
          backgroundColor: (context) => {
            const { chart } = context;
            if (!chart) {
              return "rgba(163, 190, 213, 0.7)";
            }
            const gradient = chart.ctx.createLinearGradient(0, 0, 0, 240);
            gradient.addColorStop(0, "rgba(155, 190, 214, 0.8)");
            gradient.addColorStop(1, "rgba(235, 229, 220, 0.3)");
            return gradient;
          }
        },
        {
          type: "line",
          label: "7-day average",
          data: rollingAverage,
          borderColor: "rgba(118, 150, 190, 0.9)",
          backgroundColor: "rgba(118, 150, 190, 0.2)",
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2,
          spanGaps: true
        }
      ]
    };
  }, [dayLabels, normalizedDailyHours]);

  const chartOptions = useMemo(() => {
    const tickStep = isPrintView ? 1 : dayLabels.length > 14 ? 2 : 1;
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#8a8278",
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            font: { size: isPrintView ? 9 : 11 },
            padding: 6,
            callback: (value, index) => {
              if (tickStep === 1) {
                return dayLabels[index];
              }
              if (index === dayLabels.length - 1 || index % tickStep === 0) {
                return dayLabels[index];
              }
              return "";
            }
          }
        },
        y: {
          grid: { color: "rgba(210, 203, 192, 0.5)" },
          ticks: { color: "#8a8278" },
          suggestedMax: 10
        }
      }
    };
  }, [dayLabels, isPrintView]);

  return (
    <main className={`page ${styles.sleepPage}`}>
      <Head>
        <title>Habit Tracker | Sleep</title>
        <meta name="description" content="Track nightly sleep patterns with calm visuals." />
      </Head>

      <SiteHeader
        title="Sleep Tracking"
        subtitle="Log your rest, see patterns, and celebrate recovery."
        actions={
          <div className={styles.headerActions}>
            <Link className={styles.backLink} href="/dashboard">
              Back to Dashboard
            </Link>
            <div className={styles.monthPicker}>
              <select
                className={styles.monthSelect}
                aria-label="Select month"
                value={selectedMonth}
                onChange={handleMonthChange}
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
              {!isCurrentMonth ? (
                <span className={styles.readOnlyBadge}>Read-only</span>
              ) : null}
            </div>
            <button className={styles.downloadButton} type="button" onClick={handleDownloadPdf}>
              Download PDF
            </button>
          </div>
        }
      />

      <div className={styles.printHeader} aria-hidden="true">
        <div>
          <span className={styles.printKicker}>Sleep Report</span>
          <h2 className={styles.printTitle}>{monthLabel}</h2>
        </div>
        <span className={styles.printMeta}>Habitat Sleep Summary</span>
      </div>

      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <span>Average Sleep</span>
          <strong>{displayAverageHours} hrs</strong>
        </div>
        <div className={styles.statCard}>
          <span>Best Night</span>
          <strong>{displayBestSleep} hrs</strong>
        </div>
        <div className={styles.statCard}>
          <span>Logged Nights</span>
          <strong>{displayTotalEntries}</strong>
        </div>
      </section>

      <section className={styles.sleepLayout}>
        <div className={styles.sleepMain}>
          <ChartCard
            title="Sleep Duration (Combo)"
            footer={<span>Bars show nightly hours, line shows 7-day average.</span>}
            className={styles.sleepReportCard}
          >
            <div className={styles.chartBody}>
              <BarChart data={chartData} options={chartOptions} />
            </div>
          </ChartCard>

          <div className={styles.logCard}>
            <div className={styles.logHeader}>
              <h3>Log Sleep</h3>
              {!isCurrentMonth ? (
                <span className={styles.readOnlyNote}>Past months are view only.</span>
              ) : null}
            </div>
            <div className={styles.logForm}>
              <label className={styles.logField}>
                Date
                <div className={styles.dateField}>
                  <span className={styles.dateIcon} aria-hidden="true">
                    📅
                  </span>
                  <input
                    className={`${styles.input} ${styles.dateInput}`}
                    type="date"
                    value={sleepDate}
                    min={monthBounds.startIso}
                    max={isCurrentMonth ? toIsoDate(new Date()) : monthBounds.endIso}
                    onChange={(event) => setSleepDate(event.target.value)}
                    disabled={!isCurrentMonth}
                  />
                </div>
              </label>
              <label className={styles.logField}>
                Hours
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  disabled={!isCurrentMonth}
                />
              </label>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handleLogSleep}
                disabled={isSaving || !isCurrentMonth}
              >
                {isSaving ? "Saving..." : "Save Sleep"}
              </button>
            </div>
            {status ? <span className={styles.statusText}>{status}</span> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      initialSleep: emptySleep
    }
  };
}
