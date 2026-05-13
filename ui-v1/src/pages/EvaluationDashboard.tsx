import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle, Gauge, SearchCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { fetchEvaluationRuns } from '@/utils/pdfUtils';

const pct = (value: number) => `${Math.round(value * 100)}%`;

const EvaluationDashboard: React.FC = () => {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['evaluation-runs'],
    queryFn: fetchEvaluationRuns,
    refetchInterval: 30000,
  });

  const chartData = data.map((run) => ({
    ...run,
    label: new Date(run.created_at).toLocaleDateString(),
    hallucinationPct: Math.round(run.hallucination_rate * 100),
    faithfulnessPct: Math.round(run.mean_faithfulness * 100),
    relevancyPct: Math.round(run.mean_retrieval_relevancy * 100),
    confidencePct: Math.round(run.mean_confidence * 100),
    recallPct: Math.round(run.expected_chunk_recall * 100),
  }));
  const latest = data[data.length - 1];

  return (
    <div className="min-h-screen gradient-bg">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Continuous RAG Quality</p>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">Evaluation Dashboard</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
            Tracks retrieval quality, hallucination trends, faithfulness, benchmark recall, and latency across evaluation runs.
          </p>
        </div>

        {isLoading && <div className="glass-panel rounded-xl p-6">Loading evaluation runs...</div>}
        {error && <div className="glass-panel rounded-xl p-6 text-red-600">Unable to load evaluation metrics.</div>}
        {!isLoading && !error && data.length === 0 && (
          <div className="glass-panel rounded-xl p-6">
            No evaluation runs yet. Run `PYTHONPATH=backend python backend/scripts/evaluate_rag.py --limit 20`.
          </div>
        )}

        {latest && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricCard icon={Gauge} label="Faithfulness" value={pct(latest.mean_faithfulness)} />
              <MetricCard icon={SearchCheck} label="Retrieval Relevancy" value={pct(latest.mean_retrieval_relevancy)} />
              <MetricCard icon={AlertTriangle} label="Hallucination Rate" value={pct(latest.hallucination_rate)} />
              <MetricCard icon={Activity} label="P95 Retrieval Latency" value={`${latest.p95_latency_ms}ms`} />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartPanel title="Hallucination Rate Trend">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hallucinationPct" stroke="#dc2626" fill="#fecaca" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Faithfulness vs Retrieval Relevancy">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="faithfulnessPct" stroke="#2563eb" strokeWidth={2} />
                    <Line type="monotone" dataKey="relevancyPct" stroke="#059669" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Benchmark Recall Comparison">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="benchmark_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="recallPct" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Confidence and Latency">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="confidencePct" stroke="#0284c7" strokeWidth={2} />
                    <Line type="monotone" dataKey="p95_latency_ms" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value }) => (
  <div className="glass-panel rounded-xl p-5">
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <Icon className="h-5 w-5 text-blue-500" />
    </div>
    <div className="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</div>
  </div>
);

const ChartPanel = ({ title, children }) => (
  <div className="glass-panel rounded-xl p-5">
    <h2 className="mb-4 font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
    {children}
  </div>
);

export default EvaluationDashboard;
