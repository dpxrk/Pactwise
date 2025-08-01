'use client';

import React from 'react';
import BaseThreeChart from './BaseThreeChart';
import { 
  Scene,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
  AxesHelper,
  GridHelper,
  AmbientLight,
  DirectionalLight
} from 'three';

interface DataPoint {
  x: number;
  y: number;
  z?: number;
  label?: string;
  color?: string;
}

interface ThreeScatterChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  showAxes?: boolean;
  pointSize?: number;
  colorScale?: (value: number) => string;
}

export default function ThreeScatterChart({
  data,
  width = 800,
  height = 600,
  showAxes = true,
  pointSize = 0.1,
  colorScale
}: ThreeScatterChartProps) {
  const createScatterPlot = React.useCallback((scene: Scene) => {
    // Create points geometry
    const geometry = new BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    // Calculate bounds
    const bounds = {
      minX: Math.min(...data.map(d => d.x)),
      maxX: Math.max(...data.map(d => d.x)),
      minY: Math.min(...data.map(d => d.y)),
      maxY: Math.max(...data.map(d => d.y)),
      minZ: Math.min(...data.map(d => d.z || 0)),
      maxZ: Math.max(...data.map(d => d.z || 0))
    };

    // Normalize and add points
    data.forEach((point, index) => {
      const x = ((point.x - bounds.minX) / (bounds.maxX - bounds.minX) - 0.5) * 10;
      const y = ((point.y - bounds.minY) / (bounds.maxY - bounds.minY) - 0.5) * 10;
      const z = point.z ? ((point.z - bounds.minZ) / (bounds.maxZ - bounds.minZ) - 0.5) * 10 : 0;
      
      positions.push(x, y, z);

      // Color
      let color = new Color(0x3b82f6);
      if (point.color) {
        color = new Color(point.color);
      } else if (colorScale) {
        const normalizedValue = (point.y - bounds.minY) / (bounds.maxY - bounds.minY);
        color = new Color(colorScale(normalizedValue));
      }
      
      colors.push(color.r, color.g, color.b);
    });

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

    // Create points material
    const material = new PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: true,
      opacity: 0.8,
      transparent: true
    });

    const points = new Points(geometry, material);
    scene.add(points);

    // Add axes if requested
    if (showAxes) {
      const axesHelper = new AxesHelper(6);
      scene.add(axesHelper);

      // Add grid
      const gridHelper = new GridHelper(10, 10, 0x444444, 0x222222);
      gridHelper.rotation.x = Math.PI / 2;
      scene.add(gridHelper);
    }

    // Add lighting
    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
  }, [data, showAxes, pointSize, colorScale]);

  return (
    <BaseThreeChart
      width={width}
      height={height}
      onSceneSetup={createScatterPlot}
      cameraPosition={[15, 15, 15]}
      enableOrbitControls={true}
      enableZoom={true}
    />
  );
}