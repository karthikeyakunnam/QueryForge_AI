import React from 'react';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import LoadingDots from './LoadingDots';

interface TypingIndicatorProps {
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className }) => {
  return (
    <div className={cn("py-8 flex animate-fade-in bg-white/30 dark:bg-slate-900/20 backdrop-blur-sm", className)}>
      <div className="w-full max-w-4xl mx-auto flex gap-6 px-6">
        <div className="flex-shrink-0 mt-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
            <Bot size={18} />
          </div>
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 dark:border-slate-700/50">
            <div className="flex items-center space-x-3">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Assistant is thinking</span>
              <LoadingDots className="text-emerald-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator; 