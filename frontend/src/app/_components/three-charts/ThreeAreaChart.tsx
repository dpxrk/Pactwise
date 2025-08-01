'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { 
  Mesh, 
  Vector3, 
  BufferGeometry, 
  MeshStandardMaterial,
  CatmullRomCurve3,
  Float32BufferAttribute,
  DoubleSide
} from 'three';
import { Text, Line } from '@react-three/drei';
import { AreaChartProps, ChartDataPoint, ChartSeries } from '@/types/three-charts.types';
import { ChartTheme } from '@/types/common.types';
import { BaseThreeChart } from './BaseThreeChart';
import {
  getColorFromPalette,
  getDataBounds,
  scaleValue,
  hexToThreeColor,
  defaultChartTheme,
  lightenColor,
} from '@/lib/three-chart-utils';
import gsap from 'gsap';

// Data Point component (reused from LineChart but smaller)
const DataPoint: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  dataPoint: ChartDataPoint;
  index: number;
  visible: boolean;
}> = ({ position, color, size, dataPoint, index, visible }) => {
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    if (meshRef.current && visible) {
      meshRef.current.scale.set(0, 0, 0);
      gsap.to(meshRef.current.scale, {
        duration: 0.6,
        x: 1,
        y: 1,
        z: 1,
        delay: index * 0.03,
        ease: "back.out(1.7)",
      });
    }
  }, [visible, index]);

  const handlePointerEnter = () => {
    if (meshRef.current) {
      gsap.to(meshRef.current.scale, {
        duration: 0.3,
        x: 1.3,
        y: 1.3,
        z: 1.3,
        ease: "power2.out",
      });
    }
  };

  const handlePointerLeave = () => {
    if (meshRef.current) {
      gsap.to(meshRef.current.scale, {
        duration: 0.3,
        x: 1,
        y: 1,
        z: 1,
        ease: "power2.out",
      });
    }
  };

  if (!visible) return null;

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      userData={{
        dataPoint,
        originalColor: color,
        originalPosition: new Vector3(...position),
        isAnimating: false,
      }}
    >
      <sphereGeometry args={[size, 12, 12]} />
      <meshStandardMaterial 
        color={hexToThreeColor(color)}
        metalness={0.4}
        roughness={0.3}
        emissive={hexToThreeColor(color)}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

// Animated Area Fill component
const AnimatedAreaFill: React.FC<{
  points: Vector3[];
  color: string;
  opacity: number;
  smoothCurve: boolean;
  index: number;
  stackedAreas: boolean;
}> = ({ points, color, opacity, smoothCurve, index, stackedAreas }) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  const geometry = useMemo(() => {
    if (points.length < 2) return new BufferGeometry();

    let curvePoints: Vector3[];
    
    if (smoothCurve && points.length > 2) {
      const curve = new CatmullRomCurve3(points);
      curvePoints = curve.getPoints(points.length * 8);
    } else {
      curvePoints = points;
    }

    // Create vertices for the area
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Add top line vertices
    curvePoints.forEach((point, i) => {
      vertices.push(point.x, point.y, point.z);
      uvs.push(i / (curvePoints.length - 1), 1);
    });

    // Add bottom line vertices (at y = 0)
    curvePoints.forEach((point, i) => {
      vertices.push(point.x, 0, point.z);
      uvs.push(i / (curvePoints.length - 1), 0);
    });

    // Create triangles
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const topLeft = i;
      const topRight = i + 1;
      const bottomLeft = i + curvePoints.length;
      const bottomRight = i + 1 + curvePoints.length;

      // First triangle
      indices.push(topLeft, bottomLeft, topRight);
      // Second triangle
      indices.push(topRight, bottomLeft, bottomRight);
    }

    const geometry = new BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
  }, [points, smoothCurve]);

  // Create gradient material
  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: hexToThreeColor(color),
      transparent: true,
      opacity: opacity,
      side: DoubleSide,
      metalness: 0.1,
      roughness: 0.8,
    });
  }, [color, opacity]);

  // Animation on mount
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.opacity = 0;
      gsap.to(materialRef.current, {
        duration: 1,
        opacity: opacity,
        delay: index * 0.3,
        ease: "power2.out",
      });
    }

    if (meshRef.current) {
      meshRef.current.scale.set(1, 0, 1);
      gsap.to(meshRef.current.scale, {
        duration: 1,
        y: 1,
        delay: index * 0.3,
        ease: "power2.out",
      });
    }
  }, [opacity, index]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      receiveShadow
    />
  );
};

// Area Chart Content component
const AreaChartContent: React.FC<{
  data: ChartDataPoint[];
  series?: ChartSeries[];
  opacity: number;
  showPoints: boolean;
  pointSize: number;
  smoothCurve: boolean;
  stackedAreas: boolean;
  maxHeight: number;
  theme: ChartTheme;
}> = ({ 
  data, 
  series,
  opacity, 
  showPoints, 
  pointSize, 
  smoothCurve,
  stackedAreas,
  maxHeight,
  theme 
}) => {
  const { min, max } = getDataBounds(data);
  const totalWidth = Math.max(10, data.length * 1.5);

  // Process data for multiple series or single area
  const processedData = useMemo(() => {
    if (series && series.length > 0) {
      const cumulativeData: number[] = new Array(data.length).fill(0);
      
      return series.map((s, seriesIndex) => {
        const color = s.color || getColorFromPalette(seriesIndex, theme.accentColors);
        const points = data.map((dataPoint, index) => {
          const x = (index / (data.length - 1)) * totalWidth - totalWidth / 2;
          const value = dataPoint[s.key] || 0;
          
          let y: number;
          if (stackedAreas) {
            // For stacked areas, add to cumulative value
            cumulativeData[index] += value;
            y = scaleValue(cumulativeData[index]!, min, max + Math.max(...cumulativeData), 0, maxHeight);
          } else {
            y = scaleValue(value, min, max, 0, maxHeight);
          }
          
          return new Vector3(x, y, 0);
        });
        
        return {
          points,
          color: stackedAreas ? lightenColor(color, seriesIndex * 0.1) : color,
          name: s.name,
          visible: s.visible,
          dataPoints: data.map(d => ({ ...d, value: d[s.key] || 0 })),
        };
      });
    } else {
      // Single series
      const color = getColorFromPalette(0, theme.accentColors);
      const points = data.map((dataPoint, index) => {
        const x = (index / (data.length - 1)) * totalWidth - totalWidth / 2;
        const y = scaleValue(dataPoint.value, min, max, 0, maxHeight);
        return new THREE.Vector3(x, y, 0);
      });
      
      return [{
        points,
        color,
        name: 'Value',
        visible: true,
        dataPoints: data,
      }];
    }
  }, [data, series, totalWidth, min, max, maxHeight, theme.accentColors, stackedAreas]);

  // Create grid lines
  const gridLines = useMemo(() => {
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
    
    // X-axis labels
    data.forEach((dataPoint, index) => {
      if (index % Math.max(1, Math.floor(data.length / 8)) === 0) {
        const x = (index / (data.length - 1)) * totalWidth - totalWidth / 2;
        lines.push(
          <Text
            key={`label-${index}`}
            position={[x, -0.5, 0]}
            fontSize={0.18}
            color={theme.textColor}
            anchorX="center"
            anchorY="top"
            rotation={[-Math.PI / 6, 0, 0]}
          >
            {dataPoint.name}
          </Text>
        );
      }
    });
    
    return lines;
  }, [data, maxHeight, totalWidth, min, max, theme.gridColor, theme.textColor]);

  return (
    <group>
      {/* Grid lines */}
      {gridLines}
      
      {/* Areas for each series */}
      {processedData.map((seriesData, seriesIndex) => (
        <group key={`series-${seriesIndex}`}>
          {/* Area fill */}
          {seriesData.visible && (
            <AnimatedAreaFill
              points={seriesData.points}
              color={seriesData.color}
              opacity={opacity}
              smoothCurve={smoothCurve}
              index={seriesIndex}
              stackedAreas={stackedAreas}
            />
          )}
          
          {/* Data points */}
          {showPoints && seriesData.visible && seriesData.points.map((point, pointIndex) => (
            <DataPoint
              key={`point-${seriesIndex}-${pointIndex}`}
              position={[point.x, point.y, point.z + 0.1]}
              color={seriesData.color}
              size={pointSize}
              dataPoint={seriesData.dataPoints[pointIndex] || { value: 0, name: '', category: '' }}
              index={pointIndex}
              visible={seriesData.visible}
            />
          ))}
        </group>
      ))}
    </group>
  );
};

// Main Three.js Area Chart component
export const ThreeAreaChart: React.FC<AreaChartProps> = ({
  data,
  series,
  opacity = 0.7,
  showPoints = false,
  pointSize = 0.08,
  smoothCurve = true,
  stackedAreas = false,
  width = 800,
  height = 600,
  theme = {},
  camera = { position: [15, 8, 15] },
  className,
  ...props
}) => {
  // Validate and prepare data
  const validData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      // Area chart data must be a non-empty array
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
  const maxHeight = 6; // Maximum height for the chart
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
      <AreaChartContent
        data={validData}
        {...(series && { series })}
        opacity={opacity}
        showPoints={showPoints}
        pointSize={pointSize}
        smoothCurve={smoothCurve}
        stackedAreas={stackedAreas}
        maxHeight={maxHeight}
        theme={mergedTheme}
      />
    </BaseThreeChart>
  );
};

export default ThreeAreaChart;