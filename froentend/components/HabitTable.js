import styles from "./HabitTable.module.css";

export default function HabitTable({ rows, onToggle, dayCount, onDelete, readOnly }) {
  const length = dayCount || rows?.[0]?.days?.length || 0;
  const days = Array.from({ length }, (_, index) => index + 1);
  const canDelete = typeof onDelete === "function" && !readOnly;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Habits</th>
            {days.map((day) => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row.habit}>
              <td className={styles.habitName}>
                <div className={styles.habitRow}>
                  <span>{row.habit}</span>
                  {canDelete ? (
                    <button
                      className={styles.deleteButton}
                      type="button"
                      onClick={() => onDelete?.(row.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </td>
              {Array.from({ length }, (_, index) => row.days?.[index] || false).map(
                (done, index) => (
                <td key={`${row.habit}-${index}`}>
                  <button
                    className={`${styles.dot} ${done ? styles.complete : styles.pending} ${
                      readOnly ? styles.dotDisabled : ""
                    }`}
                    aria-label={done ? "Completed" : "Not completed"}
                    aria-pressed={done}
                    type="button"
                    onClick={() => onToggle?.(row.id, index)}
                    disabled={readOnly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
