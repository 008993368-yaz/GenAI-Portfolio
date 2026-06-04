import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { profile } from "../data/profile";
import { useScrollReveal } from "../hooks/useScrollReveal";
import styles from "./EmbeddingSpace.module.css";

gsap.registerPlugin(ScrollTrigger);

// Cluster centroids in % of the field, deliberately spread.
const CENTROIDS = [
  { x: 22, y: 32 },
  { x: 52, y: 20 },
  { x: 80, y: 36 },
  { x: 70, y: 76 },
  { x: 28, y: 74 },
];
// lime -> cyan ramp across the five categories
const COLORS = ["#cbe94b", "#aee04a", "#7fdcb0", "#5fcecb", "#54b9d6"];

interface Node {
  label: string;
  cluster: number;
  color: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
}

export default function EmbeddingSpace() {
  const field = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // Mobile accordion: index of the open domain (first open on load).
  const [open, setOpen] = useState<number | null>(0);
  // Scroll-in reveal for the accordion rows; trigger is the (always-visible)
  // section, so it fires reliably even though the accordion is display:none
  // on desktop. Reduced-motion is handled inside the hook + the .reveal class.
  const revealRef = useScrollReveal<HTMLElement>();

  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = [];
    profile.skills.forEach((group, c) => {
      const center = CENTROIDS[c % CENTROIDS.length];
      const n = group.items.length;
      group.items.forEach((label, j) => {
        const angle = (j / n) * Math.PI * 2 + c * 1.1;
        const rx = 9 + (j % 3) * 3.5;
        const ry = 8 + (j % 2) * 3.5;
        const x = Math.min(94, Math.max(6, center.x + Math.cos(angle) * rx));
        const y = Math.min(92, Math.max(8, center.y + Math.sin(angle) * ry));
        out.push({ label, cluster: c, color: COLORS[c % COLORS.length], x, y, cx: center.x, cy: center.y });
      });
    });
    return out;
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = field.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      // Animate opacity only — scaling the nodes risks leaving them shrunk
      // if the ScrollTrigger is reached via a programmatic jump.
      gsap.from(`.${styles.node}`, {
        opacity: 0,
        duration: 0.5,
        stagger: { each: 0.025, from: "random" },
        scrollTrigger: { trigger: el, start: "top 80%" },
      });
      gsap.from(`.${styles.link}`, {
        opacity: 0,
        duration: 0.8,
        stagger: 0.01,
        scrollTrigger: { trigger: el, start: "top 80%" },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.skills} id="skills" ref={revealRef}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <div>
            <p className="cmd">
              project: <b>skills</b> → 2d
            </p>
            <h2 className={styles.title}>Embedding space</h2>
          </div>
          <p className={styles.note}>
            {nodes.length} competencies, grouped by domain.
          </p>
        </header>

        {/* Interactive field (desktop) */}
        <div className={styles.field} ref={field}>
          <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none">
            {nodes.map((nd, i) => (
              <line
                key={i}
                className={styles.link}
                x1={nd.cx}
                y1={nd.cy}
                x2={nd.x}
                y2={nd.y}
                stroke={nd.color}
                vectorEffect="non-scaling-stroke"
                opacity={active === null || active === nd.cluster ? 0.28 : 0.05}
              />
            ))}
          </svg>

          {profile.skills.map((group, c) => {
            const center = CENTROIDS[c % CENTROIDS.length];
            return (
              <button
                key={group.label}
                type="button"
                className={styles.centroid}
                style={{
                  left: `${center.x}%`,
                  top: `${center.y}%`,
                  color: COLORS[c % COLORS.length],
                  opacity: active === null || active === c ? 1 : 0.32,
                }}
                onMouseEnter={() => setActive(c)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(c)}
                onBlur={() => setActive(null)}
              >
                <span className={styles.centroidDot} />
                {group.label.toLowerCase()}
                <span className={styles.centroidCount}>{group.items.length}</span>
              </button>
            );
          })}

          {nodes.map((nd, i) => (
            <div
              key={i}
              className={styles.node}
              style={{
                left: `${nd.x}%`,
                top: `${nd.y}%`,
                opacity: active === null || active === nd.cluster ? 1 : 0.18,
              }}
              onMouseEnter={() => setActive(nd.cluster)}
              onMouseLeave={() => setActive(null)}
            >
              <span className={styles.dot} style={{ background: nd.color }} />
              <span className={styles.label}>{nd.label}</span>
            </div>
          ))}
        </div>

        {/* Mobile / reduced-motion: tappable "domain tuner" accordion */}
        <div className={styles.accordion}>
          {profile.skills.map((group, c) => {
            const isOpen = open === c;
            const color = COLORS[c % COLORS.length];
            return (
              <div
                className={`reveal ${styles.aRow}`}
                key={group.label}
                data-open={isOpen}
              >
                <h3 className={styles.aHeadWrap}>
                  <button
                    type="button"
                    className={styles.aHead}
                    aria-expanded={isOpen}
                    aria-controls={`skills-acc-${c}`}
                    id={`skills-tab-${c}`}
                    onClick={() => setOpen(isOpen ? null : c)}
                  >
                    <span
                      className={styles.aDot}
                      style={{ background: color }}
                      aria-hidden="true"
                    />
                    <span className={styles.aName}>
                      {group.label.toLowerCase()}
                    </span>
                    <span className={styles.aSpacer} />
                    {!isOpen && (
                      <span className={styles.miniDots} aria-hidden="true">
                        {group.items.map((_, k) => (
                          <span
                            key={k}
                            className={styles.miniDot}
                            style={{ background: color }}
                          />
                        ))}
                      </span>
                    )}
                    <span className={styles.aCount}>{group.items.length}</span>
                    <span className={styles.aToggle} aria-hidden="true">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                </h3>
                <div
                  id={`skills-acc-${c}`}
                  role="region"
                  aria-labelledby={`skills-tab-${c}`}
                  aria-hidden={!isOpen}
                  className={styles.aPanel}
                >
                  <div className={styles.aPanelInner}>
                    <ul className={styles.aChips}>
                      {group.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
