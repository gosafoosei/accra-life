/* ============================================================
   Accra Life — optional Supabase backend for the Town Square
   1. Create a free project at https://supabase.com
   2. Open the SQL Editor and run this whole file
   3. Copy your project URL and anon public key (Settings → API)
   4. Paste them into config.js — done. The chat switches
      from ntfy.sh to your Supabase automatically.
   ============================================================ */

create table if not exists chat_messages (
  id bigserial primary key,
  topic text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_topic_idx
  on chat_messages (topic, id desc);

-- The game is account-less, so anon visitors may read and post.
-- Anyone with your anon key can write here — keep that in mind.
alter table chat_messages enable row level security;

drop policy if exists "chat read" on chat_messages;
create policy "chat read" on chat_messages
  for select using (true);

drop policy if exists "chat insert" on chat_messages;
create policy "chat insert" on chat_messages
  for insert with check (true);

-- Optional: keep the table lean by trimming old rows.
-- Run occasionally, or schedule with pg_cron if available:
-- delete from chat_messages where created_at < now() - interval '7 days';
