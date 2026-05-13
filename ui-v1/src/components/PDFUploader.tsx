
import React, { useState, useRef, DragEvent } from 'react';
import { usePDF } from '@/context/PDFContext';
import { uploadPDF } from '@/utils/pdfUtils';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingDots from './LoadingDots';

const PDFUploader: React.FC = () => {
  const { setPdfFile, setIsProcessing, setPdfName, setDocumentId, isProcessing } = usePDF();
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setErrorMsg('Please select a valid PDF file');
      toast.error('Invalid file type', {
        description: 'Only PDF files are supported',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
      setErrorMsg('File size exceeds the 10MB limit');
      toast.error('File too large', {
        description: 'Maximum file size is 10MB',
      });
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    setPdfFile(file);

    try {
      const result = await uploadPDF(file);
      
      if (result.success) {
        setPdfName(result.fileName);
        setDocumentId(result.documentId || '');
        toast.success('PDF processed successfully', {
          description: `Extracted ${result.characterLength} characters from ${result.pageCount} pages`,
        });
      } else {
        setErrorMsg(result.message || 'Failed to process PDF');
        setPdfFile(null);
        toast.error('Failed to process PDF', {
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setErrorMsg('An unexpected error occurred while processing the PDF');
      setPdfFile(null);
      toast.error('Processing error', {
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`drag-area p-12 flex flex-col items-center text-center transition-all duration-300 ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf"
          onChange={handleFileInput}
        />
        
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center mb-6 animate-pulse">
                <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full animate-ping"></div>
            </div>
            <div className="mb-3 text-slate-800 dark:text-slate-200 font-semibold text-lg">Processing PDF</div>
            <div className="flex items-center space-x-2 mb-4">
              <LoadingDots className="text-blue-600" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">This may take a few moments...</p>
          </div>
        ) : (
          <>
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 animate-float">
                <Upload className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">Upload your PDF</h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 max-w-md">
              Drag & drop your PDF here, or click to browse files
            </p>
            
            <Button 
              onClick={openFileDialog}
              className="btn-primary px-8 py-3 rounded-xl font-semibold text-base transition-all duration-200 hover:scale-105"
            >
              <Upload className="w-5 h-5 mr-2" />
              Choose PDF File
            </Button>
            
            <div className="mt-6 flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Max 10MB
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Fast
              </div>
            </div>
          </>
        )}
        
        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 flex items-center text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFUploader;
