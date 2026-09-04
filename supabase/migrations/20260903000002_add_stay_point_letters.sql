-- 1년을 먼저 견딘 선배가 후배에게 남기는 말 — 기존 8개 선택지 구조(stay_point_needs)와
-- 달리 자유 서술형 글이라 새 카테고리로 분리한다. 실제 응답에서 뽑는 게 아니라 전부
-- 행정간호사가 직접 쓴 글이라(curated_quotes만 있고 매칭되는 responses 목록이 없음),
-- Stay Point 트랙에 별도 카드(StayPointLetterCard)로 보여준다.
alter table curated_quotes drop constraint curated_quotes_category_check;
alter table curated_quotes add constraint curated_quotes_category_check
  check (category in ('stay_menu', 'stay_point_advice', 'stay_point_needs', 'stay_point_letter'));

-- get_stay_point_quotes·get_previous_stay_menu_quotes와 같은 패턴 — 기기별로 이미 본 글은
-- quote_impressions에 남겨서 제외하고, 다 보여준 뒤에만 어쩔 수 없이 중복 허용한다.
-- 실제 응답과 섞이지 않는 순수 curated 콘텐츠라 cohort_id 스코프가 없다.
create function get_stay_point_letters(p_device_id text, p_limit integer default 1)
returns table (answer_text text)
language sql security definer set search_path = public
as $$
  with pool as (
    select id, quote_text as answer_text
    from curated_quotes
    where category = 'stay_point_letter' and is_exposed = true
  ),
  unseen_picked as (
    select pool.id, pool.answer_text
    from pool
    where not exists (
      select 1 from quote_impressions qi where qi.device_id = p_device_id and qi.quote_id = pool.id
    )
    order by random()
    limit p_limit
  ),
  fallback_picked as (
    select pool.id, pool.answer_text
    from pool
    where pool.id not in (select id from unseen_picked)
    order by random()
    limit greatest(p_limit - (select count(*) from unseen_picked), 0)
  ),
  chosen as (
    select * from unseen_picked
    union all
    select * from fallback_picked
  ),
  record_impressions as (
    insert into quote_impressions (device_id, quote_id)
    select p_device_id, id from chosen
    on conflict (device_id, quote_id) do nothing
    returning 1
  )
  select answer_text from chosen;
$$;
grant execute on function get_stay_point_letters(text, integer) to anon, authenticated;
