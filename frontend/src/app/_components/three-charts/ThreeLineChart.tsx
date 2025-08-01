'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { 
  Mesh, 
  Vector3, 
  BufferGeometry, 
  LineBasicMaterial, 
  Line,
  CatmullRomCurve3,
  TubeGeometry,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
  DoubleSide
} from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Line as DreiLine } from '@react-three/drei';
import { LineChartProps, ChartDataPoint, ChartSeries } from '@/types/three-charts.types';
import { ChartTheme } from '@/types/common.types';
import { BaseThreeChart } from './BaseThreeChart';
import {
  getColorFromPalette,
  getDataBounds,
  scaleValue,
  hexToThreeColor,
  defaultChartTheme,
  createGradientTexture,
} from '@/lib/three-chart-utils';
// Dynamic import for GSAP to reduce initial bundle size
let gsap: typeof import('gsap').gsap | null = null;
if (typeof window !== 'undefined') {
  import('gsap').then(module => {
    gsap = module.gsap;
  });
}

// Data Point component
const DataPoint: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  dataPoint: ChartDataPoint;
  index: number;
  visible: boolean;
}> = ({ position, color, size, dataPoint, index, visible }) => {
  const meshRef = useRef<Mesh>(null);

  // Animation on mount
  useEffect(() => {
    if (meshRef.current && visible && gsap) {
      meshRef.current.scale.set(0, 0, 0);
      gsap.to(meshRef.current.scale, {
        duration: 0.6,
        x: 1,
        y: 1,
        z: 1,
        delay: index * 0.05,
        ease: "back.out(1.7)",
      });
    }
  }, [visible, index]);

  // Hover animation
  const handlePointerEnter = () => {
    if (meshRef.current && gsap) {
      gsap.to(meshRef.current.scale, {
        duration: 0.3,
        x: 1.5,
        y: 1.5,
        z: 1.5,
        ease: "power2.out",
      });
    }
  };

  const handlePointerLeave = () => {
    if (meshRef.current && gsap) {
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
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial 
        color={hexToThreeColor(color)}
        metalness={0.3}
        roughness={0.4}
        emissive={hexToThreeColor(color)}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
};

// Animated Line component
const AnimatedLine: React.FC<{
  points: Vector3[];
  color: string;
  lineWidth: number;
  smoothCurve: boolean;
  index: number;
}> = ({ points, color, lineWidth, smoothCurve, index }) => {
  const lineRef = useRef<Line | null>(null);
  const [opacity, setOpacity] = React.useState(0);

  // Create line points
  const linePoints = useMemo(() => {
    if (smoothCurve && points.length > 2) {
      // Create smooth curve using CatmullRomCurve3
      const curve = new CatmullRomCurve3(points);
      const curvePoints = curve.getPoints(points.length * 10);
      return curvePoints.map(p => [p.x, p.y, p.z] as [number, number, number]);
    } else {
      return points.map(p => [p.x, p.y, p.z] as [number, number, number]);
    }
  }, [points, smoothCurve]);

  // Animation on mount
  useEffect(() => {
    if (gsap) {
      gsap.to({ value: 0 }, {
        duration: 0.8,
        value: 1,
        delay: index * 0.2,
        ease: "power2.out",
        onUpdate: function() {
          setOpacity(this.targets()[0].value);
        }
      });
    } else {
      // Fallback without animation
      setOpacity(1);
    }
  }, [index]);

  return (
    <DreiLine
      ref={lineRef}
      points={linePoints}
      color={hexToThreeColor(color)}
      lineWidth={lineWidth * 10}
      transparent
      opacity={opacity}
    />
  );
};

// Area fill component (for area charts)
const AreaFill: React.FC<{
  points: Vector3[];
  color: string;
  opacity: number;
  smoothCurve: boolean;
}> = ({ points, color, opacity, smoothCurve }) => {
  const geometry = useMemo(() => {
    if (points.length < 2) return new BufferGeometry();

    const shape = new Shape();
    
    // Start from bottom
    const firstPoint = points[0];
    if (firstPoint) {
      shape.moveTo(firstPoint.x, 0);
    }
    
    if (smoothCurve && points.length > 2) {
      // Create smooth curve
      const curve = new CatmullRomCurve3(points);
      const curvePoints = curve.getPoints(points.length * 10);
      
      curvePoints.forEach((point, index) => {
        if (index === 0) {
          shape.lineTo(point.x, point.y);
        } else {
          shape.lineTo(point.x, point.y);
        }
      });
    } else {
      // Straight lines
      points.forEach((point) => {
        shape.lineTo(point.x, point.y);
      });
    }
    
    // Close the shape at bottom
    const lastPoint = points[points.length - 1];
    const firstPt = points[0];
    if (lastPoint && firstPt) {
      shape.lineTo(lastPoint.x, 0);
      shape.lineTo(firstPt.x, 0);
    }

    return new ShapeGeometry(shape);
  }, [points, smoothCurve]);

  return (
    <mesh geometry={geometry} position={[0, 0, -0.1]}>
      <meshBasicMaterial
        color={hexToThreeColor(color)}
        transparent
        opacity={opacity}
        side={DoubleSide}
      />
    </mesh>
  );
};

// Line Chart Content component
const LineChartContent: React.FC<{
  data: ChartDataPoint[];
  series?: ChartSeries[];
  lineWidth: number;
  pointSize: number;
  showPoints: boolean;
  smoothCurve: boolean;
  showArea: boolean;
  areaOpacity: number;
  maxHeight: number;
  theme: ChartTheme;
}> = ({ 
  data, 
  series,
  lineWidth, 
  pointSize, 
  showPoints, 
  smoothCurve,
  showArea,
  areaOpacity,
  maxHeight,
  theme 
}) => {
  const { min, max } = getDataBounds(data);
  const totalWidth = Math.max(10, data.length * 1.5);

  // Process data for multiple series or single line
  const processedData = useMemo(() => {
    if (series && series.length > 0) {
      // Multiple series
      return series.map((s, seriesIndex) => {
        const color = s.color || getColorFromPalette(seriesIndex, theme.accentColors);
        const points = data.map((dataPoint, index) => {
          const x = (index / (data.length - 1)) * totalWidth - totalWidth / 2;
          const value = dataPoint[s.key] || 0;
          const y = scaleValue(value, min, max, 0, maxHeight);
          return new Vector3(x, y, 0);
        });
        
        return {
          points,
          color,
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
  }, [data, series, totalWidth, min, max, maxHeight, theme.accentColors]);

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
          <DreiLine
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
      const x = (index / (data.length - 1)) * totalWidth - totalWidth / 2;
      lines.push(
        <Text
          key={`label-${index}`}
          position={[x, -0.5, 0]}
          fontSize={0.2}
          color={theme.textColor}
          anchorX="center"
          anchorY="top"
          rotation={[-Math.PI / 6, 0, 0]}
        >
          {dataPoint.name}
        </Text>
      );
    });
    
    return lines;
  }, [data, maxHeight, totalWidth, min, max, theme.gridColor, theme.textColor]);

  return (
    <group>
      {/* Grid lines */}
      {gridLines}
      
      {/* Lines and areas for each series */}
      {processedData.map((seriesData, seriesIndex) => (
        <group key={`series-${seriesIndex}`}>
          {/* Area fill */}
          {showArea && seriesData.visible && (
            <AreaFill
              points={seriesData.points}
              color={seriesData.color}
              opacity={areaOpacity}
              smoothCurve={smoothCurve}
            />
          )}
          
          {/* Line */}
          {seriesData.visible && (
            <AnimatedLine
              points={seriesData.points}
              color={seriesData.color}
              lineWidth={lineWidth}
              smoothCurve={smoothCurve}
              index={seriesIndex}
            />
          )}
          
          {/* Data points */}
          {showPoints && seriesData.visible && seriesData.points.map((point, pointIndex) => {
            const dataPoint = seriesData.dataPoints[pointIndex];
            if (!dataPoint) return null;
            return (
              <DataPoint
                key={`point-${seriesIndex}-${pointIndex}`}
                position={[point.x, point.y, point.z]}
                color={seriesData.color}
                size={pointSize}
                dataPoint={dataPoint}
                index={pointIndex}
                visible={seriesData.visible}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
};

// Main Three.js Line Chart component
export const ThreeLineChart: React.FC<LineChartProps> = ({
  data,
  series,
  lineWidth = 0.05,
  pointSize = 0.1,
  showPoints = true,
  smoothCurve = true,
  showArea = false,
  areaOpacity = 0.3,
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
      // Line chart data must be a non-empty array
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
      <LineChartContent
        data={validData}
        {...(series && { series })}
        lineWidth={lineWidth}
        pointSize={pointSize}
        showPoints={showPoints}
        smoothCurve={smoothCurve}
        showArea={showArea}
        areaOpacity={areaOpacity}
        maxHeight={maxHeight}
        theme={mergedTheme}
      />
    </BaseThreeChart>
  );
};

export default ThreeLineChart;