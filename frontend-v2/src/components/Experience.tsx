import { profile } from "../data/profile";
import { useScrollReveal } from "../hooks/useScrollReveal";
import styles from "./Experience.module.css";

export default function Experience() {
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.07 });

  return (
    <section className={styles.experience} id="work" ref={ref}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <p className="cmd reveal">
            retrieve: <b>experience</b>
          </p>
        </header>

        {profile.experience.map((job) => (
          <article className={styles.job} key={job.company}>
            <div className={`reveal ${styles.jobHead}`}>
              <div className={styles.titleWrap}>
                <h3 className={styles.role}>{job.role}</h3>
                <p className={styles.company}>
                  <span className={styles.at}>@</span>
                  {job.company}
                  <span className={styles.loc}>{job.location}</span>
                </p>
              </div>
              <span className={styles.period}>{job.period}</span>
            </div>

            <ol className={styles.bullets}>
              {job.bullets.map((b, i) => (
                <li className={`reveal ${styles.bullet}`} key={i}>
                  <span className={styles.idx}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.text}>{b}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
