export interface Profile {
  name: string
  role: string
  current: string
  location: string
  coords: { lat: number; lon: number }
  timeZone: string
  education: string
  summary: string
  focus: string[]
  skills: string[]
  links: Record<string, string>
  github: string
}

export const profile: Profile = {
  name: 'Poras Nagar',
  role: 'AI Engineer & Full-Stack Developer',
  current: 'AI Engineer at EnxtAI',
  location: 'Noida, India',
  coords: { lat: 28.5355, lon: 77.391 },
  timeZone: 'Asia/Kolkata',
  education: 'B.Tech CSE, Honors in AI & ML — Amity University (2021–2025)',
  summary:
    'I build production machine-learning pipelines and the backends that carry them: computer vision models that read lips and count crowds, scraper clusters that ingest ten thousand pages a minute, and webhook gateways that answer inside Meta’s 200 ms window.',
  focus: [
    'PyTorch spatio-temporal models (video, lip reading, crowd scenes)',
    'Message-driven backends: RabbitMQ, Redis, FastAPI, Express',
    'Agent pipelines with retrieval (Postgres + pgvector)',
    'Full-stack TypeScript: React, Next.js, Angular',
  ],
  skills: [
    'PyTorch',
    'Computer vision',
    'FastAPI',
    'RabbitMQ',
    'Redis',
    'PostgreSQL',
    'TypeScript',
    'React',
    'Next.js',
    'Docker',
    'ASP.NET Core',
    'Three.js',
  ],
  github: 'porasnagar',
  links: {
    github: 'https://github.com/porasnagar',
    linkedin: 'https://www.linkedin.com/in/poras-nagar-036886189/',
  },
}
