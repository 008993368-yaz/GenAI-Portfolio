import { profile } from "../data/profile";
import { useScrollReveal } from "../hooks/useScrollReveal";
import styles from "./Contact.module.css";

export default function Contact() {
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.08 });

  return (
    <section className={styles.contact} id="contact" ref={ref}>
      <div className={styles.shell}>
        <p className="cmd reveal">
          query: <b>"how do i reach you?"</b>
        </p>

        <h2 className={`reveal ${styles.title}`}>
          Let&rsquo;s put something
          <br />
          into production.
          <span className={styles.caret} aria-hidden="true" />
        </h2>

        <a
          href={`mailto:${profile.email}`}
          className={`reveal ${styles.email}`}
        >
          <span className={styles.emailPrompt}>↳</span>
          {profile.email}
        </a>

        <div className={`reveal ${styles.grid}`}>
          <div className={styles.col}>
            <span className={styles.k}>phone</span>
            <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>
              {profile.phone}
            </a>
          </div>
          <div className={styles.col}>
            <span className={styles.k}>location</span>
            <span>{profile.location}</span>
          </div>
          <div className={styles.col}>
            <span className={styles.k}>links</span>
            <div className={styles.links}>
              {profile.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className={styles.link}
                  data-placeholder={l.placeholder ? "" : undefined}
                  title={l.placeholder ? "coming soon" : l.label}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.brand}>
            <span className={styles.node} aria-hidden="true" />
            {profile.handle}
          </span>
          <span className={styles.build}>
            built from scratch · {profile.build}
          </span>
          <a href="#top" className={styles.top}>
            back to top ↑
          </a>
        </footer>
      </div>
    </section>
  );
}
