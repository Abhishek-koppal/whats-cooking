// Feature: My family. Each person's food needs, so plans, recipes and shopping lists suit everyone.
//
// Nobody is added in advance. The details are kept on this phone only (familyStore.js); the AI is only ever given
// food rules (no names, no medical words).

import { el } from "../ui.js";
import { t } from "../i18n.js";
import { icon } from "../icons.js";
import { loadFamily, saveMember, removeMember, RELATIONS, MAX_MEMBERS } from "../familyStore.js";

const textButton = (text, onClick, className = "link") => el("button", { className, text, attrs: { type: "button" }, on: { click: onClick } });

// The note shown above a plan that was made before the family's needs last changed.
// `action` is { text, onClick } or null.
export function staleNotice(action, text = t("family.stale")) {
  return el(
    "div",
    { className: "stale", attrs: { role: "status" } },
    el("p", { text }),
    action ? textButton(action.text, action.onClick) : ""
  );
}

export function initFamily({ container, go }) {
  const back = () => textButton(t("back.home"), () => go("home"), "link back");
  const whoIs = (m) => m.name || t(`family.rel.${m.relation}`);

  // ------------------------------------------------------------ the list

  function chips(m) {
    const items = [];
    if (m.diet) items.push(t(`family.diet.${m.diet}`));
    if (m.allergies) items.push(t("family.chip.allergy", { x: m.allergies }));
    if (m.lowSalt) items.push(t("family.chip.lowSalt"));
    if (m.lowSugar) items.push(t("family.chip.lowSugar"));
    return items;
  }

  function memberCard(m) {
    const lines = [
      m.likes && [t("family.likes"), m.likes],
      m.favourites && [t("family.favourites"), m.favourites],
      m.dislikes && [t("family.dislikes"), m.dislikes],
    ].filter(Boolean);
    return el(
      "li",
      { className: "member" },
      el(
        "div",
        { className: "member-head" },
        el("h3", { text: whoIs(m) }),
        m.name ? el("span", { className: "meta", text: t(`family.rel.${m.relation}`) }) : "",
        textButton(t("family.edit"), () => showForm(m))
      ),
      chips(m).length ? el("div", { className: "chips" }, ...chips(m).map((c) => el("span", { className: "chip", text: c }))) : "",
      ...lines.map(([label, value]) => el("p", { className: "member-line" }, el("strong", { text: label + ": " }), value))
    );
  }

  function showList() {
    const family = loadFamily();
    container.replaceChildren(
      back(),
      el("h2", { text: t("family.title") }),
      el("p", { className: "lead", text: t("family.lead") }),
      family.length ? el("p", { className: "home-note", text: t("family.size", { n: family.length }) }) : "",
      family.length
        ? el("ul", { className: "members" }, ...family.map(memberCard))
        : el("div", { className: "plan-box" }, icon("users", 40), el("p", { text: t("family.empty") })),
      family.length < MAX_MEMBERS
        ? el("button", { className: "primary dark", text: t("family.add"), attrs: { type: "button" }, on: { click: () => showForm(null) } })
        : el("p", { className: "home-note", text: t("family.full", { n: MAX_MEMBERS }) }),
      el("p", { className: "privacy", text: t("family.privacy") })
    );
  }

  // ------------------------------------------------------------ the form

  function field(label, control, hint = "") {
    return el("div", { className: "ff" }, el("label", { text: label }), control, hint ? el("p", { className: "hint", text: hint }) : "");
  }

  const textInput = (value, placeholder, max = 120) => {
    const input = el("input", { attrs: { type: "text", maxlength: String(max), placeholder, autocomplete: "off" } });
    input.value = value ?? "";
    return input;
  };

  const check = (label, on) => {
    const box = el("input", { attrs: { type: "checkbox" } });
    box.checked = on === true;
    return { box, row: el("label", { className: "check" }, box, el("span", { text: label })) };
  };

  function showForm(member) {
    const editing = member !== null;
    const m = member ?? {};

    const relation = el("select", { attrs: { id: "fam-rel" } }, ...RELATIONS.map((r) => el("option", { text: t(`family.rel.${r}`), attrs: { value: r } })));
    relation.value = m.relation ?? "child";
    const name = textInput(m.name, "", 40);
    const diet = el("select", {}, ...["", "veg", "nonveg"].map((d) => el("option", { text: d ? t(`family.diet.${d}`) : t("family.diet.any"), attrs: { value: d } })));
    diet.value = m.diet ?? "";
    const likes = textInput(m.likes, t("family.likes.ph"));
    const favourites = textInput(m.favourites, t("family.favourites.ph"));
    const dislikes = textInput(m.dislikes, t("family.dislikes.ph"));
    const allergies = textInput(m.allergies, t("family.allergies.ph"));
    const bp = check(t("family.bp"), m.lowSalt);
    const diabetes = check(t("family.diabetes"), m.lowSugar);

    const save = () => {
      saveMember({
        id: m.id, relation: relation.value, name: name.value, diet: diet.value, likes: likes.value, favourites: favourites.value,
        dislikes: dislikes.value, allergies: allergies.value, lowSalt: bp.box.checked, lowSugar: diabetes.box.checked,
      });
      showList();
    };

    let sure = false; // deleting takes two taps
    const del = textButton(t("family.delete"), () => {
      if (!sure) {
        sure = true;
        del.textContent = t("family.deleteSure");
        return;
      }
      removeMember(m.id);
      showList();
    }, "link danger");

    container.replaceChildren(
      textButton(t("family.title"), showList, "link back"),
      el("h2", { text: editing ? t("family.form.edit") : t("family.add") }),
      el(
        "form",
        {
          className: "family-form",
          on: { submit: (event) => { event.preventDefault(); save(); } },
        },
        field(t("family.who"), relation),
        field(t("family.name"), name, t("family.nameHint")),
        field(t("family.diet"), diet),
        field(t("family.likes"), likes),
        field(t("family.favourites"), favourites),
        field(t("family.dislikes"), dislikes),
        field(t("family.allergies"), allergies, t("family.allergiesHint")),
        el("fieldset", { className: "health" }, el("legend", { text: t("family.health") }), bp.row, diabetes.row, el("p", { className: "hint", text: t("family.healthNote") })),
        el("button", { className: "primary", text: t("family.save"), attrs: { type: "submit" } }),
        el("div", { className: "form-links" }, textButton(t("family.cancel"), showList), editing ? del : "")
      )
    );
    relation.focus?.();
  }

  return { show: showList };
}
