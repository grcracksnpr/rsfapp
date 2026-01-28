import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'default' | 'low' | 'medium' | 'high';
  subtitle?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
  className
}: MetricCardProps) {
  const variantStyles = {
    default: 'border-border',
    low: 'border-risk-low/30 bg-risk-low/5',
    medium: 'border-risk-medium/30 bg-risk-medium/5',
    high: 'border-risk-high/30 bg-risk-high/5'
  };

  const valueStyles = {
    default: 'text-foreground',
    low: 'text-risk-low',
    medium: 'text-risk-medium',
    high: 'text-risk-high'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "metric-card",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className={cn(
            "text-2xl font-bold truncate",
            valueStyles[variant]
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
        
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            variant === 'default' ? 'bg-muted' : variantStyles[variant]
          )}>
            <Icon className={cn(
              "w-5 h-5",
              variant === 'default' ? 'text-muted-foreground' : valueStyles[variant]
            )} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
