import { useEffect, useState } from "react";
import { profile } from "../data/profile";
import styles from "./StatusBar.module.css";

export default function StatusBar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 24);
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const focusQuery = () =>
    window.dispatchEvent(new CustomEvent("focus-query"));

  return (
    <header className={`${styles.bar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand} aria-label={profile.name}>
          <span className={styles.node} aria-hidden="true" />
          <span className={styles.handle}>{profile.handle}</span>
          <span className={styles.slash}>/</span>
          <span className={styles.crumb}>engineer</span>
        </a>

        <div className={styles.right}>
          <span className={styles.status}>
            <span className={styles.dot} aria-hidden="true" />
            available
          </span>
          <button className={styles.search} onClick={focusQuery}>
            <span>query</span>
            <kbd>⌘K</kbd>
          </button>
        </div>
      </div>
      <div className={styles.track} aria-hidden="true">
        <div
          className={styles.scrub}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  );
}
