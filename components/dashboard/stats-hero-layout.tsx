'use client';

import { LucideIcon, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export interface HeroMetric {
  value: number | string;
  label: string;
  prefix?: string;
  color?: string;
  subtitle?: string;
  onClick?: () => void;
}

export interface QuickStat {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  color?: string;
}

interface StatsHeroLayoutProps {
  heroMetric: HeroMetric;
  quickStats: QuickStat[];
  loading?: boolean;
  className?: string;
}

export default function StatsHeroLayout({
  heroMetric,
  quickStats,
  loading = false,
  className,
}: StatsHeroLayoutProps) {
  if (loading) {
    return (
      <div className={`space-y-4 animate-pulse ${className || ''}`}>
        {/* Hero loading skeleton */}
        <div className="h-32 bg-muted rounded-2xl" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`space-y-4 ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Metric */}
      <motion.div
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 backdrop-blur-sm cursor-pointer"
        whileTap={{ scale: 0.98 }}
        onClick={heroMetric.onClick}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {heroMetric.label}
          </span>
        </div>
        <div
          className={`text-5xl font-bold ${
            heroMetric.color || 'text-foreground'
          }`}
        >
          {heroMetric.prefix}
          {typeof heroMetric.value === 'number'
            ? Math.abs(heroMetric.value).toFixed(2)
            : heroMetric.value}
        </div>
        {heroMetric.subtitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {heroMetric.subtitle}
          </p>
        )}
      </motion.div>

      {/* Quick Stats List */}
      <div className="space-y-2">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileTap={stat.onClick || stat.href ? { scale: 0.98 } : undefined}
            onClick={stat.onClick}
            className={`flex items-center justify-between p-4 rounded-xl bg-background/60 hover:bg-background/80 transition-colors ${
              stat.onClick || stat.href ? 'cursor-pointer active:bg-muted' : ''
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-muted">
                <stat.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {stat.label}
                </div>
                {stat.subtitle && (
                  <div className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </div>
                )}
              </div>
            </div>
            <div
              className={`text-xl font-semibold ${
                stat.color || 'text-foreground'
              }`}
            >
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
