-- 버그: has_completed_cohort()가 "완료"를 flight_risk 응답 존재 여부로 판단하고 있었다.
-- flight_risk는 3/6/9개월 트랙의 첫 질문이라, 첫 질문만 답하고 마지막(stay_menu)까지
-- 못 마친 채 오류로 새로고침하면 "이미 답변을 마쳤어요" 화면이 잘못 떠서 나머지 질문에
-- 다시 접근할 방법이 없어지는 문제가 있었다. 실제 마지막 질문(3/6/9개월은 stay_menu,
-- Stay Point 트랙은 stay_point)에 응답이 있을 때만 완료로 본다.
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
        (c.milestone = 'stay_point' and r.step = 'stay_point')
        or (c.milestone <> 'stay_point' and r.step = 'stay_menu')
      )
  );
$$;
