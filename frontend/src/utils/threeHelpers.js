import { Color, MeshStandardMaterial } from 'three';

export const createNeonMaterial = () =>
  new MeshStandardMaterial({
    metalness: 0.75,
    roughness: 0.18,
    emissive: new Color('#00e5ff'),
    emissiveIntensity: 0.35,
    color: new Color('#1a1a1a'),
  });

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
