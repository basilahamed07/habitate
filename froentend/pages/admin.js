import Head from "next/head";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import {
  clearAuthToken,
  getAuthToken,
  postJson,
  safeFetchJson,
  setAuthToken
} from "../lib/api";
import { adminStats, users as fallbackUsers } from "../lib/mockData";
import styles from "../styles/Admin.module.css";

const DoughnutChart = dynamic(
  () => import("../components/Charts").then((mod) => mod.DoughnutChart),
  { ssr: false }
);
const BarChart = dynamic(() => import("../components/Charts").then((mod) => mod.BarChart), {
  ssr: false
});

const fallbackAdmin = {
  users: fallbackUsers,
  total: fallbackUsers.length
};

export default function AdminPage({ initialUsers, initialStats }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [users, setUsers] = useState(initialUsers.users);
  const [stats, setStats] = useState(initialStats);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisUser, setAnalysisUser] = useState(null);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [analysisHabits, setAnalysisHabits] = useState([]);
  const [password, setPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const pageSize = 10;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let isMounted = true;

    const verify = async () => {
      const token = getAuthToken();
      if (!token) {
        if (isMounted) {
          setAuthChecked(true);
        }
        return;
      }
      const statsData = await safeFetchJson("/admin/stats", null);
      if (!isMounted) {
        return;
      }
      if (statsData) {
        setIsAuthed(true);
        setStats(statsData);
      } else {
        clearAuthToken();
        setIsAuthed(false);
      }
      setAuthChecked(true);
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [initialStats]);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    let isMounted = true;

    const load = async () => {
      const nextUsers = await safeFetchJson("/users", initialUsers);
      const nextStats = await safeFetchJson("/admin/stats", initialStats);

      if (isMounted) {
        setUsers(nextUsers.users);
        setStats(nextStats);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [initialUsers, initialStats, isAuthed]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const filteredUsers = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) {
      return users;
    }
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(lowered) ||
        user.email.toLowerCase().includes(lowered)
      );
    });
  }, [users, query]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageUsers = filteredUsers.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleAdminLogin = async () => {
    const email = adminEmail.trim();
    const passwordValue = adminPassword.trim();
    if (!email || !passwordValue || isAuthLoading) {
      setAuthError("Email and password are required.");
      return;
    }
    setAuthError("");
    setIsAuthLoading(true);
    const result = await postJson("/auth/login", {
      email,
      password: passwordValue
    });
    if (!result?.access_token) {
      setAuthError("Invalid credentials.");
      setIsAuthLoading(false);
      return;
    }
    setAuthToken(result.access_token);
    const statsData = await safeFetchJson("/admin/stats", null);
    if (!statsData) {
      clearAuthToken();
      setAuthError("Admin access required.");
      setIsAuthLoading(false);
      return;
    }
    setStats(statsData);
    setIsAuthed(true);
    setAuthChecked(true);
    setIsAuthLoading(false);
  };

  const handleCreateUser = async () => {
    const trimmedName = newUserName.trim();
    const trimmedEmail = newUserEmail.trim();
    if (!trimmedName || !trimmedEmail || isCreating) {
      return;
    }
    setIsCreating(true);
    const result = await postJson("/users", { name: trimmedName, email: trimmedEmail });
    if (result?.users) {
      setUsers(result.users);
      setNewUserName("");
      setNewUserEmail("");
      setAddModalOpen(false);
    }
    setIsCreating(false);
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditStatus(user.status);
    setPassword("");
    setPasswordStatus("");
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editUser) {
      return;
    }
    const result = await postJson(`/users/${editUser.id}`, {
      name: editName,
      email: editEmail,
      status: editStatus
    });
    if (result?.users) {
      setUsers(result.users);
    }
    setEditModalOpen(false);
  };

  const openAnalysis = async (user) => {
    setAnalysisUser(user);
    setAnalysisOpen(true);
    setPassword("");
    setPasswordStatus("");
    setAnalysisStats(null);
    setAnalysisHabits([]);
    const queryKey = `?userId=${encodeURIComponent(String(user.id))}`;
    const dashboard = await safeFetchJson(`/dashboard${queryKey}`, null);
    const habits = await safeFetchJson(`/habits${queryKey}`, null);
    if (dashboard) {
      setAnalysisStats(dashboard.stats);
    }
    if (habits?.habitMatrix) {
      const summary = habits.habitMatrix
        .map((row) => ({
          name: row.habit,
          total: row.days?.filter(Boolean).length || 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 4);
      setAnalysisHabits(summary);
    }
  };

  const handlePasswordChange = async () => {
    if (!editUser) {
      return;
    }
    const trimmed = password.trim();
    if (!trimmed) {
      setPasswordStatus("Password is required.");
      return;
    }
    const result = await postJson(`/users/${editUser.id}/password`, { password: trimmed });
    if (result?.status === "ok") {
      setPassword("");
      setPasswordStatus("Password updated.");
    } else {
      setPasswordStatus("Unable to update password.");
    }
  };

  const openReport = async () => {
    const report = await safeFetchJson("/admin/report", null);
    if (report) {
      setReportData(report);
      setReportOpen(true);
    }
  };

  const analysisRate = analysisStats?.successRate ?? 0;
  const analysisRemainder = Math.max(0, 100 - analysisRate);
  const analysisOnTrack = Math.round(analysisRemainder * 0.6);
  const analysisNeedsFocus = analysisRemainder - analysisOnTrack;
  const analysisChartData = {
    labels: ["Good", "On Track", "Needs Focus"],
    datasets: [
      {
        data: [analysisRate, analysisOnTrack, analysisNeedsFocus],
        backgroundColor: ["#A9C1A2", "#D8C7B2", "#E8DED2"],
        borderWidth: 0
      }
    ]
  };

  const analysisChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    cutout: "65%"
  };

  const reportCompleted = reportData?.totalCompleted ?? 0;
  const reportRemaining = Math.max(0, (reportData?.totalSlots ?? 0) - reportCompleted);
  const reportTopHabits = reportData?.topHabits || [];
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const reportTopChartData = {
    labels: reportTopHabits.map((habit) => habit.name),
    datasets: [
      {
        label: "Completions",
        data: reportTopHabits.map((habit) => habit.total),
        borderRadius: 10,
        backgroundColor: (context) => {
          const { chart } = context;
          if (!chart) {
            return "rgba(183, 204, 175, 0.8)";
          }
          const gradient = chart.ctx.createLinearGradient(0, 0, 240, 0);
          gradient.addColorStop(0, "rgba(183, 204, 175, 0.6)");
          gradient.addColorStop(1, "rgba(143, 165, 132, 0.6)");
          return gradient;
        }
      }
    ]
  };
  const reportTopChartOptions = {
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
        grid: { color: "rgba(210, 203, 192, 0.4)" },
        ticks: { color: "#8a8278" }
      }
    }
  };
  const reportChartData = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [reportCompleted, reportRemaining],
        backgroundColor: ["#A9C1A2", "#E8DED2"],
        borderWidth: 0
      }
    ]
  };

  const reportChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    cutout: "65%"
  };

  if (!authChecked || !isAuthed) {
    return (
      <main className="page">
        <Head>
          <title>Habit Tracker | Admin Login</title>
          <meta name="description" content="Admin login for habit tracker." />
        </Head>
        <SiteHeader
          title="Admin Login"
          subtitle="Enter your credentials to manage users."
          actions={null}
        />
        <section className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <h3>Welcome back</h3>
            <p>Secure access for admin management.</p>
          </div>
          <form className={styles.loginForm}>
            <input
              className={styles.loginInput}
              placeholder="Email"
              aria-label="Email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
            />
            <input
              className={styles.loginInput}
              placeholder="Password"
              aria-label="Password"
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
            {authError ? <span className={styles.loginError}>{authError}</span> : null}
            <button
              className={styles.loginButton}
              type="button"
              onClick={handleAdminLogin}
              disabled={isAuthLoading}
            >
              {isAuthLoading ? "Checking..." : "Log In"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <Head>
        <title>Habit Tracker | Admin</title>
        <meta name="description" content="Manage users and habits with calm clarity." />
      </Head>

      <SiteHeader
        title="Admin"
        subtitle="Review user progress, manage habits, and keep the community flowing calmly."
        actions={
          <div className={styles.headerActions}>
            <button className={styles.dateButton} type="button">
              {monthLabel}
            </button>
            <Image
              className={styles.avatar}
              src="/avatars/user-01.svg"
              alt="Admin avatar"
              width={40}
              height={40}
            />
          </div>
        }
      />

      <section className={styles.adminGrid}>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.searchBar}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" stroke="#8A8278" strokeWidth="1.5" />
                <path d="M20 20L17 17" stroke="#8A8278" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                className={styles.searchInput}
                placeholder="Search users"
                aria-label="Search users"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button
              className={styles.addButton}
              type="button"
              onClick={() => {
                setNewUserName("");
                setNewUserEmail("");
                setAddModalOpen(true);
              }}
            >
              + Add User
            </button>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Habits</th>
                <th>Joined</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((user) => (
                <tr key={user.id} onClick={() => openAnalysis(user)}>
                  <td>{user.name}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        user.status === "Paused" ? styles.badgePaused : ""
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>{user.habits}</td>
                  <td>{user.joined}</td>
                  <td>{user.email}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.actionButton}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(user);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.actionButton}
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <div>
              Showing {pageStart + 1}-{pageStart + pageUsers.length} of {filteredUsers.length}
            </div>
            <div className={styles.pageButtons}>
              <button
                className={styles.pageButton}
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .slice(0, 4)
                .map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`${styles.pageButton} ${
                      pageNumber === page ? styles.pageButtonActive : ""
                    }`}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              <button
                className={styles.pageButton}
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className={styles.statsPanel}>
          <div className={styles.reportCard}>
            <h3 className={styles.statTitle}>Community Report</h3>
            <p>Totals across all users in one calm view.</p>
            <button className={styles.primaryButton} type="button" onClick={openReport}>
              View Report
            </button>
          </div>
          <div className={styles.statsCard}>
            <h3 className={styles.statTitle}>Overall Success Rate</h3>
            <div className={styles.statValue}>{stats.overallSuccessRate}%</div>
            <p>Good {stats.successTrend || "+0%"} since last week</p>
          </div>
          <div className={styles.statsCard}>
            <h3 className={styles.statTitle}>Total Habits</h3>
            <div className={styles.statValue}>{stats.totalHabits}</div>
            <p>Tracked across the community</p>
          </div>
          <div className={styles.statsCard}>
            <h3 className={styles.statTitle}>Active Users</h3>
            <div className={styles.statValue}>{stats.activeUsers}</div>
            <p>Active in the last 7 days</p>
          </div>
        </aside>
      </section>

      <Image
        className={styles.botanical}
        src="/botanicals/leaf.svg"
        alt="Decorative botanical leaf"
        width={160}
        height={160}
      />

      {analysisOpen && analysisUser ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <button
            className={styles.modalBackdrop}
            type="button"
            onClick={() => setAnalysisOpen(false)}
            aria-label="Close analysis"
          />
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.userRow}>
                <Image src="/avatars/user-01.svg" alt="Selected user" width={56} height={56} />
                <div className={styles.userMeta}>
                  <strong>{analysisUser.name}</strong>
                  <span>{analysisUser.email}</span>
                </div>
              </div>
              <button
                className={styles.modalClose}
                type="button"
                onClick={() => setAnalysisOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalStats}>
                <div>
                  <span className={styles.modalLabel}>Success Rate</span>
                  <strong>{analysisStats?.successRate ?? "--"}%</strong>
                </div>
                <div>
                  <span className={styles.modalLabel}>Streak</span>
                  <strong>{analysisStats?.streakDays ?? "--"} Days</strong>
                </div>
                <div>
                  <span className={styles.modalLabel}>Today</span>
                  <strong>
                    {analysisStats
                      ? `${analysisStats.completedHabits}/${analysisStats.totalHabits}`
                      : "--"}
                  </strong>
                </div>
              </div>
              <div className={styles.modalSection}>
                <h4>Habit Progress</h4>
                <div className={styles.modalChartRow}>
                  <div className={styles.modalChart}>
                    <DoughnutChart data={analysisChartData} options={analysisChartOptions} />
                  </div>
                  <div className={styles.modalLegend}>
                    <div className={styles.modalLegendItem}>
                      <span className={styles.modalLegendSwatch} style={{ background: "#A9C1A2" }} />
                      Good {analysisRate}%
                    </div>
                    <div className={styles.modalLegendItem}>
                      <span className={styles.modalLegendSwatch} style={{ background: "#D8C7B2" }} />
                      On Track {analysisOnTrack}%
                    </div>
                    <div className={styles.modalLegendItem}>
                      <span className={styles.modalLegendSwatch} style={{ background: "#E8DED2" }} />
                      Needs Focus {analysisNeedsFocus}%
                    </div>
                  </div>
                </div>
                <div className={styles.modalList}>
                  {analysisHabits.length > 0 ? (
                    analysisHabits.map((item) => (
                      <div key={item.name} className={styles.modalRow}>
                        <span>{item.name}</span>
                        <span>{item.total} days</span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.modalEmpty}>No habit data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {addModalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <button
            className={styles.modalBackdrop}
            type="button"
            onClick={() => {
              setAddModalOpen(false);
              setNewUserName("");
              setNewUserEmail("");
            }}
            aria-label="Close add user"
          />
          <div className={styles.modalCard}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Add User</h3>
              <button
                className={styles.modalClose}
                type="button"
                onClick={() => {
                setAddModalOpen(false);
                setNewUserName("");
                setNewUserEmail("");
              }}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalForm}>
                <label className={styles.modalField}>
                  Full name
                  <input
                    className={styles.modalInput}
                    placeholder="Full name"
                    aria-label="Full name"
                    value={newUserName}
                    onChange={(event) => setNewUserName(event.target.value)}
                  />
                </label>
                <label className={styles.modalField}>
                  Email address
                  <input
                    className={styles.modalInput}
                    placeholder="Email address"
                    aria-label="Email address"
                    value={newUserEmail}
                    onChange={(event) => setNewUserEmail(event.target.value)}
                  />
                </label>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={handleCreateUser}
                  disabled={isCreating || !newUserName.trim() || !newUserEmail.trim()}
                >
                  Save User
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editModalOpen && editUser ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <button
            className={styles.modalBackdrop}
            type="button"
            onClick={() => setEditModalOpen(false)}
            aria-label="Close edit user"
          />
          <div className={styles.modalCard}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Edit User</h3>
              <button className={styles.modalClose} type="button" onClick={() => setEditModalOpen(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalForm}>
                <label className={styles.modalField}>
                  Full name
                  <input
                    className={styles.modalInput}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                </label>
                <label className={styles.modalField}>
                  Email address
                  <input
                    className={styles.modalInput}
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                  />
                </label>
                <label className={styles.modalField}>
                  Status
                  <select
                    className={styles.modalSelect}
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                  </select>
                </label>
              </div>
              <div className={styles.modalSection}>
                <h4>Change Password</h4>
                <div className={styles.passwordForm}>
                  <input
                    className={styles.passwordInput}
                    placeholder="New password"
                    type="password"
                    aria-label="New password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button className={styles.primaryButton} type="button" onClick={handlePasswordChange}>
                    Update
                  </button>
                </div>
                {passwordStatus ? <span className={styles.passwordStatus}>{passwordStatus}</span> : null}
              </div>
              <div className={styles.modalActions}>
                <button className={styles.primaryButton} type="button" onClick={handleEditSave}>
                  Save Changes
                </button>
                <button className={styles.secondaryButton} type="button" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reportOpen && reportData ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <button
            className={styles.modalBackdrop}
            type="button"
            onClick={() => setReportOpen(false)}
            aria-label="Close report"
          />
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Community Report</h3>
              <button className={styles.modalClose} type="button" onClick={() => setReportOpen(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.reportGrid}>
                <div className={styles.reportStat}>
                  <span>Total Users</span>
                  <strong>{reportData.totalUsers}</strong>
                </div>
                <div className={styles.reportStat}>
                  <span>Total Habits</span>
                  <strong>{reportData.totalHabits}</strong>
                </div>
                <div className={styles.reportStat}>
                  <span>Completed</span>
                  <strong>{reportData.totalCompleted}</strong>
                </div>
                <div className={styles.reportStat}>
                  <span>Success Rate</span>
                  <strong>{reportData.successRate}%</strong>
                </div>
              </div>
              <div className={styles.reportTopChartCard}>
                <h4>Top Habits</h4>
                <div className={styles.reportTopChart}>
                  <BarChart data={reportTopChartData} options={reportTopChartOptions} />
                </div>
              </div>
              <div className={styles.reportChartRow}>
                <div className={styles.reportChart}>
                  <DoughnutChart data={reportChartData} options={reportChartOptions} />
                </div>
                <div className={styles.reportLegend}>
                  <div className={styles.reportLegendItem}>
                    <span className={styles.reportLegendSwatch} style={{ background: "#A9C1A2" }} />
                    Completed {reportCompleted}
                  </div>
                  <div className={styles.reportLegendItem}>
                    <span className={styles.reportLegendSwatch} style={{ background: "#E8DED2" }} />
                    Remaining {reportRemaining}
                  </div>
                </div>
              </div>
              <div className={styles.reportTopCard}>
                <h4>Top Habits</h4>
                <div className={styles.reportTopList}>
                  {(reportData.topHabits || []).map((habit) => (
                    <div key={habit.name} className={styles.reportTopRow}>
                      <span>{habit.name}</span>
                      <span>{habit.total} completions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      initialUsers: fallbackAdmin,
      initialStats: adminStats
    }
  };
}
