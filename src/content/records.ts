export type WorldId = 'live' | 'city' | 'sea' | 'dawn' | 'desert' | 'rain' | 'space'

export type Pattern = 'rings' | 'bars' | 'grid' | 'wave' | 'stripes' | 'dots' | 'arc'

export interface RecordEntry {
  id: string
  title: string
  subtitle: string
  year: string
  status?: string
  sideA: { label: string; text: string }
  sideB: { label: string; text: string }
  tracks: string[]
  credits: string[]
  links: { label: string; href: string }[]
  sleeve: { bg: string; fg: string; accent: string; pattern: Pattern }
  world: WorldId
  music: { root: number; mode: 'major' | 'minor' | 'dorian'; bpm: number; prog: number[] }
}

const gh = (repo: string) => `https://github.com/porasnagar/${repo}`

export const records: RecordEntry[] = [
  {
    id: 'lumavoice',
    title: 'LumaVoice',
    subtitle: 'Hindi lip reading from silent video',
    year: '2025',
    sideA: {
      label: 'The problem',
      text: 'Speech recognition fails the people who most need captions. LumaVoice reads speech from the mouth alone, so a silent video still says something.',
    },
    sideB: {
      label: 'What I built',
      text: 'A CNN-LSTM spatio-temporal network in PyTorch that classifies phonemes from the mouth region at 30 FPS, behind a FastAPI service and a React front end that takes uploads or a live webcam.',
    },
    tracks: [
      'Face detection & landmarks',
      'Mouth ROI cropping',
      'CNN-LSTM phoneme model',
      'Dockerised forced aligner',
      'Live webcam inference',
    ],
    credits: ['PyTorch', 'FastAPI', 'React 18', 'TypeScript', 'Docker'],
    links: [
      { label: 'App repo', href: gh('LumaVoice') },
      { label: 'Model notebook', href: gh('LumaVoice---lip-reading-model-hindi') },
      { label: 'Aligner service', href: gh('Dcoker-Forced-aligners') },
    ],
    sleeve: { bg: '#e4572e', fg: '#1a1210', accent: '#f6e7cb', pattern: 'wave' },
    world: 'dawn',
    music: { root: 57, mode: 'dorian', bpm: 84, prog: [0, 3, 5, 4] },
  },
  {
    id: 'djq-str',
    title: 'DJQ-STR',
    subtitle: 'Crowd counting and incident reasoning on video',
    year: '2026',
    status: 'In progress',
    sideA: {
      label: 'The problem',
      text: 'CCTV operators need two answers at once: how many people are here, and is something going wrong. Single-purpose models give one or the other.',
    },
    sideB: {
      label: 'What I built',
      text: 'One checkpoint that bundles a DINOv3 density counter, a V-JEPA motion encoder and a Qwen2.5-VL reasoner. Every change ships only if it beats criteria I register before running the evaluation.',
    },
    tracks: [
      'Density-map counter (DINOv3 + LoRA)',
      'Motion encoder (V-JEPA 2.1)',
      'Vision-language reasoner',
      'Pre-registered evaluations',
      'Single-checkpoint packaging',
    ],
    credits: ['PyTorch', 'DINOv3', 'V-JEPA', 'Qwen2.5-VL', 'vLLM', 'Docker', 'Modal'],
    links: [{ label: 'NWPU-Crowd mirror', href: gh('NWPU-crowd-dataset') }],
    sleeve: { bg: '#1f2a44', fg: '#f2efe6', accent: '#e8a33d', pattern: 'dots' },
    world: 'city',
    music: { root: 50, mode: 'minor', bpm: 76, prog: [0, 5, 3, 4] },
  },
  {
    id: 'scraper-cluster',
    title: 'Broker Cluster',
    subtitle: 'Distributed scraping at 10,480 pages a minute',
    year: '2025',
    sideA: {
      label: 'The problem',
      text: 'Fan-out scrapers either flood the target or drown in duplicates. Throughput is only useful if every page lands exactly once.',
    },
    sideB: {
      label: 'What I built',
      text: 'A back-pressured fan-out cluster on a RabbitMQ topic exchange, with Redis SHA-256 fingerprints so ingestion stays duplicate-free. Measured at 10,480 pages per minute.',
    },
    tracks: [
      'AMQP topic exchange',
      'Back-pressure & prefetch',
      'SHA-256 fingerprint dedupe',
      '10,480 pages / minute',
    ],
    credits: ['Python', 'RabbitMQ', 'Redis', 'Docker'],
    links: [],
    sleeve: { bg: '#2d6a4f', fg: '#f1f4e8', accent: '#f4c95d', pattern: 'bars' },
    world: 'desert',
    music: { root: 52, mode: 'minor', bpm: 96, prog: [0, 6, 5, 6] },
  },
  {
    id: 'triage-gateway',
    title: 'Triage Gateway',
    subtitle: 'Hospital booking over WhatsApp',
    year: '2025',
    sideA: {
      label: 'The problem',
      text: 'Meta’s Cloud API drops webhooks that are not acknowledged within 200 ms, and a hospital cannot lose a patient’s message.',
    },
    sideB: {
      label: 'What I built',
      text: 'An Express webhook that verifies HMAC-SHA256 signatures, acknowledges in 142 ms, then handles booking and encrypted report delivery asynchronously.',
    },
    tracks: [
      'HMAC-SHA256 verification',
      '142 ms acknowledgement',
      'Async booking flow',
      'Encrypted report delivery',
    ],
    credits: ['Node.js', 'Express', 'Meta Cloud API', 'Queues'],
    links: [],
    sleeve: { bg: '#f2efe6', fg: '#1b4965', accent: '#d2452f', pattern: 'grid' },
    world: 'sea',
    music: { root: 60, mode: 'major', bpm: 88, prog: [0, 4, 5, 3] },
  },
  {
    id: 'fmcg-intel',
    title: 'FMCG Intel',
    subtitle: 'Agents that track M&A news and write the newsletter',
    year: '2026',
    sideA: {
      label: 'The problem',
      text: 'Deal news in consumer goods is scattered across hundreds of outlets and repeated endlessly. Analysts need the deals, once, with context.',
    },
    sideB: {
      label: 'What I built',
      text: 'A pipeline of agents: news ingestion from Tavily, event extraction with Gemini, relevance and duplicate filtering over pgvector, and a writer agent that turns recent deals into a newsletter.',
    },
    tracks: [
      'News ingestion agent',
      'Event extraction',
      'pgvector dedupe',
      'Newsletter writer',
    ],
    credits: ['TypeScript', 'Tavily', 'Gemini', 'PostgreSQL', 'pgvector'],
    links: [{ label: 'Repo', href: gh('FMCG-Intel-Assignment') }],
    sleeve: { bg: '#f4c95d', fg: '#1a1210', accent: '#2d6a4f', pattern: 'stripes' },
    world: 'live',
    music: { root: 55, mode: 'major', bpm: 92, prog: [0, 5, 3, 4] },
  },
  {
    id: 'sci-scraper',
    title: 'Judgements',
    subtitle: 'The Supreme Court of India archive, collected',
    year: '2026',
    sideA: {
      label: 'The problem',
      text: 'The court portal has no API or bulk download: 30-day query windows, a maths CAPTCHA on every search, and results injected by AJAX. A naive crawl needs about 27,000 page loads.',
    },
    sideB: {
      label: 'What I built',
      text: 'An automated scraper that plans the date windows, answers the arithmetic CAPTCHA, parses the AJAX responses and collects every public judgement with a results report.',
    },
    tracks: [
      'Date-window planner',
      'Arithmetic CAPTCHA reader',
      'AJAX response parser',
      'Results report',
    ],
    credits: ['Python', 'HTML parsing'],
    links: [
      { label: 'Repo', href: gh('sci-scraper-') },
      {
        label: 'Results',
        href: 'https://htmlpreview.github.io/?https://raw.githubusercontent.com/porasnagar/sci-scraper-/main/results.html',
      },
    ],
    sleeve: { bg: '#5a3a28', fg: '#f6e7cb', accent: '#e8a33d', pattern: 'arc' },
    world: 'rain',
    music: { root: 53, mode: 'minor', bpm: 70, prog: [0, 3, 6, 4] },
  },
  {
    id: 'learnhub',
    title: 'LearnHub',
    subtitle: 'A learning management system, end to end',
    year: '2026',
    sideA: {
      label: 'The problem',
      text: 'Students, instructors and admins need different views of the same courses, grades and deadlines, and none of them want to hunt for what is due next.',
    },
    sideB: {
      label: 'What I built',
      text: 'An ASP.NET Core 8 API with Entity Framework and cookie auth, and an Angular 19 front end: enrolment, assignments, a SpeedGrader-style grading screen, a gradebook with CSV export and one-tap demos.',
    },
    tracks: [
      'Student dashboard',
      'Instructor gradebook',
      'Grading screen',
      'Admin console',
    ],
    credits: ['ASP.NET Core 8', 'EF Core', 'Angular 19', 'TypeScript'],
    links: [{ label: 'Repo', href: gh('LearnHub') }],
    sleeve: { bg: '#3a86a8', fg: '#f2efe6', accent: '#1a1210', pattern: 'rings' },
    world: 'dawn',
    music: { root: 62, mode: 'major', bpm: 100, prog: [0, 3, 4, 3] },
  },
  {
    id: 'persona-ai',
    title: 'Persona AI',
    subtitle: 'A calm companion with many voices',
    year: '2026',
    sideA: {
      label: 'The problem',
      text: 'One chatbot voice does not fit every moment. Advice from a mentor, patience from a listener and a yoga cue are different conversations.',
    },
    sideB: {
      label: 'What I built',
      text: 'A mobile app where you talk to specialised personas (mentor, teacher, motivator, listener, philosopher, yoga instructor) or define your own.',
    },
    tracks: [
      'Persona system',
      'Custom persona builder',
      'Calm mode UI',
    ],
    credits: ['TypeScript', 'Mobile', 'LLM APIs'],
    links: [{ label: 'Repo', href: gh('persona-ai') }],
    sleeve: { bg: '#2b2d42', fg: '#edf2f4', accent: '#8d99ae', pattern: 'arc' },
    world: 'space',
    music: { root: 48, mode: 'major', bpm: 66, prog: [0, 5, 3, 0] },
  },
  {
    id: 'stream-f1',
    title: 'Stream F1',
    subtitle: 'A race-weekend dashboard',
    year: '2026',
    sideA: {
      label: 'The problem',
      text: 'Race weekends scatter across timing pages, standings and highlight clips. I wanted one screen for all of it.',
    },
    sideB: {
      label: 'What I built',
      text: 'A Next.js dashboard with race history charts and a YouTube highlights section, deployed on Vercel.',
    },
    tracks: [
            'History charts',
      'Highlights',
    ],
    credits: ['Next.js', 'TypeScript', 'Vercel'],
    links: [
      { label: 'Live site', href: 'https://stream-f1.vercel.app' },
      { label: 'Repo', href: gh('stream-f1') },
    ],
    sleeve: { bg: '#d2452f', fg: '#f2efe6', accent: '#1a1210', pattern: 'stripes' },
    world: 'desert',
    music: { root: 57, mode: 'minor', bpm: 112, prog: [0, 6, 5, 4] },
  },
  {
    id: 'hermes',
    title: 'Hermes',
    subtitle: 'Autonomous agents running in CI',
    year: '2026',
    sideA: {
      label: 'The problem',
      text: 'Reports and decks are repetitive to produce, and work done by agents on a laptop leaves no audit trail.',
    },
    sideB: {
      label: 'What I built',
      text: 'A multi-agent system that runs inside GitHub Actions, plans its own tasks and commits version-controlled DOCX, PPTX and structured data artefacts.',
    },
    tracks: [
      'Task synthesis',
      'Agents in GitHub Actions',
      'Versioned DOCX & PPTX output',
    ],
    credits: ['Python', 'GitHub Actions', 'LLM agents'],
    links: [],
    sleeve: { bg: '#8a5a44', fg: '#f6e7cb', accent: '#f4c95d', pattern: 'rings' },
    world: 'city',
    music: { root: 50, mode: 'dorian', bpm: 90, prog: [0, 3, 0, 4] },
  },
]

export const recordById = (id: string | null | undefined) => records.find((r) => r.id === id) ?? null
