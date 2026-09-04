-- 응답 자동 집계(14번 작업)와 재확인 체크인(19번 작업)에 필요한 통계·조회 함수들.
-- SECURITY DEFINER로 만들어, anon이 responses 테이블 전체에 직접 접근하지 않고도
-- 필요한 집계 결과만 받아갈 수 있게 한다.

-- 특정 기수·단계의 응답 수 (완료율 표시 등에 사용).
create or replace function get_cohort_step_count(p_cohort_id uuid, p_step text)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::integer from responses where cohort_id = p_cohort_id and step = p_step;
$$;

-- 마찰 지도 선택지별 응답 수 (통계 대시보드·공유 카드에 사용).
create or replace function get_friction_map_stats(p_cohort_id uuid)
returns table (choice text, response_count bigint)
language sql stable security definer set search_path = public
as $$
  select split_part(answer_text, ' — ', 1) as choice, count(*) as response_count
  from responses
  where step = 'friction_map' and cohort_id = p_cohort_id and answer_text is not null
  group by split_part(answer_text, ' — ', 1)
  order by response_count desc;
$$;

-- 이 기기(device_id)가 가장 최근에 고른 마찰 지도 선택지 (재확인 체크인에서 사용).
create or replace function get_latest_friction_map_choice(p_device_id text)
returns text
language sql stable security definer set search_path = public
as $$
  select split_part(answer_text, ' — ', 1)
  from responses
  where device_id = p_device_id and step = 'friction_map' and answer_text is not null
  order by created_at desc
  limit 1;
$$;

-- 공개 수준을 나중에 올릴 때, 같은 기기 식별자로 연결된 과거 응답 전체를 한 번에 갱신한다.
create or replace function update_disclosure_by_device(p_device_id text, p_level text, p_name text default null, p_department text default null)
returns void
language sql security definer set search_path = public
as $$
  update responses
  set disclosure_level = p_level,
      disclosed_name = case when p_level = 'name' then p_name else null end,
      disclosed_department = case when p_level in ('name', 'department') then p_department else null end
  where device_id = p_device_id;
$$;

grant execute on function get_cohort_step_count(uuid, text) to anon, authenticated;
grant execute on function get_friction_map_stats(uuid) to anon, authenticated;
grant execute on function get_latest_friction_map_choice(text) to anon, authenticated;
grant execute on function update_disclosure_by_device(text, text, text, text) to anon, authenticated;
