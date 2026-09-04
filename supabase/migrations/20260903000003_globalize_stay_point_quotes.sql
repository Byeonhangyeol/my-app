-- "1년을 견뎌냈던 이유" 인용문을 같은 기수로 좁히지 말고 전체(기수 무관)에서 무작위로 1개만
-- 뽑도록 바꾼다(사용자 요청) — 이제 3/6/9개월 트랙에서도 같은 카드를 보여줄 것이라, 애초에
-- "같은 기수"라는 개념 자체가 안 맞는다. 참여 인원수(get_cohort_step_count 호출)도 화면에서
-- 빼기로 해서 이 함수와는 이제 무관하다.
drop function if exists get_stay_point_quotes(uuid, text, integer);
create function get_stay_point_quotes(p_device_id text, p_limit integer default 1)
returns table (answer_text text)
language sql security definer set search_path = public
as $$
  with pool as (
    select r.id, coalesce(r.advice_text, r.answer_text) as answer_text
    from responses r
    where r.step = 'stay_point'
      and r.device_id <> p_device_id
      and r.is_exposed = true
      and coalesce(r.advice_text, r.answer_text) is not null
    union all
    select c.id, c.quote_text as answer_text
    from curated_quotes c
    where c.category = 'stay_point_advice' and c.is_exposed = true
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
grant execute on function get_stay_point_quotes(text, integer) to anon, authenticated;
