-- "지원 부족"도 "기타"처럼 정해진 항목이 아니라 직접 이유를 적는 자유 서술 선택지로 새로
-- 추가했다(FrictionMapStep.tsx). 자유 서술은 소수 인원 통계만 노출되면 서술 내용까지
-- 유추될 수 있어 개인 식별 위험이 있으므로, "기타"와 같은 이유로 신규간호사 공유용 통계에서
-- 제외한다(20260831000001 참고). 행정간호사용 대시보드 집계는 이 함수를 쓰지 않으므로
-- 영향을 받지 않는다.
create or replace function get_friction_map_stats(p_cohort_id uuid)
returns table (choice text, response_count bigint)
language sql stable security definer set search_path = public
as $$
  select split_part(answer_text, ' — ', 1) as choice, count(*) as response_count
  from responses
  where step = 'friction_map'
    and cohort_id = p_cohort_id
    and answer_text is not null
    and split_part(answer_text, ' — ', 1) not in ('기타', '지원 부족')
  group by split_part(answer_text, ' — ', 1)
  order by response_count desc;
$$;
