import styles from "./ProgressBar.module.css";

export default function ProgressBar({ label, value, tone }) {
  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className={styles.track}>
        <span
          className={styles.fill}
          style={{ width: `${value}%`, background: tone || "var(--moss)" }}
        />
      </div>
    </div>
  );
}
