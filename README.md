# Deep Research Agents

An AI-powered deep research system that discovers, enriches, and surfaces insights about companies. Agents run in the background to collect and enrich data, which is stored in Neon Serverless Postgres with vector embeddings for semantic search. A Next.js frontend surfaces the results.

## Architecture

- **Agents** run background research tasks — collecting, enriching, and embedding company data
- **Neon Postgres + pgvector** stores structured company data alongside vector embeddings for semantic similarity search
- **Hybrid search** combines semantic (70%), name trigram (20%), and full-text (10%) scoring
- **Next.js frontend** renders results server-side with no client-side data fetching

## Tech Stack

- **Framework**: Next.js 16 (App Router, RSC)
- **Database**: Neon Serverless Postgres with `pgvector`
- **Styling**: Tailwind CSS v4 + Linear design system
- **UI**: shadcn/ui, Radix UI, lucide-react
- **Language**: TypeScript

## Getting Started

```bash
npm install
```

```bash
# .env.local
DATABASE_URL=postgresql://...
```

```bash
npm run dev
```
