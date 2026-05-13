
import React, { useEffect } from 'react';
import { usePDF } from '@/context/PDFContext';
import PDFUploader from '@/components/PDFUploader';
import ChatInterface from '@/components/ChatInterface';
import ThemeToggle from '@/components/ThemeToggle';

const Index: React.FC = () => {
  const { isPdfLoaded, pdfFile } = usePDF();

  useEffect(() => {
    document.title = isPdfLoaded ? 'Chat with PDF' : 'Cognibot';
  }, [isPdfLoaded]);

  return (
    <div className="min-h-screen gradient-bg">
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {!isPdfLoaded ? (
        <div className="container max-w-4xl mx-auto px-6 py-20 min-h-screen flex flex-col">
          <div className="flex-grow flex flex-col items-center justify-center">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-8 animate-float">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              <h1 className="text-5xl sm:text-6xl font-display font-bold mb-6 animate-fade-up bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 dark:from-slate-100 dark:via-blue-100 dark:to-slate-200">
                Chat with your PDF
              </h1>
              
              <p className="text-slate-600 dark:text-slate-300 text-xl sm:text-2xl text-center max-w-3xl mb-4 animate-fade-up opacity-0 leading-relaxed" style={{ animationDelay: '0.1s' }}>
                Upload a PDF document and ask questions to get instant, relevant answers from its content.
              </p>
              
              <p className="text-slate-500 dark:text-slate-400 text-base animate-fade-up opacity-0" style={{ animationDelay: '0.2s' }}>
                Powered by AI • Secure • Fast
              </p>
            </div>
            
            {/* Upload Section */}
            <div className="w-full max-w-2xl animate-fade-up opacity-0" style={{ animationDelay: '0.3s' }}>
              <PDFUploader />
            </div>
            
            {/* Features */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl animate-fade-up opacity-0" style={{ animationDelay: '0.4s' }}>
              <div className="text-center p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-white/20 dark:border-slate-800/50">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Get instant answers from your documents</p>
              </div>
              
              <div className="text-center p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-white/20 dark:border-slate-800/50">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Your documents stay on your device</p>
              </div>
              
              <div className="text-center p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-white/20 dark:border-slate-800/50">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Smart Analysis</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">AI understands context and meaning</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ChatInterface />
      )}
    </div>
  );
};

export default Index;
