-- 같은 기수·같은 시점에 링크가 중복 생성되는 것을 DB 단에서 막는다.
alter table cohorts add constraint cohorts_month_milestone_unique unique (cohort_month, milestone);
