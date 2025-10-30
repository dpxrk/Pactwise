export const pactwiseChartTheme = {
  colors: {
    // Executive-grade primary palette - sophisticated and data-driven
    primary: ['#0F172A', '#1E293B', '#334155', '#475569', '#64748B', '#94A3B8'],
    secondary: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B'],
    
    // Brand colors - refined for executive presentations
    brand: {
      black: '#000000',
      darkPurple: '#291528',
      blackOlive: '#3a3e3b',
      ghostWhite: '#f0eff4',
      mountbattenPink: '#9e829c',
      slate: '#0F172A',
      primary: '#2563EB'
    },
    
    // Semantic colors - professional and clear
    success: '#10B981',
    successLight: '#D1FAE5',
    successDark: '#047857',
    
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#D97706',
    
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    dangerDark: '#DC2626',
    
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    infoDark: '#1D4ED8',
    
    // Premium chart color palette - Purple/Pink brand colors for executive readability
    categorical: [
      '#291528', // chart-1: purple-900 - Dark Purple - Primary data series
      '#9e829c', // chart-2: purple-500 - Mountbatten Pink - Secondary data series
      '#dab5d5', // chart-3: purple-300 - Light Purple - Tertiary data series
      '#7d5c7b', // chart-4: purple-600 - Medium Purple - Quaternary data series
      '#644862', // chart-5: purple-700 - Purple variant - Quinary data series
      '#c388bb', // purple-400 - Light pink variant
      '#533e52', // purple-800 - Dark purple variant
      '#3a3e3b', // Black Olive - Additional series
    ],
    
    // Premium gradients - subtle and sophisticated
    gradients: {
      primary: 'linear-gradient(180deg, #2563EB 0%, rgba(37, 99, 235, 0.05) 100%)',
      secondary: 'linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.05) 100%)',
      success: 'linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.08) 100%)',
      warning: 'linear-gradient(180deg, #F59E0B 0%, rgba(245, 158, 11, 0.08) 100%)',
      danger: 'linear-gradient(180deg, #EF4444 0%, rgba(239, 68, 68, 0.08) 100%)',
      brand: 'linear-gradient(135deg, #0F172A 0%, #2563EB 50%, #F8FAFC 100%)',
      mesh: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)',
      card: 'linear-gradient(to bottom right, #FFFFFF 0%, #F8FAFC 100%)',
    },
    
    // Heatmap color scale
    heatmap: {
      low: '#F3F4F6',
      medium: '#9e829c',
      high: '#291528',
      critical: '#DC2626'
    }
  },
  
  animations: {
    // Timing functions
    duration: {
      fast: 200,
      normal: 500,
      slow: 1000,
      morph: 750 // For chart type transitions
    },
    
    // Easing functions
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    },
    
    // Stagger delays for sequential animations
    stagger: {
      fast: 50,
      normal: 100,
      slow: 200
    }
  },
  
  grid: {
    stroke: '#E2E8F0',
    strokeWidth: 0.5,
    strokeDasharray: '4 4',
    opacity: 0.3,
    // Alternative grid styles - refined for premium look
    styles: {
      solid: { strokeDasharray: 'none', opacity: 0.15, strokeWidth: 0.5 },
      dashed: { strokeDasharray: '4 4', opacity: 0.3, strokeWidth: 0.5 },
      dotted: { strokeDasharray: '1 4', opacity: 0.25, strokeWidth: 0.5 },
      none: { stroke: 'transparent', opacity: 0 }
    }
  },
  
  axis: {
    stroke: '#CBD5E1',
    strokeWidth: 1,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    color: '#64748B',
    letterSpacing: '0.01em',
    // Tick styling
    tick: {
      size: 4,
      stroke: '#CBD5E1',
      strokeWidth: 0.5
    }
  },
  
  tooltip: {
    background: 'rgba(255, 255, 255, 0.98)',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '16px',
    fontSize: 13,
    color: '#0F172A',
    boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(20px)',
    // Content styling
    label: {
      fontWeight: 600,
      fontSize: '11px',
      color: '#64748B',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '8px'
    },
    value: {
      fontWeight: 700,
      fontSize: 18,
      color: '#0F172A',
      letterSpacing: '-0.01em'
    }
  },
  
  legend: {
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    itemMargin: '0 16px',
    iconSize: 10,
    iconType: 'circle' as const,
    verticalAlign: 'bottom' as const,
    align: 'center' as const,
    letterSpacing: '0.02em'
  },
  
  dataPoint: {
    radius: {
      default: 4,
      hover: 6,
      selected: 8
    },
    strokeWidth: 2,
    stroke: '#FFFFFF',
    // Glow effect for emphasis
    glow: {
      blur: 8,
      opacity: 0.6,
      color: 'currentColor'
    }
  },
  
  bar: {
    radius: [6, 6, 0, 0], // Refined top rounded corners
    maxBarSize: 48,
    minBarGap: 12,
    // Subtle depth for premium look
    depth: {
      offset: 2,
      opacity: 0.08
    }
  },
  
  pie: {
    innerRadius: '0%',
    outerRadius: '80%',
    padAngle: 2,
    cornerRadius: 4,
    // 3D effect properties
    extrusion: {
      depth: 10,
      opacity: 0.8
    },
    label: {
      fontSize: 12,
      fontWeight: 500,
      offset: 20
    }
  },
  
  area: {
    fillOpacity: 0.2,
    strokeWidth: 2,
    activeDot: {
      r: 6,
      strokeWidth: 2
    }
  },
  
  line: {
    strokeWidth: 2.5,
    dot: {
      fill: '#FFFFFF',
      strokeWidth: 2.5,
      r: 3
    },
    activeDot: {
      r: 5,
      strokeWidth: 3,
      fill: '#FFFFFF'
    }
  },
  
  // Special effects
  effects: {
    // Glass morphism
    glass: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    
    // Neon glow
    neon: {
      filter: 'drop-shadow(0 0 20px currentColor)',
      opacity: 0.8
    },
    
    // Holographic
    holographic: {
      background: 'linear-gradient(45deg, transparent 30%, rgba(158, 130, 156, 0.1) 50%, transparent 70%)',
      animation: 'holographic 3s ease-in-out infinite'
    }
  },
  
  // Responsive breakpoints
  responsive: {
    mobile: {
      fontSize: 10,
      margin: { top: 10, right: 10, bottom: 60, left: 10 }
    },
    tablet: {
      fontSize: 11,
      margin: { top: 20, right: 20, bottom: 80, left: 20 }
    },
    desktop: {
      fontSize: 12,
      margin: { top: 20, right: 30, bottom: 80, left: 40 }
    }
  }
};

// Helper function to get chart colors based on data type
export const getChartColors = (dataType: 'categorical' | 'sequential' | 'diverging' | 'status') => {
  switch (dataType) {
    case 'categorical':
      return pactwiseChartTheme.colors.categorical;
    case 'sequential':
      return pactwiseChartTheme.colors.primary;
    case 'diverging':
      return [
        pactwiseChartTheme.colors.danger,
        pactwiseChartTheme.colors.warning,
        '#F3F4F6',
        pactwiseChartTheme.colors.success
      ];
    case 'status':
      return [
        pactwiseChartTheme.colors.success,
        pactwiseChartTheme.colors.warning,
        pactwiseChartTheme.colors.danger,
        pactwiseChartTheme.colors.info
      ];
    default:
      return pactwiseChartTheme.colors.categorical;
  }
};

// Export animation keyframes for use in CSS
export const chartAnimations = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
  
  @keyframes holographic {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes glow {
    0%, 100% { filter: drop-shadow(0 0 4px currentColor); }
    50% { filter: drop-shadow(0 0 12px currentColor); }
  }
`;