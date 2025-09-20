export const pactwiseChartTheme = {
  colors: {
    // Primary grayscale palette - core of the design system
    primary: ['#111827', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF'],
    secondary: ['#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563'],
    
    // Brand colors from auth pages
    brand: {
      black: '#000000',
      darkPurple: '#291528',
      blackOlive: '#3a3e3b',
      ghostWhite: '#f0eff4',
      mountbattenPink: '#9e829c'
    },
    
    // Semantic colors for data visualization
    success: '#059669',
    successLight: '#D1FAE5',
    successDark: '#065F46',
    
    warning: '#D97706',
    warningLight: '#FEF3C7',
    warningDark: '#92400E',
    
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    dangerDark: '#991B1B',
    
    info: '#0EA5E9',
    infoLight: '#E0F2FE',
    infoDark: '#0C4A6E',
    
    // Chart-specific color sequences
    categorical: [
      '#111827', // gray-900
      '#9e829c', // mountbatten pink
      '#059669', // green-600
      '#291528', // dark purple
      '#D97706', // amber-600
      '#3a3e3b', // black olive
      '#0EA5E9', // sky-500
      '#8B5CF6', // violet-500
    ],
    
    // Gradients for area charts and special effects
    gradients: {
      primary: 'linear-gradient(180deg, #111827 0%, rgba(17, 24, 39, 0.1) 100%)',
      secondary: 'linear-gradient(180deg, #9e829c 0%, rgba(158, 130, 156, 0.1) 100%)',
      success: 'linear-gradient(180deg, #059669 0%, rgba(5, 150, 105, 0.1) 100%)',
      warning: 'linear-gradient(180deg, #D97706 0%, rgba(217, 119, 6, 0.1) 100%)',
      danger: 'linear-gradient(180deg, #DC2626 0%, rgba(220, 38, 38, 0.1) 100%)',
      brand: 'linear-gradient(135deg, #291528 0%, #9e829c 50%, #f0eff4 100%)',
      mesh: 'radial-gradient(circle at 20% 50%, rgba(158, 130, 156, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(41, 21, 40, 0.15) 0%, transparent 50%)',
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
    stroke: '#E5E7EB',
    strokeWidth: 1,
    strokeDasharray: '3 3',
    opacity: 0.5,
    // Alternative grid styles
    styles: {
      solid: { strokeDasharray: 'none', opacity: 0.3 },
      dashed: { strokeDasharray: '3 3', opacity: 0.5 },
      dotted: { strokeDasharray: '1 3', opacity: 0.4 },
      none: { stroke: 'transparent', opacity: 0 }
    }
  },
  
  axis: {
    stroke: '#D1D5DB',
    strokeWidth: 1,
    fontSize: 12,
    fontWeight: 400,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    color: '#6B7280',
    // Tick styling
    tick: {
      size: 5,
      stroke: '#D1D5DB',
      strokeWidth: 1
    }
  },
  
  tooltip: {
    background: 'rgba(17, 24, 39, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: 12,
    color: '#F3F4F6',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(10px)',
    // Content styling
    label: {
      fontWeight: 600,
      marginBottom: '4px'
    },
    value: {
      fontWeight: 700,
      fontSize: 14
    }
  },
  
  legend: {
    fontSize: 12,
    fontWeight: 500,
    color: '#4B5563',
    itemMargin: '0 12px',
    iconSize: 12,
    iconType: 'rect' as const,
    verticalAlign: 'middle' as const
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
    radius: [4, 4, 0, 0], // Top rounded corners
    maxBarSize: 60,
    // 3D effect properties
    depth: {
      offset: 4,
      opacity: 0.2
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
    strokeWidth: 2,
    dot: {
      fill: '#FFFFFF',
      strokeWidth: 2,
      r: 4
    },
    activeDot: {
      r: 6,
      strokeWidth: 3
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
      margin: { top: 10, right: 10, bottom: 40, left: 10 }
    },
    tablet: {
      fontSize: 11,
      margin: { top: 20, right: 20, bottom: 60, left: 20 }
    },
    desktop: {
      fontSize: 12,
      margin: { top: 20, right: 30, bottom: 60, left: 40 }
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