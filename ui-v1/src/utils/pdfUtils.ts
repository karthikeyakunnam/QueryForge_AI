import * as pdfjs from "pdfjs-dist";
import { ChatMessage, EvaluationSummary, SourceCitation, StreamDonePayload } from "@/types/rag";

// Set the worker source (needs to be updated based on PDFJS version)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface PDFProcessingResult {
  success: boolean;
  text: string;
  error?: string;
  pageCount?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log(API_BASE_URL);

// export const extractTextFromPDF = async (file: File): Promise<PDFProcessingResult> => {
//   try {
//     // Convert the file to an ArrayBuffer
//     const arrayBuffer = await file.arrayBuffer();

//     // Load the PDF document
//     const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
//     const pageCount = pdf.numPages;

//     // Extract text from each page
//     let fullText = '';
//     for (let i = 1; i <= pageCount; i++) {
//       const page = await pdf.getPage(i);
//       const textContent = await page.getTextContent();
//       const pageText = textContent.items
//         .map((item) => 'str' in item ? item.str : '')
//         .join(' ');
//       fullText += pageText + '\n\n';
//     }

//     return {
//       success: true,
//       text: fullText.trim(),
//       pageCount
//     };
//   } catch (error) {
//     console.error('Error extracting text from PDF:', error);
//     return {
//       success: false,
//       text: '',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     };
//   }
// };

export const uploadPDF = async (
  file: File
): Promise<{
  success: boolean;
  message?: string;
  fileName?: string;
  documentId?: string;
  pageCount?: number;
  characterLength?: number;
}> => {
  try {
    // Prepare FormData
    const formData = new FormData();
    formData.append("file", file); // Attach the file with key "file"

    // Send request to FastAPI backend
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    // Extract text from each page
    let fullText = "";
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n\n";
    }

    // Parse JSON response
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to upload PDF");
    }

    return {
      success: true,
      message: data.message,
      fileName: data.file_name || file.name,
      documentId: data.document_id,
      pageCount: pageCount,
      characterLength: fullText.length,
    };
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const queryPDF = async (
  query: string,
  documentId: string
): Promise<{ response: string; retrieved_chunks: string[]; sources: SourceCitation[]; confidence: number }> => {
  try {
    // Send query request to FastAPI backend
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, top_k: 5, doc_id: documentId }),
    });

    // Parse the response
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to fetch query response");
    }

    return {
      response: data.response,
      retrieved_chunks: data.retrieved_chunks || [],
      sources: data.sources || [],
      confidence: data.confidence || 0,
    };
  } catch (error) {
    console.error("Error querying PDF:", error);
    return {
      response: "An error occurred while processing your request.",
      retrieved_chunks: [],
      sources: [],
      confidence: 0,
    };
  }
};

const parseSSE = (buffer: string): { events: Array<{ event: string; data: string }>; rest: string } => {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() || "";
  const events = parts.map((part) => {
    const lines = part.split("\n");
    const event = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim() || "message";
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace("data:", "").trimStart())
      .join("\n");
    return { event, data };
  });
  return { events, rest };
};

export const streamQueryPDF = async ({
  query,
  documentId,
  messages,
  signal,
  onToken,
  onSources,
  onStatus,
  onDone,
  onError,
}: {
  query: string;
  documentId: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onSources: (sources: SourceCitation[], confidence: number) => void;
  onStatus: (stage: string) => void;
  onDone: (payload: StreamDonePayload) => void;
  onError: (message: string) => void;
}) => {
  const response = await fetch(`${API_BASE_URL}/query/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: 5, doc_id: documentId, messages, stream: true }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSSE(buffer);
    buffer = parsed.rest;

    for (const item of parsed.events) {
      const payload = item.data ? JSON.parse(item.data) : {};
      if (item.event === "token") onToken(payload.token || "");
      if (item.event === "sources") onSources(payload.sources || [], payload.confidence || 0);
      if (item.event === "status") onStatus(payload.stage || "working");
      if (item.event === "done") onDone(payload);
      if (item.event === "error") onError(payload.message || "Streaming failed");
    }
  }
};

export const fetchEvaluationRuns = async (): Promise<EvaluationSummary[]> => {
  const response = await fetch(`${API_BASE_URL}/evaluation/runs`);
  if (!response.ok) {
    throw new Error("Failed to load evaluation runs");
  }
  const data = await response.json();
  return data.runs || [];
};

// export const queryPDF = async (query: string, pdfText: string): Promise<string> => {
//   // In a real application, this would connect to an AI service or backend
//   // For now, we'll simulate a response based on the query and PDF text

//   // Simple keyword matching (this is just a placeholder)
//   const words = query.toLowerCase().split(' ');
//   const pdfLower = pdfText.toLowerCase();

//   // Find the most relevant paragraph containing the query words
//   const paragraphs = pdfText.split('\n\n');
//   let bestParagraph = '';
//   let bestScore = 0;

//   for (const para of paragraphs) {
//     if (para.trim().length < 20) continue; // Skip very short paragraphs

//     let score = 0;
//     const paraLower = para.toLowerCase();
//     for (const word of words) {
//       if (word.length <= 3) continue; // Skip short words
//       if (paraLower.includes(word)) score += 1;
//     }

//     if (score > bestScore) {
//       bestScore = score;
//       bestParagraph = para;
//     }
//   }

//   if (bestScore > 0) {
//     return `Based on the PDF content: "${bestParagraph.trim()}"`;
//   } else {
//     return "I couldn't find information related to your query in the uploaded PDF. Please try asking something else related to the document's content.";
//   }
// };
