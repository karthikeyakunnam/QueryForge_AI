import React from 'react';
import { X, BookOpen, Quote, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SourceCitation } from '@/types/rag';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: SourceCitation[];
}

const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose, sources }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={onClose}>
      <div 
        className="glass-panel rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl animate-slide-in-right border border-white/20 dark:border-slate-700/50" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Source Citations</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Retrieved chunks used as evidence</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-7rem)]">
          <div className="space-y-4">
            {sources.map((source) => (
              <a
                id={`source-${source.citation_id}`}
                href={`#source-${source.citation_id}`}
                key={source.citation_id}
                className="block p-5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl text-sm border border-white/20 dark:border-slate-700/50 shadow-sm hover:border-emerald-400/60 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                    [{source.citation_id}]
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <FileText className="h-4 w-4" />
                    {source.file_name}
                  </span>
                  <span className="text-slate-500">Page {source.page_start}</span>
                  <span className="text-slate-500">Chunk {source.chunk_id}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    Score {Math.round(source.score * 100)}%
                  </span>
                </div>

                {source.highlights.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {source.highlights.map((highlight, index) => (
                      <div key={index} className="flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-amber-900 dark:text-amber-100">
                        <Quote className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed">
                  {source.text}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <span>Dense {Math.round(source.dense_score * 100)}%</span>
                  <span>BM25 {Math.round(source.keyword_score * 100)}%</span>
                  <span>Rerank {Math.round(source.rerank_score * 100)}%</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceModal;
