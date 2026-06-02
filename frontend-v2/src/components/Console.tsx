import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { profile } from "../data/profile";
import { useChat } from "../hooks/useChat";
import { useTypewriter } from "../hooks/useTypewriter";
import styles from "./Console.module.css";

const skillCount = profile.skills.reduce((n, g) => n + g.items.length, 0);

export default function Console() {
  const root = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const { exchange, suggestions, send, sessionReady } = useChat();

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
        .from(
          `.${styles.demo}`,
          { opacity: 0, y: 14, duration: 0.7, clearProps: "opacity,transform" },
          "-=0.5"
        )
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
    send(value);
  };

  const pick = (q: string) => {
    setValue(q);
    send(q);
  };

  const verbs = profile.hero.headVerbs;
  const thinking = exchange.status === "thinking";

  // Starter chips before the first query, live backend suggestions afterward.
  // Same curated list for both rows — desktop shows three, mobile shows two.
  const renderChips = (count: number) =>
    (exchange.status === "idle"
      ? profile.hero.chips.slice(0, count)
      : suggestions.slice(0, count).map((q) => ({ label: q, q }))
    ).map((c) => (
      <button
        key={c.label}
        type="button"
        className={styles.chip}
        onClick={() => pick(c.q)}
        disabled={thinking}
      >
        {c.label}
      </button>
    ));

  // Type the answer out character by character once it arrives.
  const { shown: typedReply, done: typedDone } = useTypewriter(
    exchange.status === "done" ? exchange.reply : ""
  );

  // Seeded demo answer types out on load; the demo collapses on first real query.
  const { shown: demoTyped, done: demoDone } = useTypewriter(profile.hero.demo.a);

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

          <div
            className={styles.demo}
            data-collapsed={exchange.status !== "idle"}
          >
            <span className={styles.demoQ} aria-hidden="true">
              › {profile.hero.demo.q}
            </span>
            <span className={styles.demoA}>
              <span aria-hidden="true">
                ↳ {demoTyped}
                {!demoDone && <span className={styles.caret} />}
              </span>
              <span className={styles.srOnly}>
                {profile.hero.demo.q} — {profile.hero.demo.a}
              </span>
            </span>
            {demoDone && (
              <span className={styles.demoMeta} aria-hidden="true">
                replied in <b>{profile.hero.demo.ms}ms</b>
              </span>
            )}
          </div>

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
                aria-label="Ask the assistant"
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="submit"
                className={styles.run}
                aria-label="Send message"
                disabled={thinking || !sessionReady}
              >
                run ↵
              </button>
            </div>

            <div className={styles.readout} aria-live="polite">
              {thinking && (
                <span>
                  ↳ thinking<span className={styles.caret} aria-hidden="true" />
                </span>
              )}
              {exchange.status === "done" && (
                <span className={styles.answer}>
                  <span className={styles.qline}>› {exchange.query}</span>
                  <span className={styles.replyLine}>
                    {/* Visible typing is decorative; screen readers get one
                        clean copy of the full reply via the sr-only span. */}
                    <span aria-hidden="true">
                      ↳ {typedReply}
                      {!typedDone && <span className={styles.caret} />}
                    </span>
                    <span className={styles.srOnly}>↳ {exchange.reply}</span>
                  </span>
                  {typedDone && (
                    <span className={styles.meta}>
                      replied in <b>{exchange.ms}ms</b>
                    </span>
                  )}
                </span>
              )}
              {exchange.status === "error" && (
                <span className={styles.miss}>
                  ↳ {exchange.error || "couldn't reach the assistant"}
                </span>
              )}
            </div>
          </form>

          {/* Desktop shows three chips, mobile shows two. The CSS toggles which
              row is visible at the breakpoint. */}
          <div className={`${styles.chips} ${styles.chipsDesktop}`}>
            {renderChips(3)}
          </div>
          <div className={`${styles.chips} ${styles.chipsMobile}`}>
            {renderChips(2)}
          </div>
        </div>

        <aside className={styles.hud} aria-hidden="true">
          <div className={styles.hudHead}>
            <span>corpus.meta</span>
            <span className={styles.hudOk}>{thinking ? "● thinking" : "● ready"}</span>
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
