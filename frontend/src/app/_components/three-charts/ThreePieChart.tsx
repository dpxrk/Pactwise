'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { 
  Group, 
  Mesh, 
  Shape, 
  ExtrudeGeometry, 
  MeshStandardMaterial, 
  Vector3 
} from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { PieChartProps, ChartDataPoint } from '@/types/three-charts.types';
import { ChartTheme } from '@/types/common.types';
import { BaseThreeChart } from './BaseThreeChart';
import {
  getColorFromPalette,
  hexToThreeColor,
  defaultChartTheme,
  degToRad,
} from '@/lib/three-chart-utils';
import gsap from 'gsap';

// Individual Pie Slice component
const PieSlice: React.FC<{
  dataPoint: ChartDataPoint;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  thickness: number;
  color: string;
  index: number;
  percentage: number;
  showLabels: boolean;
  labelDistance: number;
}> = ({ 
  dataPoint, 
  startAngle, 
  endAngle, 
  innerRadius, 
  outerRadius, 
  thickness, 
  color, 
  index,
  percentage,
  showLabels,
  labelDistance
}) => {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const [isHovered, setIsHovered] = React.useState(false);

  // Create pie slice geometry
  const geometry = useMemo(() => {
    const shape = new Shape();
    const angleSpan = endAngle - startAngle;
    
    // Outer arc
    shape.moveTo(Math.cos(startAngle) * outerRadius, Math.sin(startAngle) * outerRadius);
    shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
    
    // Inner arc (if exists)
    if (innerRadius > 0) {
      shape.lineTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
      shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
    } else {
      shape.lineTo(0, 0);
    }
    
    shape.closePath();

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };

    return new ExtrudeGeometry(shape, extrudeSettings);
  }, [startAngle, endAngle, innerRadius, outerRadius, thickness]);

  // Create material
  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: hexToThreeColor(color),
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9,
    });
  }, [color]);

  // Animation on mount
  useEffect(() => {
    if (groupRef.current) {
      // Start with scale 0 and rotate
      groupRef.current.scale.set(0, 0, 0);
      groupRef.current.rotation.z = -Math.PI / 2;

      gsap.to(groupRef.current.scale, {
        duration: 0.8,
        x: 1,
        y: 1,
        z: 1,
        delay: index * 0.1,
        ease: "back.out(1.7)",
      });

      gsap.to(groupRef.current.rotation, {
        duration: 0.8,
        z: 0,
        delay: index * 0.1,
        ease: "power2.out",
      });
    }
  }, [index]);

  // Hover animations
  const handlePointerEnter = () => {
    setIsHovered(true);
    if (groupRef.current) {
      const midAngle = (startAngle + endAngle) / 2;
      const moveDistance = 0.3;
      const offsetX = Math.cos(midAngle) * moveDistance;
      const offsetY = Math.sin(midAngle) * moveDistance;

      gsap.to(groupRef.current.position, {
        duration: 0.3,
        x: offsetX,
        y: offsetY,
        z: 0.1,
        ease: "power2.out",
      });

      gsap.to(groupRef.current.scale, {
        duration: 0.3,
        x: 1.05,
        y: 1.05,
        z: 1.1,
        ease: "power2.out",
      });
    }
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    if (groupRef.current) {
      gsap.to(groupRef.current.position, {
        duration: 0.3,
        x: 0,
        y: 0,
        z: 0,
        ease: "power2.out",
      });

      gsap.to(groupRef.current.scale, {
        duration: 0.3,
        x: 1,
        y: 1,
        z: 1,
        ease: "power2.out",
      });
    }
  };

  // Calculate label position
  const midAngle = (startAngle + endAngle) / 2;
  const labelRadius = outerRadius + labelDistance;
  const labelX = Math.cos(midAngle) * labelRadius;
  const labelY = Math.sin(midAngle) * labelRadius;

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        position={[0, 0, -thickness / 2]}
        castShadow
        receiveShadow
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        userData={{
          dataPoint,
          originalColor: color,
          originalPosition: new Vector3(0, 0, 0),
          isAnimating: false,
        }}
      />

      {/* Label */}
      {showLabels && (
        <group>
          <Text
            position={[labelX, labelY, thickness / 2 + 0.1]}
            fontSize={0.3}
            color={defaultChartTheme.textColor}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {dataPoint.name}
          </Text>
          <Text
            position={[labelX, labelY - 0.4, thickness / 2 + 0.1]}
            fontSize={0.25}
            color={defaultChartTheme.textColor}
            anchorX="center"
            anchorY="middle"
          >
            {percentage.toFixed(1)}%
          </Text>
          <Text
            position={[labelX, labelY - 0.7, thickness / 2 + 0.1]}
            fontSize={0.2}
            color={color}
            anchorX="center"
            anchorY="middle"
          >
            {dataPoint.value.toLocaleString()}
          </Text>
        </group>
      )}

      {/* Connection line for labels */}
      {showLabels && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                Math.cos(midAngle) * (outerRadius + 0.1), Math.sin(midAngle) * (outerRadius + 0.1), thickness / 2,
                labelX - Math.cos(midAngle) * 0.3, labelY - Math.sin(midAngle) * 0.3, thickness / 2,
              ]), 3]}
              count={2}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} opacity={0.6} transparent />
        </line>
      )}
    </group>
  );
};

// Pie Chart Content component
const PieChartContent: React.FC<{
  data: ChartDataPoint[];
  innerRadius: number;
  outerRadius: number;
  thickness: number;
  startAngle: number;
  endAngle: number;
  showLabels: boolean;
  labelDistance: number;
  theme: ChartTheme;
}> = ({ 
  data, 
  innerRadius, 
  outerRadius, 
  thickness, 
  startAngle, 
  endAngle,
  showLabels,
  labelDistance,
  theme 
}) => {
  // Calculate total value and percentages
  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.value, 0), 
    [data]
  );

  const pieSlices = useMemo(() => {
    let currentAngle = degToRad(startAngle);
    const totalAngleSpan = degToRad(endAngle - startAngle);

    return data.map((dataPoint, index) => {
      const percentage = (dataPoint.value / total) * 100;
      const angleSpan = (dataPoint.value / total) * totalAngleSpan;
      const sliceEndAngle = currentAngle + angleSpan;
      
      const color = dataPoint.color || getColorFromPalette(index, theme.accentColors);

      const slice = (
        <PieSlice
          key={`slice-${index}-${dataPoint.name}`}
          dataPoint={dataPoint}
          startAngle={currentAngle}
          endAngle={sliceEndAngle}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          thickness={thickness}
          color={color}
          index={index}
          percentage={percentage}
          showLabels={showLabels}
          labelDistance={labelDistance}
        />
      );

      currentAngle = sliceEndAngle;
      return slice;
    });
  }, [data, total, innerRadius, outerRadius, thickness, startAngle, endAngle, showLabels, labelDistance, theme.accentColors]);

  // Center label showing total
  const centerLabel = useMemo(() => {
    if (innerRadius > 1) {
      return (
        <group>
          <Text
            position={[0, 0.3, thickness / 2 + 0.2]}
            fontSize={0.4}
            color={theme.textColor}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            Total
          </Text>
          <Text
            position={[0, -0.3, thickness / 2 + 0.2]}
            fontSize={0.5}
            color={theme.primaryColor}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {total.toLocaleString()}
          </Text>
        </group>
      );
    }
    return null;
  }, [innerRadius, thickness, total, theme.textColor, theme.primaryColor]);

  return (
    <group>
      {pieSlices}
      {centerLabel}
    </group>
  );
};

// Main Three.js Pie Chart component
export const ThreePieChart: React.FC<PieChartProps> = ({
  data,
  innerRadius = 0,
  outerRadius = 3,
  thickness = 0.5,
  startAngle = 0,
  endAngle = 360,
  showLabels = true,
  labelDistance = 1,
  width = 800,
  height = 600,
  theme = {},
  camera = { position: [0, 0, 12] },
  className,
  ...props
}) => {
  // Validate and prepare data
  const validData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      // Pie chart data must be a non-empty array
      return [];
    }
    return data.filter(item => 
      item && 
      typeof item.value === 'number' && 
      !isNaN(item.value) && 
      item.value > 0 &&
      item.name
    );
  }, [data]);

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
      <PieChartContent
        data={validData}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        thickness={thickness}
        startAngle={startAngle}
        endAngle={endAngle}
        showLabels={showLabels}
        labelDistance={labelDistance}
        theme={mergedTheme}
      />
    </BaseThreeChart>
  );
};

export default ThreePieChart;