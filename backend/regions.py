"""States, regions and diets.

The list lives in public/data/regions.json. The browser reads that file too,
so there is only one list to edit.
"""

import json
from functools import lru_cache
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "public" / "data" / "regions.json"


@lru_cache(maxsize=1)
def _data() -> dict:
    # Read once, then reused for every request.
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def other_state() -> str:
    return _data()["otherState"]


def state_count() -> int:
    return len(_data()["states"])


def is_known_state(state: str) -> bool:
    return state == other_state() or state in _data()["states"]


def sub_regions_of(state: str) -> list[dict]:
    return _data()["subRegions"].get(state, [])


def find_sub_region(state: str, region_id: str | None) -> dict | None:
    for region in sub_regions_of(state):
        if region["id"] == region_id:
            return region
    return None


def is_known_diet(diet: str) -> bool:
    return any(d["id"] == diet for d in _data()["diets"])


def describe_region(state: str, region_id: str | None) -> str:
    """'North Karnataka', or just 'Kerala' when there is no follow-up question, or '' for 'Somewhere else'."""
    if state == other_state():
        return ""
    sub = find_sub_region(state, region_id)
    return sub["label"] if sub else state
