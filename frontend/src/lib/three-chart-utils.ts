// Three.js Chart Utilities
import { 
  Color, 
  Shape, 
  ExtrudeGeometry, 
  MeshLambertMaterial, 
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  BufferGeometry,
  Raycaster,
  Vector2,
  Vector3,
  Camera,
  WebGLRenderer,
  Object3D,
  Intersection,
  Texture,
  CanvasTexture,
  Mesh,
  Material
} from 'three';
import { ChartTheme, ChartDataPoint } from '@/types/three-charts.types';

// Default theme
export const defaultChartTheme: ChartTheme = {
  background: '#ffffff',
  gridColor: '#e5e7eb',
  textColor: '#374151',
  primaryColor: '#3b82f6',
  secondaryColor: '#10b981',
  accentColors: [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#f97316', // orange
    '#06b6d4', // cyan
    '#84cc16', // lime
  ],
};

// Color utilities
export const hexToThreeColor = (hex: string): Color => {
  return new Color(hex);
};

export const getColorFromPalette = (index: number, palette: string[] = defaultChartTheme.accentColors): string => {
  return palette[index % palette.length] || '#888888';
};

export const lightenColor = (color: string, amount: number): string => {
  const threeColor = new Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  threeColor.getHSL(hsl);
  hsl.l = Math.min(1, hsl.l + amount);
  threeColor.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${threeColor.getHexString()}`;
};

export const darkenColor = (color: string, amount: number): string => {
  const threeColor = new Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  threeColor.getHSL(hsl);
  hsl.l = Math.max(0, hsl.l - amount);
  threeColor.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${threeColor.getHexString()}`;
};

// Data utilities
export const normalizeData = (data: ChartDataPoint[]): ChartDataPoint[] => {
  const maxValue = Math.max(...data.map(d => d.value));
  return data.map(d => ({
    ...d,
    normalizedValue: d.value / maxValue,
  }));
};

export const scaleValue = (value: number, min: number, max: number, targetMin: number, targetMax: number): number => {
  return ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin;
};

export const getDataBounds = (data: ChartDataPoint[]) => {
  const values = data.map(d => d.value);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
  };
};

// Geometry utilities
export const createRoundedBoxGeometry = (
  width: number,
  height: number,
  depth: number,
  radius: number = 0.1
): BufferGeometry => {
  const shape = new Shape();
  const x = width / 2;
  const y = height / 2;
  
  shape.moveTo(-x + radius, -y);
  shape.lineTo(x - radius, -y);
  shape.quadraticCurveTo(x, -y, x, -y + radius);
  shape.lineTo(x, y - radius);
  shape.quadraticCurveTo(x, y, x - radius, y);
  shape.lineTo(-x + radius, y);
  shape.quadraticCurveTo(-x, y, -x, y - radius);
  shape.lineTo(-x, -y + radius);
  shape.quadraticCurveTo(-x, -y, -x + radius, -y);
  
  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: radius * 0.1,
    bevelThickness: radius * 0.1,
  };
  
  return new ExtrudeGeometry(shape, extrudeSettings);
};

export const createGlowMaterial = (color: string, opacity: number = 0.3): Material => {
  return new MeshLambertMaterial({
    color: hexToThreeColor(color),
    transparent: true,
    opacity: opacity,
  });
};

// Animation utilities
export const createEasingFunction = (type: string) => {
  const easeOutBounce = (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  };
  
  const easings: { [key: string]: (t: number) => number } = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInQuart: (t: number) => t * t * t * t,
    easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
    easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    easeInBounce: (t: number) => 1 - easeOutBounce(1 - t),
    easeOutBounce: easeOutBounce,
  };
  
  const easingFn = easings[type];
  return easingFn || easings.easeOutQuad;
};

// Interaction utilities
export const getIntersectedObject = (
  mouse: Vector2,
  camera: Camera,
  objects: Object3D[]
): Intersection<Object3D> | null => {
  const raycaster = new Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(objects, true);
  return intersects.length > 0 ? intersects[0]! : null;
};

export const screenToWorld = (
  x: number,
  y: number,
  z: number,
  camera: Camera,
  renderer: WebGLRenderer
): Vector3 => {
  const vector = new Vector3();
  const size = renderer.getSize(new Vector2());
  
  vector.set(
    (x / size.x) * 2 - 1,
    -(y / size.y) * 2 + 1,
    z
  );
  
  vector.unproject(camera);
  return vector;
};

export const worldToScreen = (
  position: Vector3,
  camera: Camera,
  renderer: WebGLRenderer
): Vector2 => {
  const vector = position.clone();
  vector.project(camera);
  
  const size = renderer.getSize(new THREE.Vector2());
  const x = (vector.x + 1) * size.x / 2;
  const y = -(vector.y - 1) * size.y / 2;
  
  return new Vector2(x, y);
};

// Material utilities
export const createGradientTexture = (colors: string[], size: number = 256): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 1;
  
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, size, 0);
  
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, 1);
  
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const createMetallicMaterial = (color: string): MeshStandardMaterial => {
  return new MeshStandardMaterial({
    color: hexToThreeColor(color),
    metalness: 0.7,
    roughness: 0.3,
  });
};

export const createGlassMaterial = (color: string, opacity: number = 0.8): MeshPhysicalMaterial => {
  return new MeshPhysicalMaterial({
    color: hexToThreeColor(color),
    transparent: true,
    opacity: opacity,
    roughness: 0.1,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
};

// Text utilities (using @react-three/drei Text component instead of TextGeometry)
export const getTextProps = (text: string, size: number = 0.5) => {
  return {
    text,
    fontSize: size,
    maxWidth: 200,
    lineHeight: 1,
    letterSpacing: 0.02,
    textAlign: 'left' as const,
    font: 'https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff',
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
  };
};

// Math utilities
export const degToRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const radToDeg = (radians: number): number => {
  return radians * (180 / Math.PI);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * factor;
};

// Performance utilities
export const disposeObject = (object: Object3D): void => {
  if (object instanceof Mesh) {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  }
  
  object.children.forEach(child => disposeObject(child));
};

export const optimizeGeometry = (geometry: BufferGeometry): BufferGeometry => {
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

// Validation utilities
export const validateChartData = (data: ChartDataPoint[]): boolean => {
  if (!Array.isArray(data) || data.length === 0) {
    // Chart data must be a non-empty array
    return false;
  }
  
  const requiredFields = ['name', 'value'];
  const isValid = data.every(item => 
    requiredFields.every(field => 
      item.hasOwnProperty(field) && (item as any)[field] !== undefined && (item as any)[field] !== null
    )
  );
  
  if (!isValid) {
    // Chart data items must have name and value properties
    return false;
  }
  
  return true;
};