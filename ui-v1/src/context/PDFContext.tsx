
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface PDFContextType {
  pdfFile: File | null;
  pdfText: string;
  isPdfLoaded: boolean;
  isProcessing: boolean;
  pdfName: string;
  documentId: string;
  setPdfFile: (file: File | null) => void;
  setPdfText: (text: string) => void;
  setIsProcessing: (value: boolean) => void;
  setPdfName: (text: string) => void;
  setDocumentId: (text: string) => void;
  resetPdfContext: () => void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pdfName, setPdfName] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');

  const handleSetPdfFile = (file: File | null) => {
    setPdfFile(file);
    if (file) {
      setPdfName(file.name);
    } else {
      setPdfName('');
    }
  };

  const handleSetPdfName = (fileName: string | null) => {
    if(fileName) {
      setPdfName(fileName);
    } else {
      setPdfName('');
    }
  }

  const resetPdfContext = () => {
    setPdfFile(null);
    setPdfText('');
    setIsProcessing(false);
    setPdfName('');
    setDocumentId('');
  };

  return (
    <PDFContext.Provider
      value={{
        pdfFile,
        pdfText,
        isPdfLoaded: !!pdfName,
        isProcessing,
        pdfName,
        documentId,
        setPdfFile: handleSetPdfFile,
        setPdfText,
        setIsProcessing,
        resetPdfContext,
        setPdfName: handleSetPdfName,
        setDocumentId
      }}
    >
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = (): PDFContextType => {
  const context = useContext(PDFContext);
  if (context === undefined) {
    throw new Error('usePDF must be used within a PDFProvider');
  }
  return context;
};
