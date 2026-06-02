import { profile } from "../data/profile";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { usePipelineReveal } from "../hooks/usePipelineReveal";
import styles from "./Context.module.css";

export default function Context() {
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.08 });
  const pipelineRef = usePipelineReveal<HTMLDivElement>();

  return (
    <section className={styles.context} id="about" ref={ref}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <p className={`cmd reveal`}>
            retrieve: <b>context</b>
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.pipeline} ref={pipelineRef}>
            <p className={`reveal ${styles.prompt}`}>{profile.about.prompt}</p>

            <div className={styles.flow}>
              <span className={styles.spine} data-spine aria-hidden="true" />
              {profile.about.pipeline.map((stage, i, arr) => (
                <div
                  key={stage.verb}
                  className={styles.node}
                  data-node
                  data-output={i === arr.length - 1 ? "true" : undefined}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.verb}>{stage.verb}</span>
                  <span className={styles.tech}>{stage.tech}</span>
                </div>
              ))}
            </div>

            <p className={`reveal ${styles.values}`} aria-hidden="true">
              ↳ {profile.about.values}
            </p>

            <p className={styles.srOnly}>{profile.about.summary}</p>
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
