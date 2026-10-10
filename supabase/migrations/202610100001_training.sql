begin;
create table public.training_sessions (
 id uuid primary key default gen_random_uuid(), title text not null,
 status text not null default 'draft' check(status in ('draft','open','closed','completed')),
 capacity int not null check(capacity between 1 and 999), registration_deadline timestamptz not null,
 meeting_link text, whatsapp_group_link text, notes text, created_at timestamptz not null default now()
);
create table public.session_meetings (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.training_sessions on delete cascade,
 meeting_number int not null check(meeting_number between 1 and 3), title text not null, starts_at timestamptz not null,
 duration_minutes int not null default 90 check(duration_minutes between 15 and 480), unique(session_id,meeting_number)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.training_sessions,
 full_name text not null, email text not null, phone text not null,
 amount numeric(12,2) not null check(amount>0), currency text not null default 'XOF' check(currency='XOF'),
 status text not null default 'pending' check(status in ('pending','success','failed','expired','refunded')),
 saspay_session_id text unique, saspay_payment_id text unique, checkout_url text, failure_reason text,
 participant_number int check(participant_number between 1 and 999), manual_review boolean not null default false,
 access_token_hash text not null, idempotency_key uuid not null unique, paid_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(session_id,participant_number)
);
create index orders_status_date on public.orders(status,created_at);
create index orders_session on public.orders(session_id);
create index orders_email on public.orders(lower(email));
create table public.waitlist(id uuid primary key default gen_random_uuid(), email text not null unique, whatsapp text not null, created_at timestamptz not null default now());
create table public.admin_users(user_id uuid primary key references auth.users on delete cascade, role text not null default 'admin' check(role='admin'));
create table public.email_logs(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders,
 type text not null, status text not null default 'queued' check(status in ('queued','sending','sent','failed')),
 error text, sent_at timestamptz, attempts int not null default 0, locked_at timestamptz, created_at timestamptz not null default now(),
 unique(order_id,type)
);
create table public.order_events(id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders, action text not null, actor uuid references auth.users, created_at timestamptz not null default now());
create table public.rate_limits(key text primary key, hits int not null, expires_at timestamptz not null);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
do $$ declare t text; begin foreach t in array array['training_sessions','session_meetings','orders','waitlist','admin_users','email_logs','order_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop; end $$;
-- Administrator membership can only be edited with the service role / SQL console.
drop policy admin_all on public.admin_users;
create policy admin_read on public.admin_users for select to authenticated using(public.is_admin());
revoke insert,update,delete on public.admin_users from authenticated;
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon,authenticated;
-- Public projection deliberately excludes Zoom/WhatsApp links, notes and buyer identities.
create or replace function public.get_public_sessions() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(s order by s->>'registration_deadline'),'[]'::jsonb) from (
 select jsonb_build_object('id',t.id,'title',t.title,'capacity',t.capacity,'registration_deadline',t.registration_deadline,
 'remaining',greatest(0,t.capacity-(select count(*) from public.orders o where o.session_id=t.id and o.status='success')),
 'meetings',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'meeting_number',m.meeting_number,'title',m.title,'starts_at',m.starts_at,'duration_minutes',m.duration_minutes) order by m.meeting_number) from public.session_meetings m where m.session_id=t.id),'[]'::jsonb)) s
 from public.training_sessions t where t.status='open' and t.registration_deadline>now()
 and (select count(*) from public.session_meetings m where m.session_id=t.id)=3
 ) a
$$;
revoke all on function public.get_public_sessions() from public;
grant execute on function public.get_public_sessions() to anon,authenticated,service_role;
-- Reserve creation under the session lock; payment remains the final capacity authority.
create or replace function public.create_training_order(p_session uuid,p_name text,p_email text,p_phone text,p_hash text,p_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.training_sessions; result uuid; begin
 select * into s from public.training_sessions where id=p_session for update;
 if not found or s.status<>'open' or s.registration_deadline<=now() then raise exception 'Session fermée'; end if;
 if (select count(*) from public.session_meetings where session_id=p_session)<>3 then raise exception 'Session incomplète'; end if;
 if (select count(*) from public.orders where session_id=p_session and status='success')>=s.capacity then raise exception 'Session complète'; end if;
 insert into public.orders(session_id,full_name,email,phone,amount,access_token_hash,idempotency_key)
 values(p_session,p_name,lower(p_email),p_phone,10000,p_hash,p_key) returning id into result;
 return result;
end $$;
-- Lock session first for consistent lock ordering across all confirmations.
create or replace function public.confirm_training_order(p_order uuid,p_payment text default null,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; sid uuid; cap int; n int; begin
 select session_id into sid from public.orders where id=p_order;
 if sid is null then raise exception 'Commande introuvable'; end if;
 select capacity into cap from public.training_sessions where id=sid for update;
 select * into o from public.orders where id=p_order for update;
 if o.status='success' and not o.manual_review then return to_jsonb(o); end if;
 if o.status='refunded' then raise exception 'Commande remboursée'; end if;
 if (select count(*) from public.orders where session_id=sid and status='success' and id<>p_order) < cap then
 select g into n from generate_series(1,999) g where not exists(select 1 from public.orders where session_id=sid and participant_number=g) order by g limit 1;
 end if;
 if o.status='success' and n is null and o.participant_number is null then return to_jsonb(o); end if;
 update public.orders set status='success', participant_number=coalesce(o.participant_number,n), manual_review=(n is null and o.participant_number is null),
 saspay_payment_id=coalesce(p_payment,saspay_payment_id), paid_at=coalesce(o.paid_at,now()), updated_at=now(),failure_reason=null where id=p_order returning * into o;
 insert into public.order_events(order_id,action,actor) values(p_order,case when p_actor is null then 'payment_verified' else 'manual_confirmation' end,p_actor);
 if not o.manual_review then insert into public.email_logs(order_id,type) values(p_order,'confirmation') on conflict do nothing; end if;
 return to_jsonb(o);
end $$;
create or replace function public.fail_training_order(p_order uuid,p_reason text,p_status text default 'failed') returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('failed','expired') then raise exception 'Statut non autorisé'; end if;
 update public.orders set status=p_status,failure_reason=p_reason,updated_at=now() where id=p_order and status in ('pending','failed','expired') and (status<>p_status or failure_reason is distinct from p_reason);
 if found then
 insert into public.order_events(order_id,action) values(p_order,'payment_'||p_status);
 if p_status='failed' then insert into public.email_logs(order_id,type) values(p_order,'retry') on conflict do nothing; end if;
 end if;
end $$;
create or replace function public.check_rate_limit(p_key text,p_max int,p_seconds int) returns boolean language plpgsql security definer set search_path='' as $$
declare n int; begin
 insert into public.rate_limits(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when public.rate_limits.expires_at<=now() then 1 else public.rate_limits.hits+1 end,
 expires_at=case when public.rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else public.rate_limits.expires_at end returning hits into n;
 return n<=p_max;
end $$;
create or replace function public.claim_email(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.email_logs set status='sending',locked_at=now(),attempts=attempts+1 where id=p_id and (status in ('queued','failed') or (status='sending' and locked_at<now()-interval '10 minutes'));
 return found;
end $$;
revoke all on function public.create_training_order(uuid,text,text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.confirm_training_order(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.fail_training_order(uuid,text,text) from public,anon,authenticated;
revoke all on function public.check_rate_limit(text,int,int) from public,anon,authenticated;
revoke all on function public.claim_email(uuid) from public,anon,authenticated;
grant execute on function public.create_training_order(uuid,text,text,text,text,uuid), public.confirm_training_order(uuid,text,uuid),public.fail_training_order(uuid,text,text),public.check_rate_limit(text,int,int),public.claim_email(uuid) to service_role;
commit;
