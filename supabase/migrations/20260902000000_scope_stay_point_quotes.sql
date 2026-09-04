-- get_stay_point_quotes가 cohort_id·device_id 필터 없이 전체 stay_point 응답 중 무작위로
-- 뽑아 보여주고 있었다 — 그래서 (1) "같은 동기 중" 문구와 달리 실제로는 다른 기수의 이야기가
-- 섞여 나올 수 있었고, (2) 방금 자기가 남긴 답변이 "다른 선배들 이야기"로 다시 보이는
-- 버그가 있었다(사용자 리포트). cohort_id로 같은 기수만, device_id로 본인 답변만 제외하도록
-- 좁힌다.
-- 예전 시그니처(필터 없음)는 파라미터가 달라 create or replace로 덮어써지지 않으므로 직접 지운다.
drop function if exists get_stay_point_quotes(integer);

create or replace function get_stay_point_quotes(p_cohort_id uuid, p_device_id text, p_limit integer default 3)
returns table (answer_text text)
language sql stable security definer set search_path = public
as $$
  select coalesce(advice_text, answer_text) as answer_text from responses
  where step = 'stay_point'
    and cohort_id = p_cohort_id
    and device_id <> p_device_id
    and coalesce(advice_text, answer_text) is not null
  order by random()
  limit p_limit;
$$;

grant execute on function get_stay_point_quotes(uuid, text, integer) to anon, authenticated;
