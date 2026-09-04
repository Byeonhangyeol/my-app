-- 개선 조치 기록도 다른 콘텐츠처럼 하나하나 노출 여부를 고를 수 있게 한다.
alter table admin_actions add column if not exists is_exposed boolean not null default true;

-- Stay Menu 답변을 "같은 시점(milestone)의 이전 기수들" 것만, 항상 익명으로 몇 개 보여주는 기능.
-- (함수가 answer_text만 돌려주므로 disclosure_level·이름·부서와 무관하게 구조적으로 익명 처리된다.)
create or replace function get_previous_stay_menu_quotes(p_cohort_id uuid, p_limit integer default 3)
returns table (answer_text text)
language sql stable security definer set search_path = public
as $$
  select r.answer_text
  from responses r
  join cohorts c on c.id = r.cohort_id
  where r.step = 'stay_menu'
    and r.is_exposed = true
    and r.answer_text is not null
    and c.milestone = (select milestone from cohorts where id = p_cohort_id)
    and c.cohort_month < (select cohort_month from cohorts where id = p_cohort_id)
  order by random()
  limit p_limit;
$$;

grant execute on function get_previous_stay_menu_quotes(uuid, integer) to anon, authenticated;
