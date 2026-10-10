begin;
create or replace function public.is_buyer() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.orders where lower(email)=lower(auth.jwt()->>'email') and status='success' and not manual_review)
$$;
revoke all on function public.is_buyer() from public;
grant execute on function public.is_buyer() to authenticated;
create table public.business_products(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users, name text not null, cost numeric(12,2) not null check(cost>=0),price numeric(12,2) not null check(price>=0),stock int not null default 0 check(stock>=0),low_stock int not null default 3 check(low_stock>=0),created_at timestamptz not null default now());
create table public.business_clients(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users,name text not null,phone text not null,created_at timestamptz not null default now());
create table public.business_sales(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users,product_id uuid not null references public.business_products,client_id uuid references public.business_clients,quantity int not null check(quantity>0),unit_price numeric(12,2) not null check(unit_price>=0),unit_cost numeric(12,2) not null check(unit_cost>=0),paid numeric(12,2) not null check(paid>=0),created_at timestamptz not null default now(),check(paid<=quantity*unit_price));
create table public.business_expenses(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users,description text not null,category text not null,amount numeric(12,2) not null check(amount>0),created_at timestamptz not null default now());
do $$ declare t text; begin foreach t in array array['business_products','business_clients','business_sales','business_expenses'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy buyer_own on public.%I for all to authenticated using (user_id=auth.uid() and public.is_buyer()) with check(user_id=auth.uid() and public.is_buyer())',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop; end $$;
-- Sales cannot bypass the stock transaction.
revoke insert,update,delete on public.business_sales from authenticated;
create or replace function public.record_business_sale(p_product uuid,p_client uuid,p_quantity int,p_price numeric,p_paid numeric) returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.business_products; result uuid; begin
 if not public.is_buyer() or p_quantity<1 or p_price<0 or p_paid<0 or p_paid>p_quantity*p_price then raise exception 'Vente non valide'; end if;
 select * into p from public.business_products where id=p_product and user_id=auth.uid() for update;
 if not found or p.stock<p_quantity then raise exception 'Stock insuffisant'; end if;
 if p_client is not null and not exists(select 1 from public.business_clients where id=p_client and user_id=auth.uid()) then raise exception 'Client introuvable'; end if;
 update public.business_products set stock=stock-p_quantity where id=p_product;
 insert into public.business_sales(user_id,product_id,client_id,quantity,unit_price,unit_cost,paid) values(auth.uid(),p_product,p_client,p_quantity,p_price,p.cost,p_paid) returning id into result;
 return result;
end $$;
-- SECURITY DEFINER is necessary for the insertion grant; every owner check is explicit.
alter function public.record_business_sale(uuid,uuid,int,numeric,numeric) security definer;
revoke all on function public.record_business_sale(uuid,uuid,int,numeric,numeric) from public;
grant execute on function public.record_business_sale(uuid,uuid,int,numeric,numeric) to authenticated;
create or replace function public.pay_business_debt(p_sale uuid,p_amount numeric) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_buyer() or p_amount<=0 then raise exception 'Règlement non valide'; end if;
 update public.business_sales set paid=paid+p_amount where id=p_sale and user_id=auth.uid() and paid+p_amount<=quantity*unit_price;
 if not found then raise exception 'Dette introuvable ou montant excessif'; end if;
end $$;
revoke all on function public.pay_business_debt(uuid,numeric) from public;
grant execute on function public.pay_business_debt(uuid,numeric) to authenticated;
commit;
