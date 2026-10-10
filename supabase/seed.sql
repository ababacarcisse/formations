insert into public.training_sessions(id,title,status,capacity,registration_deadline,meeting_link,whatsapp_group_link)
values('11111111-1111-4111-8111-111111111111','Session de démonstration','draft',30,now()+interval '7 days',null,null) on conflict(id) do nothing;
insert into public.session_meetings(session_id,meeting_number,title,starts_at)
select '11111111-1111-4111-8111-111111111111',n,t,now()+interval '10 days'+make_interval(days => 2*(n-1))
from (values(1,'Fournisseurs et négociation'),(2,'Commande et expédition'),(3,'Réception chez le transitaire')) as m(n,t)
on conflict(session_id,meeting_number) do nothing;
-- The seed stays draft: add real meeting links and dates before opening it.
