-- 1) 3/6/9개월 트랙의 "같은 시점의 선배들은 이렇게 말했어요"(StayMenuPeerQuotesCard, 이전
--    기수 인용문)를 없애고, 같은 기수(동기) 내에서 Stay Menu 응답이 어떻게 갈렸는지 보여주는
--    통계 카드로 대체한다(사용자 요청). Stay Menu는 객관식(OPTIONS)이지만 "기타 직접 입력"을
--    고르면 자유 서술 원문이 그대로 answer_text에 들어가므로, 정해진 선택지 목록에 없는
--    답변은 전부 "기타"로 묶어야 통계가 의미 있다(사람마다 다르게 적어도 항목이 무한정
--    늘어나지 않도록).
create or replace function get_stay_menu_stats(p_cohort_id uuid)
returns table (choice text, response_count bigint)
language sql stable security definer set search_path = public
as $$
  select
    case
      when answer_text in (
        '조금 더 긴 적응기간', '업무량·담당업무 조정', '충분한 휴식·쉬는 시간',
        '편하게 질문할 수 있는 사람', '업무에 맞는 추가 교육', '잘하고 있다는 인정·격려',
        '근무표·교대근무 조정', '급여·보상 개선', '당장은 잘 모르겠어요'
      ) then answer_text
      else '기타'
    end as choice,
    count(*) as response_count
  from responses
  where step = 'stay_menu'
    and cohort_id = p_cohort_id
    and is_exposed = true
    and answer_text is not null
  group by 1
  order by response_count desc;
$$;

grant execute on function get_stay_menu_stats(uuid) to anon, authenticated;

-- 2) StayPointRecallCard("선생님은 예전에 이거 때문에 힘들어 하셨었네요")는 다른 신규간호사가
--    아니라 딱 그 답을 썼던 본인(같은 device_id)에게만 보여주는 카드라, 마찰 지도 선택지
--    이름만이 아니라 그때 실제로 적었던 자유 서술(이유)까지 보여줘도 된다(사용자 확인 -
--    "다른 신규 말고 같은 디바이스를 쓴 사람에게는 노출시켜줘"). get_latest_friction_map_choice는
--    RecheckStep("저번에 OO 때문에...")이 짧은 선택지 이름만 필요해서 그대로 두고, 이 카드
--    전용으로 이유(있으면 이유, 없으면 선택지 그대로)를 돌려주는 함수를 새로 만든다.
create or replace function get_latest_friction_map_answer(p_device_id text, p_cohort_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when position(' — ' in r.answer_text) > 0
      then substring(r.answer_text from position(' — ' in r.answer_text) + 3)
    else r.answer_text
  end
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

grant execute on function get_latest_friction_map_answer(text, uuid) to anon, authenticated;
