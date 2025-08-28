import React from 'react';
import { motion } from 'framer-motion';

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
  strokeWidth?: number;
}

export default function CircularTimer({ 
  timeLeft, 
  totalTime, 
  size = 80, 
  strokeWidth = 6 
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.max(0, Math.min(1, timeLeft / totalTime));
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on remaining time percentage
  const getColor = () => {
    if (progress > 0.6) return '#00D9FF'; // electric-cyan
    if (progress > 0.3) return '#FFB800'; // warning yellow
    return '#FF4444'; // danger red
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ 
            duration: 0.3,
            ease: "easeInOut"
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${getColor()}40)`
          }}
        />
      </svg>
      
      {/* Timer text in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-white font-futuristic font-bold text-lg leading-none"
          animate={{ 
            color: getColor(),
            scale: timeLeft <= 10 && timeLeft > 0 ? [1, 1.1, 1] : 1 
          }}
          transition={{ 
            scale: { duration: 0.5, repeat: timeLeft <= 10 && timeLeft > 0 ? Infinity : 0 }
          }}
        >
          {Math.ceil(timeLeft)}
        </motion.span>
        <span className="text-white/50 text-[8px] font-futuristic tracking-widest mt-0.5">
          TIMER
        </span>
      </div>
    </div>
  );
}
