-- Sahil Drive — محادثة الراكب والكابتن داخل الرحلة

create table if not exists public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('rider', 'captain')),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists ride_messages_ride_created_idx
  on public.ride_messages (ride_id, created_at asc);

alter table public.ride_messages enable row level security;

drop policy if exists "ride participants read messages" on public.ride_messages;
create policy "ride participants read messages" on public.ride_messages
  for select using (
    public.is_ride_owner(ride_id)
    or public.captain_assigned_to_ride(ride_id)
  );

drop policy if exists "ride participants send messages" on public.ride_messages;
create policy "ride participants send messages" on public.ride_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_ride_owner(ride_id)
      or public.captain_assigned_to_ride(ride_id)
    )
  );

-- تفعيل التحديثات اللحظية للرسائل، مع تجنب خطأ الإضافة إذا كانت مفعلة مسبقًا.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ride_messages'
  ) then
    alter publication supabase_realtime add table public.ride_messages;
  end if;
end
$$;
