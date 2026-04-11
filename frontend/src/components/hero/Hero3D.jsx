import { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Detailed } from '@react-three/drei/core/Detailed';
import { Float } from '@react-three/drei/core/Float';
import { Color } from 'three';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { clamp } from '../../utils/threeHelpers';

const GeometryCore = ({ reducedMotion, lowDetail }) => {
  const groupRef = useRef(null);
  const materialColor = useMemo(() => new Color('#1a1a1a'), []);

  useFrame(({ mouse, clock }) => {
    if (!groupRef.current) {
      return;
    }

    // Blend orbital drift with mouse-driven parallax for a tactile hero visual.
    const t = clock.getElapsedTime();
    const targetX = reducedMotion ? 0 : mouse.y * 0.45;
    const targetY = reducedMotion ? 0.2 : mouse.x * 0.45;

    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.05;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.05;
    groupRef.current.position.x += (clamp(mouse.x, -1, 1) * 0.35 - groupRef.current.position.x) * 0.05;
    groupRef.current.position.y += (clamp(mouse.y, -1, 1) * 0.22 - groupRef.current.position.y) * 0.05;

    if (!reducedMotion) {
      groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.2;
    }
  });

  return (
    <Float speed={lowDetail ? 0.45 : 0.9} rotationIntensity={0.3} floatIntensity={0.55}>
      <group ref={groupRef}>
        {/* Drei Detailed adds smooth camera-distance LOD while preserving richer close-up geometry. */}
        <Detailed distances={[0, 7, 15]}>
          <mesh>
            <torusKnotGeometry args={[1.2, 0.36, lowDetail ? 110 : 220, lowDetail ? 18 : 30]} />
            <meshStandardMaterial
              color={materialColor}
              emissive="#00e5ff"
              emissiveIntensity={0.35}
              metalness={0.84}
              roughness={0.18}
            />
          </mesh>
          <mesh>
            <icosahedronGeometry args={[1.3, lowDetail ? 2 : 4]} />
            <meshStandardMaterial
              color={materialColor}
              emissive="#ff00e5"
              emissiveIntensity={0.22}
              metalness={0.65}
              roughness={0.22}
              wireframe
            />
          </mesh>
          <mesh>
            <octahedronGeometry args={[1.5, lowDetail ? 1 : 2]} />
            <meshStandardMaterial
              color={materialColor}
              emissive="#0066ff"
              emissiveIntensity={0.28}
              metalness={0.6}
              roughness={0.32}
            />
          </mesh>
        </Detailed>
      </group>
    </Float>
  );
};

const Hero3D = memo(({ onFirstRender }) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isSmall = useMediaQuery('(max-width: 960px)');
  const lowDetail = reducedMotion || isSmall;

  useEffect(() => {
    onFirstRender?.();
  }, [onFirstRender]);

  return (
    <div className="hero-visual" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, isSmall ? 5.2 : 4.2], fov: isSmall ? 55 : 48 }}
        dpr={[1, 1.8]}
        performance={{ min: 0.5 }}
      >
        <ambientLight intensity={0.45} />
        <pointLight position={[4, 3, 4]} color="#00e5ff" intensity={2.2} />
        <pointLight position={[-4, -2, 2]} color="#ff00e5" intensity={1.8} />
        <pointLight position={[0, 0, -4]} color="#0066ff" intensity={1.2} />
        <GeometryCore reducedMotion={reducedMotion} lowDetail={lowDetail} />
      </Canvas>
    </div>
  );
});

Hero3D.displayName = 'Hero3D';

export default Hero3D;
