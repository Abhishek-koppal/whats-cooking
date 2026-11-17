"""Tests for swapping one dish of the weekly plan (/api/swap). Gemini is faked, so no quota is used."""

import pytest

from backend import swap, week
from tests import test_week
from tests.helpers import gemini_ok

PLAN = test_week.GOOD["days"]
BASE = {"state": "Karnataka", "region": "north", "diet": "veg", "start": 0, "days": PLAN, "day": 2, "slot": "dinner", "avoid": [], "tail": []}
CHILD = {"relation": "child", "allergies": "peanuts"}
ME = {"relation": "me", "lowSugar": True}


def values(**changes):
    body = {**BASE, **changes}
    parsed, problem = swap.parse_request(body)
    assert problem is None, problem
    return parsed


def opts(**changes):
    v = values(**changes)
    return swap.options(v["days"], v["day"], v["slot"], v["prefs"]["diet"], v["tail"], v["family"])


def answer(family, name="Fresh new dish", cuisine="regional", base=None):
    return gemini_ok({"name": name, "family": family, "base": base or week.FAMILY_BASE.get(family, "other"), "cuisine": cuisine, "art": "plate", "timeMinutes": 25})


def post(client, **changes):
    return client.post("/api/swap", json={**BASE, **changes})


def a_good_family(**changes):
    return opts(**changes)["families"][0]


# ------------------------------------------------------------ what is allowed in the spot


def test_the_dish_it_replaces_and_its_neighbours_are_not_allowed():
    allowed = opts()["families"]
    assert "veg-curry-meal" not in allowed  # the dish itself: a swap must be a different kind
    for day in (1, 2, 3):  # the day before, the same day and the day after
        for slot in week.SLOTS:
            assert PLAN[day][slot]["family"] not in allowed
    assert allowed  # but plenty remain


def test_only_proper_meals_for_dinner_and_only_snacks_for_snacks():
    assert set(opts()["families"]) <= week.MAIN_FAMILIES
    assert set(opts(slot="snacks")["families"]) <= week.SNACK_FAMILIES
    assert set(opts(slot="breakfast")["families"]) <= week.BREAKFAST_FAMILIES


def test_a_day_keeps_one_staple_per_meal():
    # day 3 has a batter breakfast (idli) and a roti lunch (roti-sabzi), so dinner may be neither
    allowed = opts()
    assert "batter" not in allowed["bases"] and "roti" not in allowed["bases"] and "other" in allowed["bases"]
    assert not {"dosa", "idli-vada", "roti-sabzi", "paratha", "millet-rotti"} & set(allowed["families"])


def test_snacks_may_be_any_staple():
    assert opts(slot="snacks")["bases"] == week.BASES


def test_last_weeks_final_day_blocks_day_one():
    candidate = opts(day=0, slot="lunch")["families"][0]
    assert candidate not in opts(day=0, slot="lunch", tail=[candidate])["families"]
    assert candidate in opts(day=0, slot="lunch")["families"]
    # and only day 1 is affected
    far = next(f for f in opts(day=5, slot="lunch")["families"])
    assert far in opts(day=5, slot="lunch", tail=[far])["families"]


def test_a_family_already_used_twice_is_not_allowed_again():
    plan = [dict(d) for d in PLAN]
    plan[5] = {**plan[5], "lunch": test_week.m("khichdi")}
    plan[6] = {**plan[6], "dinner": test_week.m("khichdi")}  # khichdi twice already, far from day 3
    assert "khichdi" not in opts(days=plan)["families"]
    assert "khichdi" in opts()["families"]


def test_vegetarians_get_no_meat_and_low_sugar_gets_no_sweets():
    assert not week.NONVEG_FAMILIES & set(opts(slot="lunch", day=3)["families"])
    nonveg = opts(diet="nonveg", slot="lunch", day=3)["families"]
    assert week.NONVEG_FAMILIES & set(nonveg)
    assert "sweet-snack" in opts(slot="snacks", day=3)["families"]
    assert "sweet-snack" not in opts(slot="snacks", day=3, family=[ME])["families"]


def test_a_mixed_house_stops_at_the_meat_limit():
    plan = [dict(d) for d in PLAN]
    meaty = ["chicken-curry", "mutton-curry", "fish-curry", "prawn-curry"]
    for i, fam in enumerate(meaty):
        plan[[0, 1, 5, 6][i]] = {**plan[[0, 1, 5, 6][i]], "lunch": test_week.m(fam)}
    allowed = opts(diet="nonveg", days=plan, day=3, slot="dinner", family=[{"relation": "me", "diet": "veg"}])["families"]
    assert not week.NONVEG_FAMILIES & set(allowed)


def test_cuisine_limits_are_kept():
    # a plan with only 5 regional lunches and dinners besides this one: the new one must be regional
    cuisines = ["regional"] * 5 + ["north-indian"] * 4 + ["continental"] * 4 + ["chinese"]  # 14 lunches and dinners
    plan = test_week.plan_from(cuisines=cuisines)["days"]
    assert opts(days=plan, day=3, slot="dinner")["cuisines"] == ["regional"]
    assert "continental" in opts(slot="dinner")["cuisines"]  # the good plan is all regional, so anything goes


def test_nothing_is_forced_for_breakfast_cuisines():
    assert opts(slot="breakfast")["cuisines"] == week.CUISINES


# ------------------------------------------------------------ the request


def test_a_good_swap_returns_the_new_dish(client, sent):
    family = a_good_family()
    sent.reply = answer(family)
    res = post(client)
    assert res.status_code == 200 and len(sent.calls) == 1
    data = res.json()
    assert data["day"] == 2 and data["slot"] == "dinner"
    assert data["meal"]["name"] == "Fresh new dish" and data["meal"]["family"] == family and data["meal"]["art"] == "plate"


def test_the_prompt_marks_the_dish_shows_the_week_and_lists_only_allowed_families(client, sent):
    sent.reply = answer(a_good_family())
    post(client)
    p = sent.prompt
    assert "(TO BE REPLACED)" in p and p.count("(TO BE REPLACED)") == 1
    assert "Wednesday dinner" in p and "Dish dosa" in p and "Dish thali" in p  # the whole week is shown
    assert '    "veg-curry-meal":' not in p  # the dish it replaces is not offered
    assert "strictly vegetarian" in p


def test_the_answer_may_only_use_the_allowed_values(client, sent):
    sent.reply = answer(a_good_family())
    post(client)
    props = sent.last["payload"]["generationConfig"]["responseSchema"]["properties"]
    allowed = opts()
    assert props["family"]["enum"] == allowed["families"]
    assert props["base"]["enum"] == allowed["bases"] and props["cuisine"]["enum"] == allowed["cuisines"]


def test_sunday_lunch_is_the_special_meal(client, sent):
    sent.reply = answer(a_good_family(start=6, day=0, slot="lunch"))
    post(client, start=6, day=0, slot="lunch")
    assert "Sunday lunch is the week's special meal" in sent.prompt


def test_hindi_asks_for_hindi_and_more_time(client, sent):
    sent.reply = answer(a_good_family())
    post(client, lang="hi")
    assert "Hindi" in sent.prompt


def test_recent_dishes_and_the_family_are_sent_as_data(client, sent):
    sent.reply = answer(a_good_family(family=[CHILD]))
    post(client, avoid=["Lemon rice"], family=[CHILD])
    assert "Lemon rice" in sent.prompt and "ALLERGIC OR INTOLERANT TO: peanuts" in sent.prompt


# ------------------------------------------------------------ checking the answer


def test_a_dish_already_on_the_plan_is_retried(client, sent):
    family = a_good_family()
    sent.first = answer(family, name="Dish dosa")
    sent.reply = answer(family, name="Something else")
    res = post(client)
    assert res.status_code == 200 and res.json()["meal"]["name"] == "Something else" and len(sent.calls) == 2
    assert "already on the plan" in sent.prompt  # the retry says what was wrong


def test_a_recently_cooked_dish_is_retried(client, sent):
    family = a_good_family()
    sent.first = answer(family, name="Lemon Rice")
    sent.reply = answer(family, name="Tomato curry")
    res = post(client, avoid=["lemon rice"])
    assert res.json()["meal"]["name"] == "Tomato curry" and "cooked recently" in sent.prompt


def test_an_allergen_is_retried_and_never_returned(client, sent):
    family = a_good_family()
    sent.first = answer(family, name="Peanut curry")
    sent.reply = answer(family, name="Tomato curry")
    res = post(client, family=[CHILD])
    assert res.json()["meal"]["name"] == "Tomato curry" and 'contains "peanuts"' in sent.prompt


def test_a_wrong_staple_is_caught_even_if_the_family_is_allowed(client, sent):
    # a curry the AI tags as roti, on a day that already has roti
    family = next(f for f in opts()["families"] if f not in week.FAMILY_BASE)
    sent.first = answer(family, name="Mixed curry", base="roti")
    sent.reply = answer(family, name="Mixed curry two", base="other")
    res = post(client)
    assert res.status_code == 200 and "two roti meals" in sent.prompt


def test_a_family_that_is_not_allowed_is_never_accepted(client, sent):
    sent.reply = answer("veg-curry-meal")  # the family it replaces
    res = post(client)
    assert res.status_code == 502 and len(sent.calls) == 2  # one retry, then give up


def test_unreadable_answers_fail_cleanly(client, sent):
    sent.reply = gemini_ok("not json")
    assert post(client).status_code in (502, 504)


# ------------------------------------------------------------ the request is checked


@pytest.mark.parametrize(
    "changes",
    [
        {"days": PLAN[:6]}, {"days": "x"}, {"days": [{}] * 7}, {"day": 7}, {"day": -1}, {"day": "x"}, {"slot": "brunch"}, {"slot": None},
        {"start": 9}, {"state": ""}, {"diet": "vegan-ish"},
    ],
)
def test_bad_requests_are_refused_without_asking_the_ai(client, sent, changes):
    assert post(client, **changes).status_code == 400
    assert sent.calls == []


def test_missing_key(client, sent, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY")
    assert post(client).status_code == 500
