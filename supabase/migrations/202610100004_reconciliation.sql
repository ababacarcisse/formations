begin;
create table public.webhook_inbox(id text primary key,payment_id text not null,event text not null,processed boolean not null default false,error text,created_at timestamptz not null default now());
alter table public.webhook_inbox enable row level security;
revoke all on public.webhook_inbox from anon,authenticated;
create policy admin_read on public.webhook_inbox for select to authenticated using(public.is_admin());
grant select on public.webhook_inbox to authenticated;
-- Local idempotency is mandatory: hosted SasPay checkout ignores Idempotency-Key.
create or replace function public.create_training_order(p_session uuid,p_name text,p_email text,p_phone text,p_hash text,p_key uuid,p_amount numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.training_sessions; result uuid; existing public.orders; begin
 select * into s from public.training_sessions where id=p_session for update;
 select * into existing from public.orders where idempotency_key=p_key;
 if found then
 if existing.session_id<>p_session or existing.email<>lower(p_email) or existing.full_name<>p_name or existing.phone<>p_phone or existing.amount<>p_amount then raise exception 'Intention différente'; end if;
 return existing.id;
 end if;
 if s.id is null or s.status<>'open' or s.registration_deadline<=now() then raise exception 'Session fermée'; end if;
 if p_amount<=0 then raise exception 'Montant invalide'; end if;
 if (select count(*) from public.session_meetings where session_id=p_session)<>3 then raise exception 'Session incomplète'; end if;
 if (select count(*) from public.orders where session_id=p_session and status='success')>=s.capacity then raise exception 'Session complète'; end if;
 insert into public.orders(session_id,full_name,email,phone,amount,access_token_hash,idempotency_key)values(p_session,p_name,lower(p_email),p_phone,p_amount,p_hash,p_key) returning id into result;
 return result;
end $$;
revoke all on function public.create_training_order(uuid,text,text,text,text,uuid,numeric) from public,anon,authenticated;
grant execute on function public.create_training_order(uuid,text,text,text,text,uuid,numeric) to service_role;
drop function public.create_training_order(uuid,text,text,text,text,uuid);
commit;
