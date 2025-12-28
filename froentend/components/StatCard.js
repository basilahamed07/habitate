import styles from "./StatCard.module.css";

export default function StatCard({ label, value, detail, accent }) {
  return (
    <div className={styles.card} style={accent ? { borderColor: accent } : undefined}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {detail ? <div className={styles.detail}>{detail}</div> : null}
    </div>
  );
}
