import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import sliderAnalytics from '@/assets/slider-analytics.jpg';
import sliderGlobal from '@/assets/slider-global.jpg';
import sliderDashboard from '@/assets/slider-dashboard.jpg';
import sliderSecurity from '@/assets/slider-security.jpg';
import sliderAutomation from '@/assets/slider-automation.jpg';

interface Slide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

const slides: Slide[] = [
  {
    id: 0,
    image: sliderAnalytics,
    title: 'Advanced HR Analytics',
    subtitle: 'Data-Driven Decisions',
    description: 'Leverage real-time workforce analytics to identify trends, reduce attrition, and optimize talent management strategies.',
    badge: 'Analytics',
  },
  {
    id: 1,
    image: sliderGlobal,
    title: 'Global Workforce Insights',
    subtitle: 'Enterprise Scale',
    description: 'Monitor and manage your distributed workforce across regions with unified dashboards and cross-border compliance tools.',
    badge: 'Global',
  },
  {
    id: 2,
    image: sliderDashboard,
    title: 'Interactive Dashboards',
    subtitle: 'Real-Time Monitoring',
    description: 'Customizable dashboards with live KPIs, trend analysis, and predictive metrics for proactive HR management.',
    badge: 'Dashboards',
  },
  {
    id: 3,
    image: sliderSecurity,
    title: 'Enterprise Security',
    subtitle: 'AI-Powered Protection',
    description: 'Bank-grade encryption, role-based access controls, and AI-driven threat detection to safeguard sensitive employee data.',
    badge: 'Security',
  },
  {
    id: 4,
    image: sliderAutomation,
    title: 'Workflow Automation',
    subtitle: 'Intelligent Processes',
    description: 'Automate repetitive HR tasks with smart workflows — from onboarding sequences to performance review cycles.',
    badge: 'Automation',
  },
];

const AUTOPLAY_INTERVAL = 5000;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 1.05,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const textVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.12, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export function FeatureSlider() {
  const [[current, direction], setCurrent] = useState([0, 0]);
  const [isPlaying, setIsPlaying] = useState(true);

  const paginate = useCallback((newDirection: number) => {
    setCurrent(([prev]) => {
      const next = (prev + newDirection + slides.length) % slides.length;
      return [next, newDirection];
    });
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrent(([prev]) => [index, index > prev ? 1 : -1]);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => paginate(1), AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPlaying, paginate]);

  const slide = slides[current];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden glass-card"
      style={{ height: 340 }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Feature highlights"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* Background images */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={slide.id}
          src={slide.image}
          alt=""
          aria-hidden
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading={slide.id === 0 ? 'eager' : 'lazy'}
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-[1]" />

      {/* Content */}
      <div className="relative z-[2] flex flex-col justify-end h-full p-6 md:p-8 max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} className="space-y-3">
            <motion.span
              custom={0}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/80 text-primary-foreground backdrop-blur-sm"
            >
              {slide.badge}
            </motion.span>

            <motion.h2
              custom={1}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="text-2xl md:text-3xl font-bold text-white leading-tight"
            >
              {slide.title}
            </motion.h2>

            <motion.p
              custom={2}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="text-xs uppercase tracking-widest text-white/60 font-medium"
            >
              {slide.subtitle}
            </motion.p>

            <motion.p
              custom={3}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="text-sm text-white/70 leading-relaxed max-w-md"
            >
              {slide.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 right-6 z-[3] flex items-center gap-3">
        {/* Dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide navigation">
          {slides.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              onClick={() => goToSlide(i)}
              className="relative h-2 rounded-full transition-all duration-300"
              style={{ width: i === current ? 24 : 8, background: i === current ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.35)' }}
            >
              {i === current && isPlaying && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary-foreground/30"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: 'linear' }}
                  key={`progress-${current}`}
                />
              )}
            </button>
          ))}
        </div>

        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying((p) => !p)}
          className="glass-button p-1.5 rounded-full"
          aria-label={isPlaying ? 'Pause autoplay' : 'Resume autoplay'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
        </button>

        {/* Prev / Next */}
        <button
          onClick={() => paginate(-1)}
          className="glass-button p-1.5 rounded-full"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="glass-button p-1.5 rounded-full"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Slide counter */}
      <div className="absolute top-5 right-6 z-[3]">
        <span className="text-xs font-mono text-white/40">
          {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
