import styles from "./ChartCard.module.css";

export default function ChartCard({ title, children, footer }) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3>{title}</h3>
      </div>
      <div className={styles.content}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}
