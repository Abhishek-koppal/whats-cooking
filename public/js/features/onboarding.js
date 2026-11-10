// Feature: the questions (first visit, and when "Change" is tapped).
//   1. Which state are you from?
//   2. (only if we have a follow-up for that state) Which part of it?
//   3. Vegetarian or non-vegetarian?
//   4. How many people do you usually cook for?
// One question per screen, big buttons.

import { STATES, OTHER_STATE, DIETS, subRegionsOf } from "../data/regions.js";
import { DEFAULT_PEOPLE, MIN_PEOPLE, MAX_PEOPLE, isValidPeople } from "../prefs.js";
import { el } from "../ui.js";
import { t, tOr } from "../i18n.js";

export function startOnboarding({ container, initial = null, onDone, onCancel }) {
  const answers = {
    state: initial?.state ?? null,
    region: initial?.region ?? null,
    diet: initial?.diet ?? null,
    people: initial?.people ?? DEFAULT_PEOPLE,
  };
  let step = "state";
  let nextBtn;

  // The "which part?" screen only appears for states that have sub-regions.
  const stepsForNow = () =>
    subRegionsOf(answers.state).length ? ["state", "region", "diet", "people"] : ["state", "diet", "people"];

  const isAnswered = (s) =>
    s === "people" ? isValidPeople(answers.people) : Boolean(s === "state" ? answers.state : s === "region" ? answers.region : answers.diet);

  function go(direction) {
    const steps = stepsForNow();
    const target = steps.indexOf(step) + direction;
    if (target < 0) return onCancel?.();
    if (target >= steps.length) return finish();
    step = steps[target];
    render();
  }

  function finish() {
    const hasRegions = subRegionsOf(answers.state).length > 0;
    onDone({ state: answers.state, region: hasRegions ? answers.region : null, diet: answers.diet, people: answers.people });
  }

  function stateQuestion() {
    const select = el(
      "select",
      { attrs: { "aria-label": t("q.state.aria") } },
      el("option", { text: t("q.state.choose"), attrs: { value: "" } }),
      ...STATES.map((s) => el("option", { text: s, attrs: { value: s } })),
      el("option", { text: t("other.state"), attrs: { value: OTHER_STATE } })
    );
    select.value = answers.state ?? "";
    select.addEventListener("change", () => {
      if (select.value !== answers.state) answers.region = null; // different state, so the old "part" no longer applies
      answers.state = select.value || null;
      nextBtn.disabled = !isAnswered("state");
    });
    return select;
  }

  function choiceQuestion(items, current, onPick) {
    const group = el("div", { className: "choices", attrs: { role: "group" } });
    for (const item of items) {
      const button = el(
        "button",
        { className: "choice", attrs: { type: "button", "aria-pressed": String(item.id === current) } },
        el("strong", { text: item.label }),
        el("span", { text: item.hint ?? "" })
      );
      button.addEventListener("click", () => {
        onPick(item.id);
        for (const other of group.querySelectorAll(".choice")) {
          other.setAttribute("aria-pressed", String(other === button));
        }
        nextBtn.disabled = false;
      });
      group.append(button);
    }
    return group;
  }

  // "−  4  +" for the number of people
  function peopleQuestion() {
    const input = el("input", {
      attrs: { type: "number", min: String(MIN_PEOPLE), max: String(MAX_PEOPLE), inputmode: "numeric", "aria-label": t("q.people.aria") },
    });
    input.value = String(answers.people);

    const set = (n) => {
      answers.people = Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, n));
      input.value = String(answers.people);
      nextBtn.disabled = false;
    };
    input.addEventListener("input", () => {
      const n = Number(input.value);
      answers.people = input.value !== "" && isValidPeople(n) ? n : null; // anything else disables the button
      nextBtn.disabled = !isAnswered("people");
    });

    return el(
      "div",
      { className: "stepper" },
      el("button", { text: "−", attrs: { type: "button", "aria-label": t("q.people.less") }, on: { click: () => set((answers.people ?? DEFAULT_PEOPLE) - 1) } }),
      input,
      el("button", { text: "+", attrs: { type: "button", "aria-label": t("q.people.more") }, on: { click: () => set((answers.people ?? DEFAULT_PEOPLE) + 1) } })
    );
  }

  function render() {
    const steps = stepsForNow();
    const position = steps.indexOf(step);
    const isLast = position === steps.length - 1;

    let title, subtitle, body;
    if (step === "state") {
      title = t("q.state.title");
      subtitle = t("q.state.sub");
      body = stateQuestion();
    } else if (step === "region") {
      title = t("q.region.title", { state: answers.state });
      subtitle = t("q.region.sub");
      body = choiceQuestion(
        subRegionsOf(answers.state).map((r) => ({ id: r.id, label: tOr(`region.${r.id}`, r.label) })),
        answers.region,
        (id) => (answers.region = id)
      );
    } else if (step === "diet") {
      title = t("q.diet.title");
      subtitle = t("q.diet.sub");
      body = choiceQuestion(
        DIETS.map((d) => ({ id: d.id, label: tOr(`diet.${d.id}`, d.label), hint: tOr(`diet.${d.id}.hint`, d.hint) })),
        answers.diet, (id) => (answers.diet = id));
    } else {
      title = t("q.people.title");
      subtitle = t("q.people.sub");
      body = peopleQuestion();
    }

    nextBtn = el("button", {
      className: "primary",
      text: isLast ? t("q.start") : t("q.next"),
      attrs: { type: "button" },
      on: { click: () => go(1) },
    });
    nextBtn.disabled = !isAnswered(step);

    const nav = el("div", { className: "nav" });
    if (position > 0 || onCancel) {
      nav.append(
        el("button", {
          className: "secondary",
          text: position > 0 ? t("q.back") : t("q.cancel"),
          attrs: { type: "button" },
          on: { click: () => go(-1) },
        })
      );
    }
    nav.append(nextBtn);

    container.replaceChildren(el("h2", { text: title }), el("p", { className: "lead", text: subtitle }), body, nav);
  }

  render();
  return { rerender: render }; // main.js calls this when the language is switched
}
