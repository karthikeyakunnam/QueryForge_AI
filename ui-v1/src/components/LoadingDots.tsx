
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingDotsProps {
  className?: string;
  color?: string;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ 
  className, 
  color = 'bg-slate-600 dark:bg-slate-400' 
}) => {
  return (
    <div className={cn('flex items-center space-x-1.5', className)}>
      <div className={cn('w-2 h-2 rounded-full animate-loading-dot-1', color)} />
      <div className={cn('w-2 h-2 rounded-full animate-loading-dot-2', color)} />
      <div className={cn('w-2 h-2 rounded-full animate-loading-dot-3', color)} />
    </div>
  );
};

export default LoadingDots;
