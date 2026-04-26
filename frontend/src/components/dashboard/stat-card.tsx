'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Color = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'whatsapp' | 'gray';

const colorMap: Record<Color, { bg: string; icon: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-green-500/10', icon: 'text-green-500', text: 'text-green-600 dark:text-green-400' },
  yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
  red: { bg: 'bg-red-500/10', icon: 'text-red-500', text: 'text-red-600 dark:text-red-400' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  whatsapp: { bg: 'bg-green-500/10', icon: 'text-[#25D366]', text: 'text-[#25D366]' },
  gray: { bg: 'bg-gray-500/10', icon: 'text-gray-500', text: 'text-gray-600 dark:text-gray-400' },
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: Color;
  trend?: 'up' | 'down';
  trendValue?: string;
  subtitle?: string;
  loading?: boolean;
  small?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
  subtitle,
  loading,
  small,
  className,
}: StatCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className={cn('pt-4', small ? 'p-4' : 'p-5')}>
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className={cn(small ? 'p-4' : 'p-5')}>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className={cn('text-muted-foreground truncate', small ? 'text-xs' : 'text-sm')}>
              {title}
            </p>
            <p className={cn('font-bold mt-1', small ? 'text-xl' : 'text-3xl')}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={cn(
                'flex items-center gap-1 mt-1 text-xs font-medium',
                trend === 'up' ? 'text-green-500' : 'text-red-500',
              )}>
                {trend === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn('rounded-xl p-2.5 shrink-0', colors.bg)}>
            <Icon className={cn('shrink-0', small ? 'w-4 h-4' : 'w-5 h-5', colors.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
