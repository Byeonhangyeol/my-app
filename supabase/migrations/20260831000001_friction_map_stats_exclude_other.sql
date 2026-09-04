-- 신규간호사에게 공유되는 마찰 지도 통계에서 "기타"는 제외한다 — 기타 응답은 자유 서술이라
-- 소수 인원의 통계만 노출되면(예: "기타: 100% (1명)") 사실상 그 사람의 서술 내용까지
-- 유추될 수 있어 개인 식별 위험이 있다. 행정간호사용 대시보드 집계는 이 함수를 쓰지 않으므로
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
    and split_part(answer_text, ' — ', 1) <> '기타'
  group by split_part(answer_text, ' — ', 1)
  order by response_count desc;
$$;
