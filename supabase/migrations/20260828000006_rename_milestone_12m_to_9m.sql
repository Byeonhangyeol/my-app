-- 평가 시점을 12개월에서 9개월로 조정한다 (제품 결정 변경).
alter table cohorts drop constraint cohorts_milestone_check;
update cohorts set milestone = '9m' where milestone = '12m';
alter table cohorts add constraint cohorts_milestone_check check (milestone in ('3m', '6m', '9m', 'stay_point'));
