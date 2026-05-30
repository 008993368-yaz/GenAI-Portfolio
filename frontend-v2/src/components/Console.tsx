import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { profile } from "../data/profile";
import { useSearch } from "../hooks/useSearch";
import styles from "./Console.module.css";

const skillCount = profile.skills.reduce((n, g) => n + g.items.length, 0);

export default function Console() {
  const root = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const { result, run } = useSearch();

  // Global ⌘K / Ctrl-K and status-bar button focus the query.
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focus();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("focus-query", focus);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("focus-query", focus);
    };
  }, []);

  // Load-in choreography
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(`.${styles.kicker}`, { opacity: 0, y: 12, duration: 0.6 })
        .from(
          `.${styles.headLine} > span`,
          { yPercent: 110, duration: 0.95, stagger: 0.08, ease: "power4.out" },
          "-=0.25"
        )
        .from(`.${styles.sub}`, { opacity: 0, y: 14, duration: 0.7 }, "-=0.5")
        .from(`.${styles.console}`, { opacity: 0, y: 18, duration: 0.7 }, "-=0.45")
        .from(
          `.${styles.chip}`,
          { opacity: 0, y: 10, duration: 0.5, stagger: 0.06 },
          "-=0.4"
        )
        .from(`.${styles.hud}`, { opacity: 0, duration: 0.8 }, "-=0.6");
    }, root);
    return () => ctx.revert();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(value);
  };

  const pick = (q: string) => {
    setValue(q);
    run(q);
  };

  const verbs = profile.hero.headVerbs;

  return (
    <section className={styles.hero} id="top" ref={root}>
      <div className={styles.scan} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.main}>
          <p className={styles.kicker}>
            <span className={styles.comment}>//</span> {profile.hero.kicker}
          </p>

          <h1 className={styles.head}>
            <span className={styles.headLine}>
              <span>{profile.hero.headStart}</span>
            </span>
            <span className={styles.headLine}>
              <span className={styles.verbs}>
                {verbs.map((v, i) => (
                  <span key={v}>
                    <span className={styles.verb}>{v}</span>
                    {i < verbs.length - 1
                      ? i === verbs.length - 2
                        ? ", and "
                        : ", "
                      : "."}
                  </span>
                ))}
                <span className={styles.caret} aria-hidden="true" />
              </span>
            </span>
          </h1>

          <p className={styles.sub}>{profile.hero.sub}</p>

          <form className={styles.console} onSubmit={submit}>
            <div className={styles.prompt}>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
              <input
                ref={inputRef}
                className={styles.input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={profile.hero.placeholder}
                aria-label="Query the corpus"
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="submit"
                className={styles.run}
                aria-label="Run query"
              >
                run ↵
              </button>
            </div>

            <div className={styles.readout} aria-live="polite">
              {result &&
                (result.ok ? (
                  <span>
                    ↳ <b>{result.count}</b> result
                    {result.count === 1 ? "" : "s"} in <b>{result.ms}ms</b> ·
                    jumped to <b>{result.label}</b>
                  </span>
                ) : (
                  <span className={styles.miss}>
                    ↳ no match for “{result.query}”
                  </span>
                ))}
            </div>
          </form>

          <div className={styles.chips}>
            {profile.hero.suggestions.map((s) => (
              <button
                key={s.q}
                className={styles.chip}
                onClick={() => pick(s.q)}
              >
                {s.q}
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.hud} aria-hidden="true">
          <div className={styles.hudHead}>
            <span>corpus.meta</span>
            <span className={styles.hudOk}>● ready</span>
          </div>
          <ul className={styles.hudList}>
            <li>
              <span>sections</span>
              <span>{profile.searchIndex.length}</span>
            </li>
            <li>
              <span>skills</span>
              <span>{skillCount}</span>
            </li>
            <li>
              <span>projects</span>
              <span>{profile.projects.length}</span>
            </li>
          </ul>
        </aside>
      </div>

      <a href="#about" className={styles.cue}>
        scroll
        <span className={styles.cueArrow}>↓</span>
      </a>
    </section>
  );
}
