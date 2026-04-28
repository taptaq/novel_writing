create extension if not exists vector;

create table if not exists "EmbeddingChunk" (
  id text primary key,
  novel_id text not null references "Novel"(id) on delete cascade,
  chapter_id text references "Chapter"(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists embedding_chunk_novel_idx
  on "EmbeddingChunk"(novel_id);

create index if not exists embedding_chunk_source_idx
  on "EmbeddingChunk"(source_type, source_id);

create index if not exists embedding_chunk_embedding_idx
  on "EmbeddingChunk"
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
