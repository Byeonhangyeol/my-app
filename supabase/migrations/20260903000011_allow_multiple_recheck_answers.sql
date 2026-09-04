-- RecheckStep이 이제 과거에 답했던 마찰 항목 전부(누적)를 하나씩 다시 물어본다 —
-- 예전엔 최신 항목 하나만 물어봐서 "기수당 step 하나" 유니크 제약으로 충분했지만, 이제
-- 같은 기수(cohort_id)에 recheck 답변이 여러 개(항목마다 하나씩) 쌓일 수 있다.
-- friction_map과 같은 "선택지 — 서술" 형식으로 저장하고, 유니크 제약을 recheck에 한해
-- 선택지 단위로 좁힌다 — 같은 항목을 새로고침 후 다시 답하는 경우(진짜 중복)만 막고,
-- 다른 항목에 대한 답은 그대로 허용한다. recheck가 아닌 step은 기존과 완전히 동일하게
-- 동작한다(아래 식이 항상 빈 문자열로 계산되어 (device_id, cohort_id, step)만 남음).
alter table responses drop constraint if exists responses_device_cohort_step_unique;

create unique index responses_device_cohort_step_unique
  on responses (
    device_id,
    cohort_id,
    step,
    (case when step = 'recheck' then split_part(coalesce(answer_text, ''), ' — ', 1) else '' end)
  );
