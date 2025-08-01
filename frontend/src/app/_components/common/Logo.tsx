import Link from 'next/link';

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
}

const sizeClasses: Record<LogoSize, { text: string; dot: string }> = {
  sm: { text: "text-xl", dot: "h-1.5 w-1.5" },
  md: { text: "text-2xl", dot: "h-2 w-2" },
  lg: { text: "text-3xl", dot: "h-2.5 w-2.5" },
  xl: { text: "text-4xl", dot: "h-3 w-3" },
};

export const Logo = ({ size = "md" }: LogoProps) => {
  const sizeClass = sizeClasses[size];

  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1 cursor-pointer"
    >
      <span className={`font-sans font-bold ${sizeClass.text}`}>
        <span style={{ 
          backgroundImage: "linear-gradient(to right, #0A192F, #10b981, #0A192F)", 
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          animation: "gradient 8s ease infinite"
        }}>
          Pact
        </span>
        <span style={{ 
          backgroundImage: "linear-gradient(to right, #14b8a6, #0A192F, #14b8a6)", 
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          animation: "gradient 8s ease infinite 2s"
        }}>
          Wise
        </span>
      </span>

      <div 
        className={`rounded-full ${sizeClass.dot}`} 
        style={{ 
          backgroundColor: "rgba(16, 185, 129, 0.8)", 
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" 
        }} 
      />
    </Link>
  );
};

export default Logo;