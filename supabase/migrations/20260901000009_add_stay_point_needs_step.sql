-- Stay Point 트랙에 두 번째 질문(후배가 버티려면 무엇이 필요할지)을 추가하면서 생긴
-- 새 step 값을 허용한다(20260828000008과 같은 패턴).
alter table responses drop constraint responses_step_check;
alter table responses add constraint responses_step_check
  check (step in ('flight_risk', 'friction_map', 'stay_menu', 'stay_point', 'stay_point_needs', 'recheck'));

-- Stay Point 트랙의 완료 기준을 "마지막 질문(stay_point_needs)에 답했는지"로 맞춘다 —
-- 첫 질문(stay_point)만 답하고 두 번째 질문 전에 오류로 이탈하면 완료로 보면 안 된다
-- (20260901000004와 같은 이유: has_completed_cohort는 트랙의 진짜 마지막 단계만 봐야 한다).
create or replace function has_completed_cohort(p_device_id text, p_cohort_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from responses r
    join cohorts c on c.id = r.cohort_id
    where r.device_id = p_device_id
      and r.cohort_id = p_cohort_id
      and (
        (c.milestone = 'stay_point' and r.step = 'stay_point_needs')
        or (c.milestone <> 'stay_point' and r.step = 'stay_menu')
      )
  );
$$;
