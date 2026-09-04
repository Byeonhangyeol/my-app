-- 재확인 체크인("저번에 OO 때문에 힘들다고...")이 기기 식별자(device_id)만으로 과거
-- 마찰 지도 답변을 찾다 보니, 완전히 다른 기수(다른 입사월 그룹)에서 같은 브라우저로 우연히
-- 답한 적이 있어도 "저번에 그거"로 묻는 문제가 있었다. 같은 기수(cohort_month) 안에서
-- (예: 3개월→6개월처럼 같은 입사월 그룹의 다음 시점으로 넘어온 경우)의 이전 답변만
-- 인정하도록 좁힌다. 지금 보고 있는 기수 자체(p_cohort_id)는 아직 이 기수에서 답한 적이
-- 없을 때 호출되는 함수라 제외할 필요는 없지만, 혹시 모를 재방문(오류 후 재시도 등)에
-- 자기 자신을 "예전 답변"으로 착각하지 않도록 명시적으로도 제외한다.
drop function if exists get_latest_friction_map_choice(text);

create or replace function get_latest_friction_map_choice(p_device_id text, p_cohort_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select split_part(r.answer_text, ' — ', 1)
  from responses r
  join cohorts c on c.id = r.cohort_id
  where r.device_id = p_device_id
    and r.step = 'friction_map'
    and r.answer_text is not null
    and r.cohort_id <> p_cohort_id
    and c.cohort_month = (select cohort_month from cohorts where id = p_cohort_id)
  order by r.created_at desc
  limit 1;
$$;

grant execute on function get_latest_friction_map_choice(text, uuid) to anon, authenticated;
