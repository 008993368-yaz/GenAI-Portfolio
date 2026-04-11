import { memo, useEffect } from 'react';

const Hero3D = memo(({ onFirstRender }) => {
  useEffect(() => {
    onFirstRender?.();
  }, [onFirstRender]);

  return <div className="hero-visual" aria-hidden="true" />;
});

Hero3D.displayName = 'Hero3D';

export default Hero3D;
