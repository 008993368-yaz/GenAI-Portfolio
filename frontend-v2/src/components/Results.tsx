import { profile } from "../data/profile";
import { useScrollReveal } from "../hooks/useScrollReveal";
import styles from "./Results.module.css";

export default function Results() {
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.1, y: 30 });

  return (
    <section className={styles.results} id="projects" ref={ref}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <p className="cmd reveal">
            query: <b>"things i've built"</b>
          </p>
        </header>

        <div className={styles.list}>
          {profile.projects.map((p) => (
            <article className={`reveal ${styles.card}`} key={p.name}>
              <div className={styles.rail}>
                <span className={styles.index}>[{p.index}]</span>
                <div className={styles.scoreWrap}>
                  <span className={styles.scoreVal}>{p.score.toFixed(2)}</span>
                  <span className={styles.scoreTrack}>
                    <span
                      className={styles.scoreFill}
                      style={{ width: `${p.score * 100}%` }}
                    />
                  </span>
                  <span className={styles.scoreKey}>match score</span>
                </div>
              </div>

              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <h3 className={styles.name}>{p.name}</h3>
                  <span className={styles.open} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path
                        d="M7 17L17 7M17 7H8M17 7v9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <p className={styles.tagline}>{p.tagline}</p>
                <p className={styles.desc}>{p.description}</p>
                <div className={styles.tags}>
                  {p.tech.map((t) => (
                    <span className={styles.tag} key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
