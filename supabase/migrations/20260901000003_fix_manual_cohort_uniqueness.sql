-- 버그: 수동(직접 선택) 기수는 cohort_month를 "만든 날짜"로 채우는데, 기존 유니크 제약
-- (cohort_month, milestone)이 자동 기수와 수동 기수를 구분하지 않아서, 같은 날 같은 시점으로
-- 두 번째 수동 기수를 만들면 무조건 충돌해 "기수 생성에 실패했어요" 에러가 났다.
-- 자동 기수(입사월 기준)는 여전히 (cohort_month, milestone) 조합이 유일해야 하지만,
-- 수동 기수는 애초에 cohort_month가 실제 의미 없는 값이라 그 제약에서 제외한다.
alter table cohorts drop constraint if exists cohorts_month_milestone_unique;

create unique index if not exists cohorts_month_milestone_unique_auto
  on cohorts (cohort_month, milestone)
  where is_manual = false;
