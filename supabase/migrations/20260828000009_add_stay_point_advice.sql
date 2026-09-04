-- 선배 한마디 카드(18번 작업): Stay Point 응답 중 "선배 한마디"로 골라 쓸 수 있게, 원래 답변과
-- 별도로 다듬어진 문구를 담는 advice_text 컬럼을 추가한다 (없으면 원래 답변을 그대로 쓴다).
alter table responses add column if not exists advice_text text;

-- 이 기기(device_id)가 이 기수에서 지금까지 남긴 답변 전체 (공개 범위 재확인 등에 사용).
create or replace function get_my_session_answers(p_device_id text, p_cohort_id uuid)
returns table (step text, answer_text text, advice_text text)
language sql stable security definer set search_path = public
as $$
  select step, answer_text, advice_text
  from responses
  where device_id = p_device_id and cohort_id = p_cohort_id
  order by created_at asc;
$$;

-- 선배 한마디 카드에 무작위로 노출할 Stay Point 문구 몇 개.
create or replace function get_stay_point_quotes(p_limit integer default 3)
returns table (answer_text text)
language sql stable security definer set search_path = public
as $$
  select coalesce(advice_text, answer_text) as answer_text from responses
  where step = 'stay_point' and coalesce(advice_text, answer_text) is not null
  order by random()
  limit p_limit;
$$;

grant execute on function get_my_session_answers(text, uuid) to anon, authenticated;
grant execute on function get_stay_point_quotes(integer) to anon, authenticated;
