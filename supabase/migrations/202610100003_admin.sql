begin;
create or replace function public.save_training_session(p_id uuid,p_session jsonb,p_meetings jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; item jsonb; begin
 if jsonb_array_length(p_meetings)<>3 then raise exception 'Trois séances requises'; end if;
 if p_id is not null then
 perform 1 from public.training_sessions where id=p_id for update;
 if not found then raise exception 'Session introuvable'; end if;
 if (p_session->>'capacity')::int < (select count(*) from public.orders where session_id=p_id and status='success') then raise exception 'Capacité inférieure aux inscriptions payées'; end if;
 update public.training_sessions set title=p_session->>'title',status=p_session->>'status',capacity=(p_session->>'capacity')::int,
 registration_deadline=(p_session->>'registration_deadline')::timestamptz,meeting_link=nullif(p_session->>'meeting_link',''),whatsapp_group_link=nullif(p_session->>'whatsapp_group_link',''),notes=p_session->>'notes' where id=p_id returning id into result;
 else
 insert into public.training_sessions(title,status,capacity,registration_deadline,meeting_link,whatsapp_group_link,notes)
 values(p_session->>'title',p_session->>'status',(p_session->>'capacity')::int,(p_session->>'registration_deadline')::timestamptz,nullif(p_session->>'meeting_link',''),nullif(p_session->>'whatsapp_group_link',''),p_session->>'notes') returning id into result;
 end if;
 for item in select value from jsonb_array_elements(p_meetings) loop
 insert into public.session_meetings(session_id,meeting_number,title,starts_at,duration_minutes)
 values(result,(item->>'meeting_number')::int,item->>'title',(item->>'starts_at')::timestamptz,(item->>'duration_minutes')::int)
 on conflict(session_id,meeting_number) do update set title=excluded.title,starts_at=excluded.starts_at,duration_minutes=excluded.duration_minutes;
 end loop;
 return result;
end $$;
create or replace function public.refund_training_order(p_order uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare sid uuid; begin
 select session_id into sid from public.orders where id=p_order;
 perform 1 from public.training_sessions where id=sid for update;
 update public.orders set status='refunded',manual_review=false,updated_at=now() where id=p_order and status='success';
 if not found then raise exception 'Seul un paiement confirmé peut être marqué remboursé'; end if;
 insert into public.order_events(order_id,action,actor)values(p_order,'marked_refunded',p_actor);
end $$;
revoke all on function public.save_training_session(uuid,jsonb,jsonb),public.refund_training_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_training_session(uuid,jsonb,jsonb),public.refund_training_order(uuid,uuid) to service_role;
commit;
