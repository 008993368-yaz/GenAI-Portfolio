import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { profile } from "../data/profile";
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
  const root = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

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
        out.push({ label, cluster: c, color: COLORS[c], x, y, cx: center.x, cy: center.y });
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
    <section className={styles.skills} id="skills" ref={root}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <div>
            <p className="cmd">
              project: <b>skills</b> → 2d
            </p>
            <h2 className={styles.title}>Embedding space</h2>
          </div>
          <p className={styles.note}>
            {nodes.length} competencies, projected onto a plane and grouped by
            domain.
          </p>
        </header>

        {/* Interactive field (desktop) */}
        <div
          className={styles.field}
          ref={field}
          data-active={active !== null}
        >
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

          {profile.skills.map((group, c) => (
            <button
              key={group.label}
              className={styles.centroid}
              style={{
                left: `${CENTROIDS[c].x}%`,
                top: `${CENTROIDS[c].y}%`,
                color: COLORS[c],
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
          ))}

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

        {/* Legible fallback (mobile / reduced motion) */}
        <div className={styles.fallback}>
          {profile.skills.map((group, c) => (
            <div className={styles.fGroup} key={group.label}>
              <h3 className={styles.fLabel}>
                <span className={styles.dot} style={{ background: COLORS[c] }} />
                {group.label}
              </h3>
              <ul className={styles.fChips}>
                {group.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
