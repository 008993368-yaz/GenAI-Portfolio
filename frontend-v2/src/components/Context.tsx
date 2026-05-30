import { profile } from "../data/profile";
import { useScrollReveal } from "../hooks/useScrollReveal";
import styles from "./Context.module.css";

export default function Context() {
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.08 });

  return (
    <section className={styles.context} id="about" ref={ref}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <p className={`cmd reveal`}>
            retrieve: <b>context</b>
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.prose}>
            <p className={`reveal ${styles.lead}`}>{profile.about.lead}</p>
            <p className={`reveal ${styles.body}`}>{profile.about.body}</p>
          </div>

          <dl className={`reveal ${styles.manifest}`}>
            <div className={styles.manifestHead}>
              <span>system.context</span>
              <span className={styles.ok}>● live</span>
            </div>
            {profile.manifest.map((m) => (
              <div className={styles.row} key={m.k}>
                <dt>{m.k}</dt>
                <dd>{m.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.metrics}>
          {profile.metrics.map((m) => (
            <div className={`reveal ${styles.metric}`} key={m.k}>
              <span className={styles.metricVal}>{m.v}</span>
              <span className={styles.metricKey}>{m.k}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
