-- 재확인 체크인(19번 작업): 다음 시점 대화 시작 시, 이전에 답했던 마찰 항목을 다시 물어보는
-- 질문도 하나의 응답 단계로 저장할 수 있게 'recheck'를 허용 단계에 추가한다.
alter table responses drop constraint responses_step_check;
alter table responses add constraint responses_step_check
  check (step in ('flight_risk', 'friction_map', 'stay_menu', 'stay_point', 'recheck'));
