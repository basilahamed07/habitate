import styles from "./SiteHeader.module.css";

export default function SiteHeader({ title, subtitle, actions }) {
  return (
    <header className={styles.header}>
      <div>
        <div className={styles.logoRow}>
          <span className={styles.logo}>Habitat</span>
        </div>
        {title ? <h1 className={styles.title}>{title}</h1> : null}
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      <div className={styles.actions}>{actions}</div>
    </header>
  );
}
