"""Validate real PostgreSQL migrations; mock only Supabase Auth JWT helpers.
Docker is required. No connection to the user's Supabase project is made.
"""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
NAME = 'formations-db-test-' + uuid.uuid4().hex[:10]
BASE = ['docker', 'exec', NAME, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA']

def sql(value):
    return subprocess.check_output(BASE + ['-c', value], text=True).strip()

def run_file(path):
    subprocess.run(['docker', 'exec', '-i', NAME, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], input=path.read_text(), text=True, check=True, stdout=subprocess.DEVNULL)

try:
    subprocess.run(['docker','run','-d','--name',NAME,'--network','none','-e','POSTGRES_PASSWORD=local-test-only','postgres:17-alpine'],check=True,stdout=subprocess.DEVNULL)
    for attempt in range(100):
        if subprocess.run(['docker','exec',NAME,'pg_isready','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode == 0:
            break
        time.sleep(.2)
    else:
        raise RuntimeError('PostgreSQL did not become ready')
    run_file(ROOT/'tests/database/auth-stub.sql')
    for migration in sorted((ROOT/'supabase/migrations').glob('*.sql')):
        run_file(migration)
    run_file(ROOT/'supabase/seed.sql')
    run_file(ROOT/'supabase/seed.sql')  # Demonstration seed must be repeatable.
    run_file(ROOT/'tests/database/fixture.sql')
    ids = sql('select id from public.orders order by email').splitlines()
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        list(pool.map(lambda order: sql(f"select public.confirm_training_order('{order}')"), ids+ids))
    result=json.loads(sql("select jsonb_build_object('success',count(*) filter(where status='success'),'assigned',count(participant_number),'review',count(*) filter(where manual_review),'unique',count(distinct participant_number)) from public.orders"))
    assert result=={'success':20,'assigned':10,'review':10,'unique':10},result
    assert sql("select count(*) from public.email_logs where type='confirmation'")=='10'
    assert sql("select count(*) from public.order_events where action='payment_verified'")=='20'
    sql('update public.training_sessions set capacity=20')
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        list(pool.map(lambda order: sql(f"select public.confirm_training_order('{order}')"),ids))
    assert sql('select count(distinct participant_number) from public.orders')=='20'
    assert sql('select count(*) from public.orders where manual_review')=='0'
    assert sql("select count(*) from public.email_logs where type='confirmation'")=='20'
    buyer=sql("select id from public.orders where email='buyer@example.test'")
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        claims=list(pool.map(lambda _:sql(f"select public.claim_purchase_event('{buyer}')"),range(5)))
    assert claims.count('t')==1
    sql(f"select public.fail_training_order('{buyer}','ignored','failed')")
    assert sql(f"select status from public.orders where id='{buyer}'")=='success'
    assert sql("select public.check_rate_limit('fixture',2,60)")=='t'
    assert sql("select public.check_rate_limit('fixture',2,60)")=='t'
    assert sql("select public.check_rate_limit('fixture',2,60)")=='f'
    run_file(ROOT/'tests/database/rls-stock.sql')
    print('PASS: five migrations, repeatable seed, concurrent confirmations, idempotency, overflow handling, email deduplication, public/private RLS, admin membership and transactional stock')
finally:
    subprocess.run(['docker','rm','-f',NAME],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
