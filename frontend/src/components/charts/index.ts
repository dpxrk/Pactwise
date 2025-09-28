// ApexCharts Components - Premium charts with better performance
export { ApexLineChart as PremiumLineChart } from './ApexLineChart';
export { ApexBarChart as PremiumBarChart } from './ApexBarChart';
export { ApexAreaChart as PremiumAreaChart } from './ApexAreaChart';
export { ApexPieChart as PremiumPieChart } from './ApexPieChart';

// Direct ApexCharts exports
export { ApexLineChart } from './ApexLineChart';
export { ApexBarChart } from './ApexBarChart';
export { ApexAreaChart } from './ApexAreaChart';
export { ApexPieChart } from './ApexPieChart';

// Chart Controls
export { ChartControls } from './ChartControls';
export { InteractiveLegend } from './InteractiveLegend';

// ApexCharts Types
export type { LineChartDataPoint, LineChartSeries } from './ApexLineChart';
export type { BarChartDataPoint, BarChartSeries } from './ApexBarChart';
export type { AreaChartDataPoint, AreaChartSeries } from './ApexAreaChart';
export type { PieChartDataPoint } from './ApexPieChart';

// Control Types
export type { SeriesConfig, ChartControlConfig } from './ChartControls';
export type { LegendItem } from './InteractiveLegend';

// Theme and utilities
export { pactwiseChartTheme, getChartColors, chartAnimations } from './chartTheme';
export { default as pactwiseApexTheme, createPremiumTooltip, createGradientFill } from './apexTheme';