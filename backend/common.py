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


# The languages the app can be shown in (same codes as the browser's js/i18n.js). The AI writes the recipes in
# the chosen language. To add one, add it here and in the browser (see the note at the top of js/i18n.js).
LANGUAGES = {"en": "English", "hi": "Hindi (हिन्दी, in Devanagari script)", "kn": "Kannada (ಕನ್ನಡ, in Kannada script)"}


def parse_lang(body: dict) -> str:
    """The language code from the request. Anything unknown quietly means English."""
    lang = body.get("lang")
    return lang if isinstance(lang, str) and lang in LANGUAGES else "en"


def language_rules(lang: str) -> list[str]:
    """Tells the AI which language to write in (nothing to add for English)."""
    if lang == "en" or lang not in LANGUAGES:
        return []
    return [
        f"- LANGUAGE: write ALL text the user will read in {LANGUAGES[lang]}: dish names (use the name people use "
        "in that language), ingredient names, quantity words, steps, servedWith and tip. Use the everyday words "
        "of a home cook. Keep every step to at most two sentences in this language. Keep the fields slot, difficulty "
        "and art exactly as specified, in English.",
    ]


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


def style_rules(cuisine: str, state: str, region: str | None, has_ingredients: bool = True, diet: str | None = None) -> list[str]:
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
    if sub and diet == "nonveg" and sub.get("nonVegDishes"):
        examples += f". Non-vegetarian examples: {sub['nonVegDishes']}"
    last_rule = (
        "- The ingredients the user has come first: only pick a regional dish that can really be made "
        "from them. Ignore any example dish that breaks the diet rule."
        if has_ingredients
        else "- Ignore any example dish that breaks the diet rule."
    )
    return [
        f"- HOME FOOD: the user is from {label}, India. EVERY dish must be a genuine, authentic dish of everyday "
        f"{label} home cooking{examples}.",
        f"- NO MIXING: do not blend dishes, spices or cooking styles from other Indian states into a dish, and "
        f"do not serve a dish with sides from another region. Keep each meal true to {label}. Widely eaten "
        "everyday items (such as idli, dosa or upma) are fine only when they are really eaten there.",
        last_rule,
    ]


def writing_rules(cuisine: str = "Indian") -> list[str]:
    """How dishes are named and how the steps are written (shared by the menu and the recipe form).

    The examples match the cuisine, so Indian examples never leak into Chinese or Continental recipes.
    """
    if cuisine == "Indian":
        name_rule = (
            "- NAME: use the dish's own traditional name, exactly as it is said at home or printed on a menu in its "
            "region (transliterated into English letters if needed), usually 1 to 4 words. Do NOT add filler such "
            'as "Style", "Special", "Delight", "Homestyle", "Mixed" or the state\'s name, never describe the dish '
            "inside its name, and never join two dishes in one name. Accompaniments go in servedWith."
        )
        cues = '(for example "until the mustard seeds crackle", "until golden and fragrant", "4 whistles")'
    else:
        example = "Spaghetti Aglio e Olio" if cuisine == "Continental" else "Vegetable Hakka Noodles"
        name_rule = (
            f"- NAME: give the dish its real, classic {cuisine} name (for example \"{example}\"). "
            "Never invent bland generic names such as \"Egg rice bowl\". Name ONE dish only."
        )
        cues = '(for example "until golden brown and fragrant", "until the sauce coats the back of a spoon")'
    return [
        name_rule,
        "- STEPS: write them like a warm, experienced home cook talking a beginner through the dish, "
        "5 to 8 steps of two or three sentences each. Give heat levels, timings and what to look, smell and "
        f"listen for {cues}. Say why a step matters when that helps. Start the first step by naming the dish "
        '("To begin making ..."). In the last step, say how to serve it and what goes well with it. '
        "Do not number the steps inside the text.",
    ]
