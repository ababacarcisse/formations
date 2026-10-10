\set ON_ERROR_STOP on
begin;
set local role anon;
do $$ declare s jsonb; begin
 s:=public.get_public_sessions();
 if s::text like '%private%' or s::text like '%meeting_link%' or s::text like '%buyer%' then raise exception 'Public projection leaks private data'; end if;
 if jsonb_array_length(s)<>1 then raise exception 'Expected one open session'; end if;
 begin perform * from public.orders;raise exception 'Anonymous order access unexpectedly allowed';exception when insufficient_privilege then null;end;
 begin perform public.confirm_training_order('11111111-1111-4111-8111-111111111111');raise exception 'Anonymous confirmation allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select set_config('request.jwt.claims','{"email":"buyer@example.test"}',true);
do $$ begin
 if not public.is_buyer() then raise exception 'Buyer not recognized'; end if;
 if (select count(*) from public.orders)<>0 then raise exception 'Non-admin reads orders'; end if;
end $$;
insert into public.business_products(id,name,cost,price,stock) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Produit',1000,2000,5);
insert into public.business_clients(id,name,phone) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Client','+221771234567');
select public.record_business_sale('dddddddd-dddd-4ddd-8ddd-dddddddddddd','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',2,2000,1000);
do $$ begin
 if (select stock from public.business_products where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')<>3 then raise exception 'Stock not decremented'; end if;
 begin perform public.record_business_sale('dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,9,2000,2000);raise exception 'Oversell allowed';exception when raise_exception then if sqlerrm<>'Stock insuffisant' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
select set_config('request.jwt.claims','{"email":"other@example.test"}',true);
do $$ begin
 if public.is_buyer() then raise exception 'Unpaid user recognized'; end if;
 if (select count(*) from public.business_products)<>0 then raise exception 'Other user sees products'; end if;
 begin perform public.record_business_sale('dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,1,2000,2000);raise exception 'Unpaid user sale allowed';exception when raise_exception then if sqlerrm<>'Vente non valide' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
select set_config('request.jwt.claims','{"email":"buyer2@example.test"}',true);
do $$ begin
 if not public.is_buyer() then raise exception 'Second buyer not recognized'; end if;
 if (select count(*) from public.business_products)<>0 then raise exception 'Paid buyer sees another owner products'; end if;
end $$;
insert into public.business_products(id,name,cost,price,stock)values('ffffffff-ffff-4fff-8fff-ffffffffffff','Autre produit',1000,2000,3);
do $$ begin
 begin perform public.record_business_sale('ffffffff-ffff-4fff-8fff-ffffffffffff','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',1,2000,2000);raise exception 'Other owner client accepted';exception when raise_exception then if sqlerrm<>'Client introuvable' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select set_config('request.jwt.claims','{"email":"admin@example.test"}',true);
do $$ begin
 if not public.is_admin() then raise exception 'Admin missing'; end if;
 if (select count(*) from public.orders)<>20 then raise exception 'Admin cannot see orders'; end if;
 begin insert into public.admin_users(user_id) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');raise exception 'Admin membership mutation allowed';exception when insufficient_privilege then null;end;
end $$;
rollback;
