begin;
alter table public.orders add column tracking_claimed_at timestamptz;
alter table public.orders add column payment_checked_at timestamptz;
create or replace function public.claim_payment_check(p_order uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin update public.orders set payment_checked_at=now() where id=p_order and (payment_checked_at is null or payment_checked_at<now()-interval '15 seconds');return found;end $$;
revoke all on function public.claim_payment_check(uuid) from public,anon,authenticated;
grant execute on function public.claim_payment_check(uuid) to service_role;
create or replace function public.claim_purchase_event(p_order uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin update public.orders set tracking_claimed_at=now() where id=p_order and status='success' and tracking_claimed_at is null;return found;end $$;
revoke all on function public.claim_purchase_event(uuid) from public,anon,authenticated;
grant execute on function public.claim_purchase_event(uuid) to service_role;
alter table public.email_logs drop constraint email_logs_status_check;
alter table public.email_logs add constraint email_logs_status_check check(status in ('queued','sending','sent','failed','skipped'));
commit;
