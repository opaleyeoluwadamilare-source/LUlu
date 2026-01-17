"use client";

import * as React from 'react';
import { motion } from 'framer-motion';

interface TestimonialCardProps {
  handleShuffle: () => void;
  testimonial: string;
  position: "front" | "middle" | "back";
  id: number;
  author: string;
}

export function TestimonialCard({ handleShuffle, testimonial, position, id, author }: TestimonialCardProps) {
  const dragRef = React.useRef<number>(0);
  const isFront = position === "front";
  const [isDragging, setIsDragging] = React.useState(false);
  const [xPosition, setXPosition] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);

  // Get unique sky gradient for each testimonial based on ID
  const getSkyGradient = () => {
    switch(id) {
      case 1: // Sarah - confident, bold (sunset sky with warm clouds)
        return {
          primary: 'rgba(166, 124, 82, 0.9)',    // Warm brown-orange
          secondary: 'rgba(184, 144, 95, 0.85)', // Golden
          accent: 'rgba(196, 149, 111, 0.8)',    // Light peach
          glow: 'rgba(184, 144, 95, 0.6)',
          cloud: 'rgba(255, 255, 255, 0.3)',
        };
      case 2: // Marcus - transformation (deep blue sky with purple clouds)
        return {
          primary: 'rgba(95, 79, 168, 0.9)',     // Deep purple-blue
          secondary: 'rgba(125, 95, 149, 0.85)', // Purple
          accent: 'rgba(61, 74, 143, 0.8)',      // Navy blue
          glow: 'rgba(95, 79, 168, 0.6)',
          cloud: 'rgba(200, 180, 255, 0.25)',
        };
      case 3: // Jamie - thoughtful, recovery (soft blue sky with light clouds)
        return {
          primary: 'rgba(61, 74, 143, 0.9)',     // Navy blue
          secondary: 'rgba(95, 79, 168, 0.85)', // Purple-blue
          accent: 'rgba(125, 95, 149, 0.8)',     // Soft purple
          glow: 'rgba(61, 74, 143, 0.6)',
          cloud: 'rgba(220, 230, 255, 0.3)',
        };
      default:
        return {
          primary: 'rgba(95, 79, 168, 0.9)',
          secondary: 'rgba(125, 95, 149, 0.85)',
          accent: 'rgba(61, 74, 143, 0.8)',
          glow: 'rgba(95, 79, 168, 0.6)',
          cloud: 'rgba(200, 180, 255, 0.25)',
        };
    }
  };

  const skyColors = getSkyGradient();

  React.useEffect(() => {
    const updatePosition = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        if (width < 640) {
          // Mobile
          setXPosition(position === "front" ? 0 : position === "middle" ? 50 : 100);
        } else if (width < 768) {
          // Small tablets
          setXPosition(position === "front" ? 0 : position === "middle" ? 70 : 140);
        } else {
          // Desktop
          setXPosition(position === "front" ? 0 : position === "middle" ? 80 : 160);
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [position]);

  return (
    <motion.div
      style={{
        zIndex: position === "front" ? "2" : position === "middle" ? "1" : "0",
        touchAction: isFront ? 'pan-x' : 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        willChange: isFront ? 'transform' : 'auto',
      }}
      animate={{
        rotate: isDragging ? 0 : (position === "front" ? "-6deg" : position === "middle" ? "0deg" : "6deg"),
        x: isDragging ? undefined : xPosition
      }}
      drag={isFront ? "x" : false}
      dragElastic={0.15}
      dragConstraints={{
        left: -250,
        right: 250
      }}
      dragMomentum={false}
      dragTransition={{ 
        bounceStiffness: 300, 
        bounceDamping: 30,
        power: 0.2,
        timeConstant: 200
      }}
      onDragStart={(event, info) => {
        if (isFront) {
          setIsDragging(true);
          dragRef.current = info.point.x;
          setIsHovered(false);
        }
      }}
      onDrag={(event, info) => {
        // Smooth drag feedback
        if (isFront) {
          // Optional: Add subtle visual feedback during drag
        }
      }}
      onDragEnd={(event, info) => {
        if (isFront) {
          setIsDragging(false);
          const dragDistance = Math.abs(dragRef.current - info.point.x);
          const velocity = Math.abs(info.velocity.x);
          
          // Trigger shuffle if dragged far enough OR with enough velocity (better mobile UX)
          if (dragDistance > 100 || velocity > 500) {
            handleShuffle();
          }
          dragRef.current = 0;
        }
      }}
      whileDrag={{
        scale: 1.03,
        rotate: 0,
        zIndex: 10,
        transition: { duration: 0.2 }
      }}
      transition={{ 
        duration: 0.4, 
        type: "spring", 
        stiffness: 400, 
        damping: 35,
        mass: 0.8
      }}
      className={`absolute left-0 top-0 grid h-[380px] w-[280px] sm:h-[420px] sm:w-[320px] md:h-[450px] md:w-[350px] select-none place-content-center space-y-4 sm:space-y-5 md:space-y-6 rounded-2xl border-2 border-white/30 bg-white/10 p-4 sm:p-5 md:p-6 shadow-2xl backdrop-blur-lg ${
        isFront ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
      }`}
    >
      {/* Glowy Round Glass Avatar Component */}
      <motion.div 
        className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ 
          scale: isDragging ? 1.03 : isHovered && isFront ? 1.15 : 1, 
          opacity: 1 
        }}
        transition={{ 
          duration: 0.5, 
          ease: [0.16, 1, 0.3, 1],
          scale: { type: "spring", stiffness: 400, damping: 25 }
        }}
        onHoverStart={() => isFront && !isDragging && setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        style={{ 
          cursor: isFront ? 'grab' : 'default',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Outer glow rings - sky colors with cloud effects */}
        <motion.div 
          className="absolute -inset-3 sm:-inset-4 rounded-full blur-2xl pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle, ${skyColors.glow} 0%, ${skyColors.secondary}40 30%, ${skyColors.accent}30 60%, transparent 100%)`,
          }}
          animate={{
            opacity: isHovered && isFront ? [0.7, 1, 0.7] : [0.5, 0.7, 0.5],
            scale: isHovered && isFront ? [1, 1.3, 1] : [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -inset-2 sm:-inset-2.5 rounded-full blur-lg pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${skyColors.cloud} 0%, ${skyColors.secondary}50 40%, ${skyColors.primary}40 70%, transparent 100%)`,
          }}
          animate={{
            opacity: isHovered && isFront ? 0.9 : 0.6,
            scale: isHovered && isFront ? 1.15 : 1.05,
            x: [0, 5, 0],
            y: [0, -3, 0],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -inset-1 rounded-full blur-md pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at 70% 70%, ${skyColors.cloud} 0%, ${skyColors.accent}35 50%, transparent 100%)`,
          }}
          animate={{
            opacity: [0.4, 0.6, 0.4],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Glass container with sky gradient backdrop */}
        <motion.div 
          className="relative w-full h-full rounded-full border-2 backdrop-blur-2xl overflow-hidden"
          animate={{
            borderColor: isHovered && isFront 
              ? `rgba(255, 255, 255, 0.6)` 
              : `${skyColors.primary}80`,
            boxShadow: isHovered && isFront 
              ? `inset 0 4px 20px ${skyColors.cloud}, inset 0 -4px 20px rgba(0, 0, 0, 0.3), 0 12px 48px ${skyColors.primary}60, 0 0 0 2px rgba(255, 255, 255, 0.2), 0 0 80px ${skyColors.glow}`
              : `inset 0 2px 10px ${skyColors.cloud}, inset 0 -2px 10px rgba(0, 0, 0, 0.2), 0 8px 32px ${skyColors.primary}50, 0 0 0 1px ${skyColors.secondary}40`
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: `linear-gradient(135deg, ${skyColors.primary} 0%, ${skyColors.secondary} 40%, ${skyColors.accent} 70%, ${skyColors.cloud} 100%)`,
          }}
        >
          {/* Inner sky glow - cloud-like effect */}
          <motion.div 
            className="absolute inset-0 rounded-full pointer-events-none z-10"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${skyColors.cloud} 0%, ${skyColors.secondary}30 40%, transparent 70%)`,
            }}
            animate={{
              opacity: isHovered && isFront ? 0.7 : 0.5,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Cloud shimmer effect - light passing through */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none z-10"
            style={{
              background: `linear-gradient(135deg, transparent 0%, ${skyColors.cloud} 30%, transparent 60%, ${skyColors.cloud} 80%, transparent 100%)`,
            }}
            animate={{
              rotate: [0, 360],
              opacity: isHovered && isFront ? [0.5, 0.7, 0.5] : [0.3, 0.5, 0.3],
            }}
            transition={{
              rotate: {
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              },
              opacity: {
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            }}
          />
          
          {/* Cloud highlight - top light source */}
          <motion.div 
            className="absolute top-0 left-1/4 w-1/2 h-1/3 rounded-full pointer-events-none z-10 blur-sm"
            style={{
              background: `radial-gradient(ellipse, ${skyColors.cloud} 0%, ${skyColors.secondary}40 50%, transparent 100%)`,
            }}
            animate={{
              opacity: isHovered && isFront ? 0.8 : 0.5,
              scale: isHovered && isFront ? 1.3 : 1.1,
              x: [0, 10, 0],
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Sky depth overlay - darker at edges */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none z-10"
            style={{
              background: `radial-gradient(circle at center, transparent 0%, transparent 40%, ${skyColors.primary}15 70%, ${skyColors.accent}25 100%)`
            }}
          />
          
          {/* Floating cloud particles */}
          <motion.div
            className="absolute top-1/4 left-1/3 w-1/4 h-1/4 rounded-full pointer-events-none z-10 blur-md"
            style={{
              background: skyColors.cloud,
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.8, 1.2, 0.8],
              x: [0, 15, 0],
              y: [0, -10, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0,
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-1/5 h-1/5 rounded-full pointer-events-none z-10 blur-md"
            style={{
              background: skyColors.cloud,
            }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [0.7, 1.1, 0.7],
              x: [0, -12, 0],
              y: [0, 8, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
          />
        </motion.div>
      </motion.div>
      <span 
        className="text-center px-2 font-medium leading-relaxed"
        style={{
          fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
          color: 'rgba(255, 255, 255, 0.98)',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)',
          letterSpacing: '0.01em',
          lineHeight: '1.6',
        }}
      >
        "{testimonial}"
      </span>
      <span 
        className="text-center px-2 font-semibold"
        style={{
          fontSize: 'clamp(0.75rem, 2vw, 0.9375rem)',
          color: 'rgba(255, 255, 255, 0.95)',
          textShadow: '0 1px 4px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.25)',
          letterSpacing: '0.02em',
          marginTop: '0.5rem',
        }}
      >
        {author}
      </span>
    </motion.div>
  );
}

interface Testimonial {
  id: number;
  testimonial: string;
  author: string;
}

interface ShuffleCardsProps {
  testimonials: Testimonial[];
}

export function ShuffleCards({ testimonials }: ShuffleCardsProps) {
  const [positions, setPositions] = React.useState<("front" | "middle" | "back")[]>(["front", "middle", "back"]);

  const handleShuffle = () => {
    const newPositions = [...positions];
    newPositions.unshift(newPositions.pop()!);
    setPositions(newPositions);
  };

  return (
    <div 
      className="relative h-[380px] sm:h-[420px] md:h-[450px] w-full flex justify-center items-center" 
      style={{ 
        overflow: 'visible', 
        touchAction: 'pan-y pinch-zoom',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div 
        className="relative h-[380px] w-[280px] sm:h-[420px] sm:w-[320px] md:h-[450px] md:w-[350px] -ml-[60px] sm:-ml-[80px] md:-ml-[100px]"
        style={{
          willChange: 'transform',
        }}
      >
        {testimonials.map((testimonial, index) => (
          <TestimonialCard
            key={testimonial.id}
            {...testimonial}
            handleShuffle={handleShuffle}
            position={positions[index]}
          />
        ))}
      </div>
    </div>
  );
}