"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.75, 0.95] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[50rem] md:h-[70rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        background: "linear-gradient(to bottom, #0a0e27 0%, #1a1f3a 15%, #2a2f4a 30%, #3a4f6a 45%, #5a7f9a 60%, #7aafca 75%, #aad5ea 85%, #d0e8f5 92%, #ffffff 100%)",
        boxShadow: "0 0 rgba(0, 0, 0, 0.3), 0 9px 20px rgba(0, 0, 0, 0.29), 0 37px 37px rgba(0, 0, 0, 0.26), 0 84px 50px rgba(0, 0, 0, 0.15), 0 149px 60px rgba(0, 0, 0, 0.04), 0 233px 65px rgba(0, 0, 0, 0.01), inset 0 0 100px rgba(255, 255, 255, 0.05)",
      }}
      className="max-w-5xl -mt-12 mx-auto h-[38rem] sm:h-[42rem] md:h-[50rem] lg:h-[55rem] w-full border-2 border-white/30 p-2 sm:p-4 md:p-6 rounded-[30px] shadow-2xl backdrop-blur-lg overflow-hidden relative"
    >
      <div 
        className="h-full w-full overflow-y-auto overflow-x-hidden rounded-2xl md:rounded-2xl md:p-6 p-4 scrollbar-hide relative"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Subtle top fade overlay - positioned at scroll container edge */}
        <div 
          className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
          style={{
            height: '70px',
            background: 'linear-gradient(to bottom, #0a0e27 0%, rgba(10, 14, 39, 0.97) 12%, rgba(10, 14, 39, 0.88) 25%, rgba(10, 14, 39, 0.7) 40%, rgba(10, 14, 39, 0.5) 55%, rgba(10, 14, 39, 0.3) 70%, rgba(10, 14, 39, 0.15) 85%, transparent 100%)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            mixBlendMode: 'normal',
            borderRadius: '0.75rem 0.75rem 0 0',
          }}
        />
        
        {/* Subtle bottom fade overlay - positioned at scroll container edge */}
        <div 
          className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none"
          style={{
            height: '50px',
            background: 'linear-gradient(to top, #ffffff 0%, rgba(255, 255, 255, 0.96) 15%, rgba(255, 255, 255, 0.85) 30%, rgba(255, 255, 255, 0.65) 50%, rgba(255, 255, 255, 0.4) 70%, rgba(255, 255, 255, 0.2) 85%, transparent 100%)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            mixBlendMode: 'normal',
            borderRadius: '0 0 0.75rem 0.75rem',
          }}
        />
        
        {children}
      </div>
    </motion.div>
  );
};
