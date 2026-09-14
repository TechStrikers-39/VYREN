import { Course } from '@/types';

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  type: 'reading' | 'code_exercise' | 'video';
  completed: boolean;
  content: string;
  codeSnippet?: string;
}

export interface DetailedCourse extends Course {
  modulesCount: number;
  completedModules: number;
  lessons: CourseLesson[];
}

export const mockDetailedCourses: DetailedCourse[] = [
  {
    id: 'course-101',
    title: 'Advanced Machine Learning Systems Engineering',
    description: 'Master MLOps, model deployment pipelines, telemetry drift monitoring, and automated retraining triggers.',
    category: 'AI & Data Science',
    level: 'Advanced',
    duration: '6 hours',
    competenciesCovered: ['Machine Learning Ops', 'Data Pipeline Design'],
    modulesCount: 4,
    completedModules: 1,
    lessons: [
      {
        id: 'les-1',
        title: '1. MLOps Architecture & Drift Telemetry',
        duration: '15 mins',
        type: 'reading',
        completed: true,
        content: 'Understand how continuous inference servers collect telemetry metrics and compute Population Stability Index (PSI) to detect data and concept drift.'
      },
      {
        id: 'les-2',
        title: '2. Implementing PSI Telemetry Monitors',
        duration: '25 mins',
        type: 'code_exercise',
        completed: false,
        content: 'Write a Python telemetry monitoring function calculating PSI between baseline reference distributions and live serving batches.',
        codeSnippet: `import numpy as np\n\ndef calculate_psi(expected, actual, num_buckets=10):\n    expected_perc = np.histogram(expected, bins=num_buckets)[0] / len(expected)\n    actual_perc = np.histogram(actual, bins=num_buckets)[0] / len(actual)\n    expected_perc = np.where(expected_perc == 0, 0.0001, expected_perc)\n    actual_perc = np.where(actual_perc == 0, 0.0001, actual_perc)\n    psi_value = np.sum((actual_perc - expected_perc) * np.log(actual_perc / expected_perc))\n    return float(psi_value)`
      },
      {
        id: 'les-3',
        title: '3. Automated Retraining Pipeline Triggers',
        duration: '20 mins',
        type: 'reading',
        completed: false,
        content: 'Configure event triggers that launch retraining pipelines in FastAPI & Celery whenever PSI exceeds 0.2 threshold.'
      }
    ]
  },
  {
    id: 'course-102',
    title: 'Enterprise Statistical Quality Control',
    description: 'Rigorous statistical sampling, hypothesis testing, and anomaly detection for statistical data pipelines.',
    category: 'Statistics',
    level: 'Intermediate',
    duration: '4 hours',
    competenciesCovered: ['Statistical Inference', 'Data Governance'],
    modulesCount: 3,
    completedModules: 2,
    lessons: [
      {
        id: 'les-201',
        title: '1. Continuous Hypothesis Testing in Telemetry',
        duration: '20 mins',
        type: 'reading',
        completed: true,
        content: 'Statistical foundation for confidence interval bounds in high-frequency sampling.'
      }
    ]
  }
];

export const mockCourses: Course[] = mockDetailedCourses.map(({ lessons, modulesCount, completedModules, ...c }) => c);
