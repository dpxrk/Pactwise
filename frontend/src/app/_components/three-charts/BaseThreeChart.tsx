'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Vector2, Vector3, Object3D } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { cn } from '@/lib/utils';
import { 
  ThreeChartProps, 
  ChartTheme, 
  TooltipData
} from '@/types/three-charts.types';
import { 
  defaultChartTheme, 
  validateChartData
} from '@/lib/three-chart-utils';

interface BaseThreeChartProps extends ThreeChartProps {
  children: React.ReactNode;
  enableControls?: boolean;
  enableGrid?: boolean;
  enableAxes?: boolean;
}

// Tooltip component
const ChartTooltip: React.FC<{ tooltip: TooltipData }> = ({ tooltip }) => {
  if (!tooltip.visible) return null;

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none transition-all duration-200"
      style={{
        left: tooltip.position[0],
        top: tooltip.position[1],
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="flex items-center space-x-2">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: tooltip.color }}
        />
        <div>
          <div className="font-medium text-gray-900">{tooltip.title}</div>
          <div className="text-sm text-gray-600">{tooltip.value}</div>
        </div>
      </div>
    </div>
  );
};

// Grid component
const Grid: React.FC<{ size?: number; divisions?: number; color?: string }> = ({
  size = 20,
  divisions = 20,
  color = '#e5e7eb'
}) => {
  return (
    <gridHelper 
      args={[size, divisions, color, color]}
      position={[0, -0.1, 0]}
    />
  );
};

// Axes component
const Axes: React.FC<{ size?: number; color?: string }> = ({
  size = 10,
  color = '#9ca3af'
}) => {
  return (
    <group>
      {/* X Axis */}
      <arrowHelper
        args={[
          new Vector3(1, 0, 0),
          new Vector3(0, 0, 0),
          size,
          color
        ]}
      />
      {/* Y Axis */}
      <arrowHelper
        args={[
          new Vector3(0, 1, 0),
          new Vector3(0, 0, 0),
          size,
          color
        ]}
      />
      {/* Z Axis */}
      <arrowHelper
        args={[
          new Vector3(0, 0, 1),
          new Vector3(0, 0, 0),
          size,
          color
        ]}
      />
    </group>
  );
};

// Lighting setup component
const ChartLighting: React.FC<{ theme: ChartTheme }> = ({ theme }) => {
  return (
    <>
      <ambientLight 
        color={theme.gridColor} 
        intensity={0.4} 
      />
      <directionalLight
        color="#ffffff"
        intensity={1}
        position={[10, 10, 5]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight
        color={theme.primaryColor}
        intensity={0.5}
        position={[5, 5, 5]}
      />
    </>
  );
};

// Scene component that wraps chart content
const ChartScene: React.FC<{
  children: React.ReactNode;
  theme: ChartTheme;
  enableGrid: boolean;
  enableAxes: boolean;
  onHover?: (data: unknown) => void;
  onClick?: (data: unknown) => void;
}> = ({ 
  children, 
  theme, 
  enableGrid, 
  enableAxes, 
  onHover, 
  onClick 
}) => {
  const { camera, raycaster, scene, gl } = useThree();
  const [hoveredObject, setHoveredObject] = useState<Object3D | null>(null);

  // Handle mouse interactions
  const handlePointerMove = useCallback((event: PointerEvent) => {
    const mouse = new Vector2();
    const rect = gl.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0 && intersects[0]) {
      const object = intersects[0].object;
      if (object !== hoveredObject && object.userData?.dataPoint) {
        setHoveredObject(object);
        onHover?.(object.userData.dataPoint);
      }
    } else if (hoveredObject) {
      setHoveredObject(null);
      onHover?.(null);
    }
  }, [camera, raycaster, scene, gl, hoveredObject, onHover]);

  const handleClick = useCallback((event: PointerEvent) => {
    const mouse = new Vector2();
    const rect = gl.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0 && intersects[0]) {
      const object = intersects[0].object;
      if (object.userData?.dataPoint) {
        onClick?.(object.userData.dataPoint);
      }
    }
  }, [camera, raycaster, scene, gl, onClick]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [gl, handlePointerMove, handleClick]);

  return (
    <>
      <ChartLighting theme={theme} />
      {enableGrid && <Grid color={theme.gridColor} />}
      {enableAxes && <Axes color={theme.textColor} />}
      {children}
    </>
  );
};

// Main BaseThreeChart component
export const BaseThreeChart: React.FC<BaseThreeChartProps> = ({
  data,
  width = 800,
  height = 600,
  theme = {},
  camera = {},
  interaction = {},
  enableControls = true,
  enableGrid = false,
  enableAxes = false,
  onHover,
  onClick,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    title: '',
    value: '',
    color: '',
    position: [0, 0],
    visible: false,
  });

  // Validate data
  useEffect(() => {
    if (!validateChartData(data)) {
      console.error('Invalid chart data provided');
    }
  }, [data]);

  // Merge theme with defaults
  const mergedTheme: ChartTheme = { ...defaultChartTheme, ...theme };

  // Default camera settings
  const defaultCamera = {
    position: [15, 15, 15] as [number, number, number],
    fov: 45,
    near: 0.1,
    far: 1000,
    ...camera,
  };

  // Default interaction settings
  const defaultInteraction = {
    hover: true,
    click: true,
    drag: true,
    zoom: true,
    rotate: true,
    ...interaction,
  };

  // Handle hover events
  const handleHover = useCallback((dataPoint: { name?: string; value?: string | number; color?: string } | null) => {
    if (dataPoint && defaultInteraction.hover) {
      setTooltip({
        title: dataPoint.name || '',
        value: dataPoint.value || '',
        color: dataPoint.color || mergedTheme.primaryColor,
        position: [0, 0], // Will be updated by mouse position
        visible: true,
      });
      onHover?.(dataPoint);
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
      onHover?.(null);
    }
  }, [defaultInteraction.hover, onHover, mergedTheme.primaryColor]);

  // Handle click events
  const handleClick = useCallback((dataPoint: { name?: string; value?: string | number; color?: string } | null) => {
    if (defaultInteraction.click) {
      onClick?.(dataPoint);
    }
  }, [defaultInteraction.click, onClick]);

  // Update tooltip position on mouse move
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (tooltip.visible && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip(prev => ({
          ...prev,
          position: [
            event.clientX - rect.left,
            event.clientY - rect.top,
          ],
        }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [tooltip.visible]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative', className)}
      style={{ width, height }}
    >
      <Canvas
        camera={{
          position: defaultCamera.position,
          fov: defaultCamera.fov,
          near: defaultCamera.near,
          far: defaultCamera.far,
        }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        style={{ 
          background: mergedTheme.background,
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={defaultCamera.position}
          fov={defaultCamera.fov}
          near={defaultCamera.near}
          far={defaultCamera.far}
        />
        
        {enableControls && (
          <OrbitControls
            enablePan={defaultInteraction.drag}
            enableZoom={defaultInteraction.zoom}
            enableRotate={defaultInteraction.rotate}
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={100}
          />
        )}

        <ChartScene
          theme={mergedTheme}
          enableGrid={enableGrid}
          enableAxes={enableAxes}
          onHover={handleHover}
          onClick={handleClick}
        >
          {children}
        </ChartScene>
      </Canvas>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
};

export default BaseThreeChart;