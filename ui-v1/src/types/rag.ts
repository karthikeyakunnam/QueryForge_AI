export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SourceCitation {
  citation_id: string;
  document_id: string;
  file_name: string;
  chunk_id: number;
  page_start: number;
  page_end: number;
  score: number;
  dense_score: number;
  keyword_score: number;
  rerank_score: number;
  text: string;
  highlights: string[];
  metadata: Record<string, unknown>;
}

export interface RetrievalDiagnostics {
  strategy: string;
  dense_results: number;
  keyword_results: number;
  returned_results: number;
  latency_ms: number;
}

export interface StreamDonePayload {
  response: string;
  confidence: number;
  sources: SourceCitation[];
  diagnostics?: RetrievalDiagnostics;
}

export interface EvaluationSummary {
  run_id: string;
  created_at: string;
  benchmark_name: string;
  strategy: string;
  cases: number;
  mean_confidence: number;
  mean_faithfulness: number;
  mean_retrieval_relevancy: number;
  hallucination_rate: number;
  expected_chunk_recall: number;
  p95_latency_ms: number;
}
