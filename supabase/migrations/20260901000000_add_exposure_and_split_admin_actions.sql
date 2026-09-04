-- 응답 하나하나를 신규간호사 공유용으로 노출할지 행정간호사가 개별로 고를 수 있게 한다.
-- 기본값 true — 지금까지처럼 전부 노출되던 상태를 유지하고, 이후 관리 화면에서 개별로 끌 수 있다.
alter table responses add column if not exists is_exposed boolean not null default true;

-- 개선 조치 기록을 "문제점"/"개선점" 두 칸으로 나눈다. 아직 저장된 기록이 없어 데이터 이관 없이 교체한다.
alter table admin_actions add column if not exists problem_text text;
alter table admin_actions add column if not exists improvement_text text;
alter table admin_actions drop column if exists content;

-- 신규간호사에게 노출되는 통계·문구는 is_exposed = true인 응답만 집계하도록 갱신.
-- (행정간호사 자신의 대시보드 통계는 클라이언트에서 전체 응답으로 따로 계산하므로 영향 없음.)
create or replace function get_friction_map_stats(p_cohort_id uuid)
returns table (choice text, response_count bigint)
language sql stable security definer set search_path = public
as $$
  select split_part(answer_text, ' — ', 1) as choice, count(*) as response_count
  from responses
  where step = 'friction_map'
    and cohort_id = p_cohort_id
    and is_exposed = true
    and answer_text is not null
    and split_part(answer_text, ' — ', 1) <> '기타'
  group by split_part(answer_text, ' — ', 1)
  order by response_count desc;
$$;

create or replace function get_cohort_step_count(p_cohort_id uuid, p_step text)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::integer from responses
  where cohort_id = p_cohort_id and step = p_step and is_exposed = true;
$$;

create or replace function get_stay_point_quotes(p_limit integer default 3)
returns table (answer_text text)
language sql stable security definer set search_path = public
as $$
  select coalesce(advice_text, answer_text) as answer_text from responses
  where step = 'stay_point' and is_exposed = true and coalesce(advice_text, answer_text) is not null
  order by random()
  limit p_limit;
$$;
