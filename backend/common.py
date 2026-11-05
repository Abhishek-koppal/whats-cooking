"""Helpers shared by every endpoint: replies, number parsing, preference checks and prompt rules."""

from fastapi.responses import JSONResponse

from . import regions


def reply(data: dict, status: int = 200) -> JSONResponse:
    return JSONResponse(data, status_code=status, headers={"Cache-Control": "no-store"})


def error(message: str, status: int) -> JSONResponse:
    return reply({"error": message}, status)


def to_int(value) -> int | None:
    """Accepts 2, 2.0 and "2". Rejects 2.5, "abc", true, null."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, (float, str)):
        try:
            number = float(value)
        except ValueError:
            return None
        return int(number) if number.is_integer() else None
    return None


def parse_preferences(body: dict) -> tuple[dict | None, str | None]:
    """Checks the person's saved answers (state, part of state, diet).

    Returns ({"state", "region", "diet"}, None) or (None, friendly_error_message).
    """
    state = str(body.get("state") or "")
    region_id = str(body["region"]) if body.get("region") else None
    diet = str(body.get("diet") or "")

    if not regions.is_known_state(state):
        return None, "Please tell me which state you are from."
    if not regions.is_known_diet(diet):
        return None, "Please choose vegetarian or non-vegetarian."

    # Only states with a follow-up question (like Karnataka) need a region.
    region = None
    if regions.sub_regions_of(state):
        if not regions.find_sub_region(state, region_id):
            return None, f"Please choose which part of {state}."
        region = region_id

    return {"state": state, "region": region, "diet": diet}, None


# ---------------------------------------------------------------- prompt rules


def diet_rules(diet: str) -> list[str]:
    if diet == "veg":
        return [
            "- DIET: the user is strictly vegetarian. Use no meat, poultry, fish, seafood or eggs, "
            "and no gelatin or meat stock. If the user listed any of those ingredients, leave them out "
            "and say so in the tip."
        ]
    return [
        "- DIET: the user eats non-vegetarian food, so meat, fish and eggs are all fine. "
        "Vegetarian dishes are fine too."
    ]


def style_rules(cuisine: str, state: str, region: str | None, has_ingredients: bool = True) -> list[str]:
    """The home region only shapes Indian food.

    Continental and Chinese are made in their own style, with no regional twist and no fusion.
    Only the diet rule still applies to them.
    """
    if cuisine != "Indian":
        style = "Continental (European-style)" if cuisine == "Continental" else cuisine
        return [
            f"- STYLE: make a genuine {style} dish. Do not mix in Indian or regional home-cooking "
            "styles, spices or dishes, and do not make a fusion dish. "
            "The user's home region does not apply to this cuisine."
        ]
    if state == regions.other_state():
        return []

    label = regions.describe_region(state, region)
    sub = regions.find_sub_region(state, region)
    examples = f", for example: {sub['dishes']}" if sub else ""
    last_rule = (
        "- The ingredients the user has come first: only pick a regional dish that can really be made "
        "from them. Ignore any example dish that breaks the diet rule."
        if has_ingredients
        else "- Ignore any example dish that breaks the diet rule."
    )
    return [
        f"- HOME FOOD: the user is from {label}, India. Mostly suggest dishes typical of everyday "
        f"{label} home cooking{examples}.",
        "- Now and then, other popular everyday Indian dishes (such as idli, dosa, poha or upma) "
        "are fine for variety.",
        last_rule,
    ]
