-- StayPointRecallCard("선생님은 예전에 이거때매 힘들어 하셨었네요")가 이 기기의 과거 마찰
-- 지도 답변을 하나(가장 최근 것)만 보여주고 있었는데, 여러 번(3개월·6개월·9개월 등) 답한
-- 경우 전부 누적으로, 그리고 고른 선택지와 직접 적은 서술을 모두 원문 그대로 보여달라는
-- 요청에 따라 새 함수를 추가한다. 기존 get_latest_friction_map_answer(설명만, 최신 1개)는
-- 이 카드에서만 쓰였는데 더 이상 필요 없어 지운다 — get_latest_friction_map_choice(선택지만,
-- 최신 1개, RecheckStep이 씀)는 그대로 둔다.
drop function if exists get_latest_friction_map_answer(text, uuid);

create or replace function get_friction_map_history(p_device_id text, p_cohort_id uuid)
returns table (choice text, description text)
language sql stable security definer set search_path = public
as $$
  select
    split_part(r.answer_text, ' — ', 1) as choice,
    case
      when position(' — ' in r.answer_text) > 0
        then substring(r.answer_text from position(' — ' in r.answer_text) + 3)
      else null
    end as description
  from responses r
  join cohorts c on c.id = r.cohort_id
  where r.device_id = p_device_id
    and r.step = 'friction_map'
    and r.answer_text is not null
    and r.cohort_id <> p_cohort_id
    and c.cohort_month = (select cohort_month from cohorts where id = p_cohort_id)
  order by r.created_at asc;
$$;

grant execute on function get_friction_map_history(text, uuid) to anon, authenticated;
