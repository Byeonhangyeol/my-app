-- 부서만 공개 기능에 부서 정보가 필요하고, 명단 식별을 위해 사번도 추가한다.
alter table nurses add column if not exists department text;
alter table nurses add column if not exists employee_number text;
