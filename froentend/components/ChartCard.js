import styles from "./ChartCard.module.css";

export default function ChartCard({ title, children, footer, className }) {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;
  return (
    <section className={cardClassName}>
      <div className={styles.header}>
        <h3>{title}</h3>
      </div>
      <div className={styles.content}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}
