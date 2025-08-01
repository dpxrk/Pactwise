'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { Mesh, Vector3, BufferGeometry } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import { BarChartProps, ChartDataPoint, ChartMesh } from '@/types/three-charts.types';
import { ChartTheme } from '@/types/common.types';
import { BaseThreeChart } from './BaseThreeChart';
import {
  getColorFromPalette,
  getDataBounds,
  scaleValue,
  createRoundedBoxGeometry,
  createMetallicMaterial,
  hexToThreeColor,
  defaultChartTheme,
} from '@/lib/three-chart-utils';
import gsap from 'gsap';

// Individual Bar component
const Bar: React.FC<{
  dataPoint: ChartDataPoint;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  index: number;
  maxValue: number;
  animation?: boolean;
}> = ({ dataPoint, position, size, color, index, maxValue, animation = true }) => {
  const meshRef = useRef<Mesh>(null);
  const [barWidth, barHeight, barDepth] = size;

  // Create geometry and material
  const geometry = useMemo(() => 
    createRoundedBoxGeometry(barWidth, barHeight, barDepth, 0.05), 
    [barWidth, barHeight, barDepth]
  );
  
  const material = useMemo(() => 
    createMetallicMaterial(color), 
    [color]
  );

  // Animation on mount
  useEffect(() => {
    if (meshRef.current && animation) {
      // Start with scale 0 and animate to full scale
      meshRef.current.scale.set(1, 0, 1);
      meshRef.current.position.set(position[0], position[1] - barHeight / 2, position[2]);

      gsap.to(meshRef.current.scale, {
        duration: 0.8,
        y: 1,
        delay: index * 0.1,
        ease: "back.out(1.7)",
      });

      gsap.to(meshRef.current.position, {
        duration: 0.8,
        y: position[1],
        delay: index * 0.1,
        ease: "back.out(1.7)",
      });
    }
  }, [animation, index, position, barHeight]);

  // Hover animation
  const handlePointerEnter = () => {
    if (meshRef.current) {
      gsap.to(meshRef.current.scale, {
        duration: 0.3,
        x: 1.1,
        z: 1.1,
        ease: "power2.out",
      });
      gsap.to(meshRef.current.position, {
        duration: 0.3,
        y: position[1] + 0.2,
        ease: "power2.out",
      });
    }
  };

  const handlePointerLeave = () => {
    if (meshRef.current) {
      gsap.to(meshRef.current.scale, {
        duration: 0.3,
        x: 1,
        z: 1,
        ease: "power2.out",
      });
      gsap.to(meshRef.current.position, {
        duration: 0.3,
        y: position[1],
        ease: "power2.out",
      });
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        userData={{
          dataPoint,
          originalColor: color,
          originalPosition: new Vector3(...position),
          isAnimating: false,
        }}
      />
      
      {/* Bar label */}
      <Text
        position={[position[0], position[1] + barHeight / 2 + 0.5, position[2]]}
        fontSize={0.3}
        color={defaultChartTheme.textColor}
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 6, 0, 0]}
      >
        {dataPoint.value.toLocaleString()}
      </Text>
      
      {/* X-axis label */}
      <Text
        position={[position[0], -1, position[2] + 1]}
        fontSize={0.25}
        color={defaultChartTheme.textColor}
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {dataPoint.name}
      </Text>
    </group>
  );
};

// Bar Chart Content component
const BarChartContent: React.FC<{
  data: ChartDataPoint[];
  barWidth: number;
  barDepth: number;
  spacing: number;
  maxHeight: number;
  showGrid: boolean;
  showAxes: boolean;
  theme: ChartTheme;
}> = ({ 
  data, 
  barWidth, 
  barDepth, 
  spacing, 
  maxHeight, 
  showGrid, 
  showAxes,
  theme 
}) => {
  const { min, max } = getDataBounds(data);
  const totalWidth = (data.length - 1) * spacing;

  // Create bars
  const bars = useMemo(() => {
    return data.map((dataPoint, index) => {
      const barHeight = scaleValue(dataPoint.value, min, max, 0.1, maxHeight);
      const x = (index * spacing) - (totalWidth / 2);
      const y = barHeight / 2;
      const z = 0;

      const color = dataPoint.color || getColorFromPalette(index, theme.accentColors);

      return (
        <Bar
          key={`${dataPoint.name}-${index}`}
          dataPoint={dataPoint}
          position={[x, y, z]}
          size={[barWidth, barHeight, barDepth]}
          color={color}
          index={index}
          maxValue={max}
        />
      );
    });
  }, [data, barWidth, barDepth, spacing, maxHeight, min, max, totalWidth, theme.accentColors]);

  // Create grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return null;

    const lines = [];
    const gridCount = 5;
    
    for (let i = 0; i <= gridCount; i++) {
      const y = (i / gridCount) * maxHeight;
      const value = Math.round(scaleValue(y, 0, maxHeight, min, max));
      
      // Horizontal grid line
      const points = [
        new Vector3(-totalWidth / 2 - 1, y, 0),
        new Vector3(totalWidth / 2 + 1, y, 0),
      ];
      
      const geometry = new BufferGeometry().setFromPoints(points);
      
      lines.push(
        <group key={`grid-${i}`}>
          <Line
            points={points}
            color={theme.gridColor}
            lineWidth={1}
            opacity={0.3}
            transparent
          />
          <Text
            position={[-totalWidth / 2 - 1.5, y, 0]}
            fontSize={0.2}
            color={theme.textColor}
            anchorX="right"
            anchorY="middle"
          >
            {value.toLocaleString()}
          </Text>
        </group>
      );
    }
    
    return lines;
  }, [showGrid, maxHeight, totalWidth, min, max, theme.gridColor, theme.textColor]);

  return (
    <group>
      {bars}
      {gridLines}
    </group>
  );
};

// Main Three.js Bar Chart component
export const ThreeBarChart: React.FC<BarChartProps> = ({
  data,
  barWidth = 0.8,
  barDepth = 0.8,
  spacing = 2,
  groupSpacing = 0.5,
  showGrid = true,
  showAxes = true,
  stackedBars = false,
  width = 800,
  height = 600,
  theme = {},
  animation = { duration: 800, easing: 'back.out(1.7)' },
  camera = { position: [15, 10, 15] },
  className,
  ...props
}) => {
  // Validate and prepare data
  const validData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      // Bar chart data must be a non-empty array
      return [];
    }
    return data.filter(item => 
      item && 
      typeof item.value === 'number' && 
      !isNaN(item.value) && 
      item.name
    );
  }, [data]);

  // Calculate chart dimensions
  const maxHeight = 8; // Maximum height for bars
  const mergedTheme = { ...defaultChartTheme, ...theme };

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-gray-500">No valid data to display</p>
      </div>
    );
  }

  return (
    <BaseThreeChart
      data={validData}
      width={width}
      height={height}
      theme={mergedTheme}
      camera={camera}
      enableGrid={false}
      enableAxes={false}
      {...(className && { className })}
      {...props}
    >
      <BarChartContent
        data={validData}
        barWidth={barWidth}
        barDepth={barDepth}
        spacing={spacing}
        maxHeight={maxHeight}
        showGrid={showGrid}
        showAxes={showAxes}
        theme={mergedTheme}
      />
    </BaseThreeChart>
  );
};

export default ThreeBarChart;