import React, { useState, useRef, useEffect } from 'react';
import { usePDF } from '@/context/PDFContext';
import { Send, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { streamQueryPDF } from '@/utils/pdfUtils';
import { toast } from 'sonner';
import LoadingDots from './LoadingDots';
import MessageItem, { Message } from './MessageItem';
import TypingIndicator from './TypingIndicator';
import ThemeToggle from './ThemeToggle';
import { ChatMessage, SourceCitation } from '@/types/rag';

const ChatInterface: React.FC = () => {
  const { pdfName, documentId, resetPdfContext, isProcessing: isPdfProcessing } = usePDF();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMessageSending, setIsMessageSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamStage, setStreamStage] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Derived state to determine if the interface should be disabled
  const isInterfaceDisabled = isPdfProcessing || isMessageSending;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Focus the input field when the component mounts
    inputRef.current?.focus();
  }, []);

  const buildConversation = (items: Message[]): ChatMessage[] =>
    items
      .filter((message) => message.content.trim())
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.content }));

  const handleSendMessage = async (overrideQuery?: string) => {
    const query = (overrideQuery || inputValue).trim();
    if (!query || isInterfaceDisabled || !documentId) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: query,
      role: 'user',
      timestamp: new Date()
    };
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      sources: [],
      confidence: 0,
      isStreaming: true
    };
    
    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    setInputValue('');
    setIsMessageSending(true);
    setLastFailedMessage(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    
    try {
      setIsTyping(true);
      await streamQueryPDF({
        query: userMessage.content,
        documentId,
        messages: buildConversation(messages),
        signal: abortRef.current.signal,
        onStatus: setStreamStage,
        onSources: (sources: SourceCitation[], confidence: number) => {
          setMessages(prev => prev.map(message => (
            message.id === assistantId ? { ...message, sources, confidence } : message
          )));
        },
        onToken: (token: string) => {
          setMessages(prev => prev.map(message => (
            message.id === assistantId ? { ...message, content: message.content + token } : message
          )));
        },
        onDone: (payload) => {
          setMessages(prev => prev.map(message => (
            message.id === assistantId
              ? {
                  ...message,
                  content: payload.response || message.content,
                  sources: payload.sources || message.sources,
                  confidence: payload.confidence,
                  isStreaming: false
                }
              : message
          )));
        },
        onError: (message: string) => {
          throw new Error(message);
        }
      });
    } catch (error) {
      console.error('Error querying PDF:', error);
      setLastFailedMessage(userMessage.content);
      setMessages(prev => prev.map(message => (
        message.id === assistantId
          ? { ...message, content: 'The streaming response failed. You can retry the question.', isStreaming: false }
          : message
      )));
      toast.error('Failed to process your question', {
        description: 'Please retry in a moment'
      });
    } finally {
      setIsMessageSending(false);
      setIsTyping(false);
      setStreamStage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    if (messages.length > 0) {
      const confirmed = window.confirm('Are you sure you want to start a new chat? Your current conversation will be lost.');
      if (!confirmed) return;
    }
    resetPdfContext();
    setMessages([]);
    setIsTyping(false);
    abortRef.current?.abort();
  };

  return (
    <div className="flex flex-col h-screen gradient-bg">
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {/* Modern header with PDF info */}
      <div className="glass-panel border-b border-white/10 dark:border-slate-800/50 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Chat with PDF</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                {pdfName}
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleReset}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            disabled={isInterfaceDisabled}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Message history */}
      <div className="flex-grow overflow-y-auto">
        {messages.length === 0 && !isTyping ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center animate-float">
                <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">Ready to chat!</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md text-lg leading-relaxed mb-6">
              {isPdfProcessing ? 
                "Your PDF is being processed. This will just take a moment..." : 
                "Your PDF is ready! Ask any questions about its content and get intelligent answers."
              }
            </p>
            
            {isPdfProcessing ? (
              <div className="flex items-center space-x-3">
                <LoadingDots className="text-blue-600" />
                <span className="text-slate-600 dark:text-slate-400">Processing...</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                <div className="px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                  💡 Try asking "What is this document about?"
                </div>
                <div className="px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm">
                  🔍 "Summarize the key points"
                </div>
                <div className="px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm">
                  ❓ "Ask specific questions"
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pb-24">
            {messages.map((message, index) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                isLatest={index === messages.length - 1} 
              />
            ))}
            
            {isTyping && messages[messages.length - 1]?.content.length === 0 && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Modern input area */}
      <div className="glass-panel border-t border-white/10 dark:border-slate-800/50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className={`glass-input rounded-2xl overflow-hidden flex items-end transition-all duration-200 ${isPdfProcessing ? 'opacity-70' : ''}`}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isPdfProcessing ? "PDF is being processed..." : "Ask a question about your PDF..."}
              className="w-full resize-none p-4 focus:outline-none bg-transparent min-h-[60px] max-h-[200px] text-base placeholder:text-slate-500 dark:placeholder:text-slate-400"
              rows={1}
              disabled={isInterfaceDisabled}
            />
            <div className="p-3 flex-shrink-0">
              <Button
                onClick={() => handleSendMessage()}
                size="icon"
                disabled={!inputValue.trim() || isInterfaceDisabled}
                className="btn-primary h-12 w-12 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isMessageSending ? (
                  <LoadingDots color="bg-white" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-4">
              <span>Press Enter to send</span>
              <span>•</span>
              <span>Shift + Enter for new line</span>
            </div>
            <div>
              {isPdfProcessing 
                ? "Processing your PDF..." 
                : streamStage
                  ? `Streaming: ${streamStage}`
                  : "AI responses based on your PDF content"
              }
            </div>
          </div>
          {lastFailedMessage && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleSendMessage(lastFailedMessage)} disabled={isInterfaceDisabled}>
                Retry last question
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
