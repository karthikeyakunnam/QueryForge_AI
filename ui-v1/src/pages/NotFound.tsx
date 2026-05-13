import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto animate-float">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
          404
        </h1>
        
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">Page not found</h2>
        
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <a 
          href="/" 
          className="btn-primary inline-flex items-center px-8 py-3 rounded-xl font-semibold text-base transition-all duration-200 hover:scale-105"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
