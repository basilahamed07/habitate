import Head from "next/head";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ChartCard from "../components/ChartCard";
import SiteHeader from "../components/SiteHeader";
import { getAuthToken, postJson, safeFetchJson } from "../lib/api";
const emptySleep = {
  entries: [],
  dailyHours: [],
  dayBuckets: [],
  categories: [],
  averageHours: 0,
  totalEntries: 0,
  bestSleep: 0,
  days: 0
};
import styles from "../styles/Sleep.module.css";

const BarChart = dynamic(() => import("../components/Charts").then((mod) => mod.BarChart), {
  ssr: false
});

const toIsoDate = (value) => value.toISOString().slice(0, 10);

export default function SleepPage({ initialSleep }) {
  const router = useRouter();
  const [sleepData, setSleepData] = useState(initialSleep);
  const [sleepDate, setSleepDate] = useState(toIsoDate(new Date()));
  const [hours, setHours] = useState("7.0");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

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
      const nextSleep = await safeFetchJson("/sleep", initialSleep);
      if (!isMounted) {
        return;
      }
      setSleepData(nextSleep);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [initialSleep, router]);

  const handleLogSleep = async () => {
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

  const dailyHours = sleepData?.dailyHours || [];
  const dayCount = sleepData?.days || dailyHours.length || 0;
  const dayLabels = Array.from({ length: dayCount }, (_, index) => index + 1);

  const chartData = useMemo(() => {
    return {
      labels: dayLabels,
      datasets: [
        {
          label: "Hours slept",
          data: dailyHours.map((value) => value ?? 0),
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
        }
      ]
    };
  }, [dailyHours, dayLabels]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#8a8278" }
      },
      y: {
        grid: { color: "rgba(210, 203, 192, 0.5)" },
        ticks: { color: "#8a8278" },
        suggestedMax: 10
      }
    }
  };

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
            <button className={styles.dateButton} type="button">
              {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
            </button>
          </div>
        }
      />

      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <span>Average Sleep</span>
          <strong>{sleepData?.averageHours ?? 0} hrs</strong>
        </div>
        <div className={styles.statCard}>
          <span>Best Night</span>
          <strong>{sleepData?.bestSleep ?? 0} hrs</strong>
        </div>
        <div className={styles.statCard}>
          <span>Logged Nights</span>
          <strong>{sleepData?.totalEntries ?? 0}</strong>
        </div>
      </section>

      <section className={styles.sleepLayout}>
        <div className={styles.sleepMain}>
          <ChartCard title="Sleep Duration (Daily)">
            <div className={styles.chartBody}>
              <BarChart data={chartData} options={chartOptions} />
            </div>
          </ChartCard>

          <div className={styles.logCard}>
            <h3>Log Sleep</h3>
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
                    onChange={(event) => setSleepDate(event.target.value)}
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
                />
              </label>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handleLogSleep}
                disabled={isSaving}
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
