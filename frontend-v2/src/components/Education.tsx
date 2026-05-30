import { profile } from "../data/profile";
import { useScrollReveal } from "../hooks/useScrollReveal";
import styles from "./Education.module.css";

export default function Education() {
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.1 });

  return (
    <section className={styles.education} id="education" ref={ref}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <p className="cmd reveal">
            retrieve: <b>education</b>
          </p>
        </header>

        <div className={styles.list}>
          {profile.education.map((e) => (
            <article className={`reveal ${styles.row}`} key={e.school}>
              <div className={styles.main}>
                <h3 className={styles.degree}>{e.degree}</h3>
                <p className={styles.school}>{e.school}</p>
              </div>
              <div className={styles.aside}>
                <span className={styles.detail}>{e.detail}</span>
                <span className={styles.period}>{e.period}</span>
                <span className={styles.loc}>{e.location}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
