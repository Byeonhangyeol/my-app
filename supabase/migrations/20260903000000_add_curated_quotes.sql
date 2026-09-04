-- 행정간호사가 실제 응답과 별개로 "직접 쓴" 문구를 등록해, Stay Menu 공유 인용문·선배 한마디·
-- 후배에게 필요한 것 목록에 섞어서 보여줄 수 있게 한다. gratitude_messages와 달리 세 카테고리를
-- 공유하고 노출 여부를 개별로 끌 수 있어야 해서 category 컬럼을 둔 별도 테이블로 만든다.
-- responses 테이블에 직접 끼워 넣지 않는 이유: cohort_id·device_id가 필수라서 실제 참여자 수
-- 통계(get_cohort_step_count 등)에 가짜 인원이 섞여 들어가기 때문 — 통계는 항상 진짜 응답만
-- 반영해야 한다(CLAUDE.md "없는 데이터를 지어내지 않는다").
create table if not exists curated_quotes (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('stay_menu', 'stay_point_advice', 'stay_point_needs')),
  quote_text text not null,
  is_exposed boolean not null default true,
  created_at timestamptz not null default now()
);

alter table curated_quotes enable row level security;

-- 신규간호사 화면은 이 테이블을 직접 조회하지 않고 아래 두 RPC(둘 다 security definer)를 통해서만
-- 읽으므로, anon에게 별도 select 정책을 열어줄 필요가 없다.
create policy curated_quotes_admin_all on curated_quotes for all to authenticated using (true) with check (true);

-- get_stay_point_quotes: is_exposed 필터가 20260902000000에서 시그니처를 바꾸며 빠졌던 것을
-- 복구하고(노출 체크 해제해도 계속 나가던 버그), curated_quotes(stay_point_advice)도 같은
-- 무작위 뽑기 풀에 섞는다.
create or replace function get_stay_point_quotes(p_cohort_id uuid, p_device_id text, p_limit integer default 3)
returns table (answer_text text)
language sql stable security definer set search_path = public
as $$
  select answer_text from (
    select coalesce(advice_text, answer_text) as answer_text
    from responses
    where step = 'stay_point'
      and cohort_id = p_cohort_id
      and device_id <> p_device_id
      and is_exposed = true
      and coalesce(advice_text, answer_text) is not null
    union all
    select quote_text as answer_text
    from curated_quotes
    where category = 'stay_point_advice' and is_exposed = true
  ) combined
  order by random()
  limit p_limit;
$$;

-- get_previous_stay_menu_quotes에도 curated_quotes(stay_menu)를 섞는다.
create or replace function get_previous_stay_menu_quotes(p_cohort_id uuid, p_limit integer default 3)
returns table (answer_text text)
language sql stable security definer set search_path = public
as $$
  select answer_text from (
    select r.answer_text
    from responses r
    join cohorts c on c.id = r.cohort_id
    where r.step = 'stay_menu'
      and r.is_exposed = true
      and r.answer_text is not null
      and c.milestone = (select milestone from cohorts where id = p_cohort_id)
      and c.cohort_month < (select cohort_month from cohorts where id = p_cohort_id)
    union all
    select quote_text as answer_text
    from curated_quotes
    where category = 'stay_menu' and is_exposed = true
  ) combined
  order by random()
  limit p_limit;
$$;
