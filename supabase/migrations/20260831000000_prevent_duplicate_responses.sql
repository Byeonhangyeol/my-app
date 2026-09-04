-- 같은 기기가 같은 기수(cohort)·단계(step)에 답변을 두 번 남기지 못하게 막는다.
-- 기수·시점(milestone)별로 링크가 한 번만 발급되므로, 한 기기는 한 기수당 각 단계를
-- 한 번만 답하면 된다 — 다른 시점(다른 cohort_id)의 재확인 체크인·재방문은 이 제약과 무관하다.
alter table responses
  add constraint responses_device_cohort_step_unique unique (device_id, cohort_id, step);

-- 신규간호사가 같은 기수 링크로 다시 들어왔을 때, 이미 답변을 마쳤는지 확인하는 함수.
-- 3/6/9개월 트랙은 flight_risk, Stay Point 트랙은 stay_point 응답이 있으면 완료로 본다.
create or replace function has_completed_cohort(p_device_id text, p_cohort_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from responses
    where device_id = p_device_id
      and cohort_id = p_cohort_id
      and step in ('flight_risk', 'stay_point')
  );
$$;

grant execute on function has_completed_cohort(text, uuid) to anon, authenticated;
