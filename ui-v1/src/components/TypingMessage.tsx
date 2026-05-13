import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bot, BookOpen } from 'lucide-react';
import { Message } from './MessageItem';
import { Button } from '@/components/ui/button';
import ReferenceModal from './ReferenceModal';

interface TypingMessageProps {
  message: Message;
  onComplete: () => void;
  typingSpeed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({ 
  message, 
  onComplete,
  typingSpeed = 10 // milliseconds per character
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  
  useEffect(() => {
    if (isComplete) return;
    
    if (displayedContent.length < message.content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(message.content.substring(0, displayedContent.length + 1));
      }, typingSpeed);
      
      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
      onComplete();
    }
  }, [displayedContent, message.content, isComplete, onComplete, typingSpeed]);
  
  return (
    <div className="py-8 flex animate-fade-in bg-white/30 dark:bg-slate-900/20 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-auto flex gap-6 px-6">
        <div className="flex-shrink-0 mt-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
            <Bot size={18} />
          </div>
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 dark:border-slate-700/50">
            <p className="whitespace-pre-line text-slate-900 dark:text-slate-100 leading-relaxed">{displayedContent}</p>
            
            {/* {isComplete && message.referenceChunks && message.referenceChunks.length > 0 && (
              <div className="mt-4 flex">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-sm flex items-center gap-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105"
                  onClick={() => setShowReferences(true)}
                >
                  <BookOpen size={16} />
                  <span>View Sources ({message.referenceChunks.length})</span>
                </Button>
              </div>
            )} */}
          </div>
        </div>
      </div>
      
      {message.sources && (
        <ReferenceModal 
          isOpen={showReferences} 
          onClose={() => setShowReferences(false)} 
          sources={message.sources} 
        />
      )}
    </div>
  );
};

export default TypingMessage; 
