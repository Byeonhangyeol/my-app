-- "선배 한마디"·"Stay Menu 이전 기수 인용문"이 매번 무작위로 새로 뽑히기만 해서, 같은 사람에게
-- 같은 문구가 반복해서 보일 수 있었다(사용자 리포트). 기기별로 이미 보여준 문구를 기억해두고,
-- 다음에는 그 기기가 아직 못 본 문구를 우선 뽑도록 한다. 풀을 다 보여준 뒤에는(더 뽑을 새 문구가
-- 없으면) 어쩔 수 없이 이미 본 것 중에서 채운다 — 안 그러면 문구가 하나도 안 뜨는 게 더 이상하다.
create table if not exists quote_impressions (
  device_id text not null,
  quote_id uuid not null,
  shown_at timestamptz not null default now(),
  primary key (device_id, quote_id)
);

alter table quote_impressions enable row level security;
-- anon·authenticated에 별도 정책을 열지 않는다 — 아래 두 security definer 함수(소유자 postgres,
-- RLS를 우회함)를 통해서만 쓰고 읽는 내부 장부용 테이블이다.

drop function if exists get_stay_point_quotes(uuid, text, integer);
create function get_stay_point_quotes(p_cohort_id uuid, p_device_id text, p_limit integer default 3)
returns table (answer_text text)
language sql security definer set search_path = public
as $$
  with pool as (
    select r.id, coalesce(r.advice_text, r.answer_text) as answer_text
    from responses r
    where r.step = 'stay_point'
      and r.cohort_id = p_cohort_id
      and r.device_id <> p_device_id
      and r.is_exposed = true
      and coalesce(r.advice_text, r.answer_text) is not null
    union all
    select c.id, c.quote_text as answer_text
    from curated_quotes c
    where c.category = 'stay_point_advice' and c.is_exposed = true
  ),
  unseen_picked as (
    select pool.id, pool.answer_text
    from pool
    where not exists (
      select 1 from quote_impressions qi where qi.device_id = p_device_id and qi.quote_id = pool.id
    )
    order by random()
    limit p_limit
  ),
  fallback_picked as (
    select pool.id, pool.answer_text
    from pool
    where pool.id not in (select id from unseen_picked)
    order by random()
    limit greatest(p_limit - (select count(*) from unseen_picked), 0)
  ),
  chosen as (
    select * from unseen_picked
    union all
    select * from fallback_picked
  ),
  record_impressions as (
    insert into quote_impressions (device_id, quote_id)
    select p_device_id, id from chosen
    on conflict (device_id, quote_id) do nothing
    returning 1
  )
  select answer_text from chosen;
$$;
grant execute on function get_stay_point_quotes(uuid, text, integer) to anon, authenticated;

-- get_previous_stay_menu_quotes에는 device_id 파라미터가 아예 없었다 — 기기별 노출 이력을
-- 추적하려면 필요해서 새로 추가한다(시그니처가 바뀌므로 기존 함수를 지우고 새로 만든다).
drop function if exists get_previous_stay_menu_quotes(uuid, integer);
create function get_previous_stay_menu_quotes(p_cohort_id uuid, p_device_id text, p_limit integer default 3)
returns table (answer_text text)
language sql security definer set search_path = public
as $$
  with pool as (
    select r.id, r.answer_text
    from responses r
    join cohorts c on c.id = r.cohort_id
    where r.step = 'stay_menu'
      and r.is_exposed = true
      and r.answer_text is not null
      and c.milestone = (select milestone from cohorts where id = p_cohort_id)
      and c.cohort_month < (select cohort_month from cohorts where id = p_cohort_id)
    union all
    select c2.id, c2.quote_text as answer_text
    from curated_quotes c2
    where c2.category = 'stay_menu' and c2.is_exposed = true
  ),
  unseen_picked as (
    select pool.id, pool.answer_text
    from pool
    where not exists (
      select 1 from quote_impressions qi where qi.device_id = p_device_id and qi.quote_id = pool.id
    )
    order by random()
    limit p_limit
  ),
  fallback_picked as (
    select pool.id, pool.answer_text
    from pool
    where pool.id not in (select id from unseen_picked)
    order by random()
    limit greatest(p_limit - (select count(*) from unseen_picked), 0)
  ),
  chosen as (
    select * from unseen_picked
    union all
    select * from fallback_picked
  ),
  record_impressions as (
    insert into quote_impressions (device_id, quote_id)
    select p_device_id, id from chosen
    on conflict (device_id, quote_id) do nothing
    returning 1
  )
  select answer_text from chosen;
$$;
grant execute on function get_previous_stay_menu_quotes(uuid, text, integer) to anon, authenticated;
