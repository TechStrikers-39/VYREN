import { Assessment, Question } from '@/types';

export interface AssessmentItem extends Question {
  targetCompetency: string;
  weight: number;
}

export interface DetailedAssessment extends Assessment {
  items: AssessmentItem[];
}

export const mockDetailedAssessment: DetailedAssessment = {
  id: 'asm-001',
  title: 'Core MLOps Capability Evaluation',
  description: 'Adaptive assessment evaluating model orchestration, tracking, drift detection, and automated deployment pipelines.',
  durationMinutes: 15,
  questionsCount: 5,
  competenciesEvaluated: ['Machine Learning Ops', 'Data Pipeline Design', 'Statistical Inference'],
  items: [
    {
      id: 'q1',
      prompt: 'Which statistical metric best measures feature distribution drift across continuous data streams?',
      options: [
        'Kullback-Leibler (KL) Divergence / Population Stability Index (PSI)',
        'Simple Moving Average Delta',
        'Pearson Correlation Ratio',
        'Z-Score Variance Delta'
      ],
      correctOptionIndex: 0,
      targetCompetency: 'Machine Learning Ops',
      weight: 1.0,
      explanation: 'PSI and KL Divergence directly quantify distribution shifts between baseline baseline and serving inference batches.'
    },
    {
      id: 'q2',
      prompt: 'In automated CI/CD for machine learning, what artifact should trigger model re-training?',
      options: [
        'Routine weekly cron schedule only',
        'Automated telemetry alert on data drift or performance degradation',
        'Manual user dashboard click',
        'Database table insertion event'
      ],
      correctOptionIndex: 1,
      targetCompetency: 'Machine Learning Ops',
      weight: 1.0,
      explanation: 'Adaptive MLOps pipelines use automated telemetry triggers to initiate retraining when performance falls below threshold.'
    },
    {
      id: 'q3',
      prompt: 'Which schema migration strategy minimizes downtime for high-throughput streaming pipelines?',
      options: [
        'Blue-green deployment with Dual Writing / Schema Versioning',
        'Hard table drop and recreate',
        'Locking all reader threads during migration',
        'Direct in-place ALTER TABLE without backup'
      ],
      correctOptionIndex: 0,
      targetCompetency: 'Data Pipeline Design',
      weight: 1.0,
      explanation: 'Dual writing with schema versioning ensures zero-downtime backwards compatibility.'
    },
    {
      id: 'q4',
      prompt: 'What is the primary purpose of an Evidence Vector in deterministic competency scoring?',
      options: [
        'Storing raw audio files',
        'Quantifying weighted objective performance across targeted domain sub-competencies',
        'Formatting CSS UI styles',
        'Caching HTTP API responses'
      ],
      correctOptionIndex: 1,
      targetCompetency: 'Statistical Inference',
      weight: 1.0,
      explanation: 'Evidence vectors map raw item evaluation scores to multi-dimensional competency models.'
    },
    {
      id: 'q5',
      prompt: 'When evaluating model latency, which percentile metric best reflects worst-case user SLA experience?',
      options: [
        'p50 (Median)',
        'p99 / p99.9 (99th percentile)',
        'Mean average',
        'Minimum response latency'
      ],
      correctOptionIndex: 1,
      targetCompetency: 'Machine Learning Ops',
      weight: 1.0,
      explanation: 'p99 latency isolates tail-end performance issues affecting edge requests.'
    }
  ]
};
