import { useSmoothScroll } from "./hooks/useSmoothScroll";
import StatusBar from "./components/StatusBar";
import Console from "./components/Console";
import Context from "./components/Context";
import EmbeddingSpace from "./components/EmbeddingSpace";
import Experience from "./components/Experience";
import Results from "./components/Results";
import Education from "./components/Education";
import Contact from "./components/Contact";

export default function App() {
  useSmoothScroll();

  return (
    <>
      <StatusBar />
      <main>
        <Console />
        <Context />
        <EmbeddingSpace />
        <Experience />
        <Results />
        <Education />
        <Contact />
      </main>
    </>
  );
}
