// Remembers the family's food needs on THIS phone only. Nothing here is ever stored on a server.
//
// What leaves the phone with a request (see forRequest) has no names and no medical words: a role such as "Child",
// food likes and dislikes, allergies, and "low salt" / "low sugar" (what high blood pressure or diabetes mean for food).

const FAMILY_KEY = "wc.family.v1";
export const MAX_MEMBERS = 10;
export const RELATIONS = ["me", "husband", "wife", "child", "parent", "other"];
const TEXT_FIELDS = ["likes", "favourites", "dislikes", "allergies"];
const MAX_TEXT = 120;

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAMILY_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return []; // storage blocked or corrupted: behave as if nothing was saved
  }
}

function write(list) {
  try {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(list));
  } catch {
    // Private browsing can block storage. The family just cannot be remembered.
  }
}

const text = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) : "");

// One member, made safe: only known fields, short single-line text.
function clean(raw) {
  if (!raw || typeof raw !== "object") return null;
  const member = {
    id: typeof raw.id === "string" && raw.id ? raw.id : String(Date.now()) + Math.random().toString(36).slice(2, 6),
    relation: RELATIONS.includes(raw.relation) ? raw.relation : "other",
    name: text(raw.name).slice(0, 40),
    diet: raw.diet === "veg" || raw.diet === "nonveg" ? raw.diet : "",
    lowSalt: raw.lowSalt === true,
    lowSugar: raw.lowSugar === true,
  };
  for (const field of TEXT_FIELDS) member[field] = text(raw[field]);
  return member;
}

export const loadFamily = () => read().map(clean).filter(Boolean).slice(0, MAX_MEMBERS);

// Adds a new member, or replaces the one with the same id. Returns false when the family is full.
export function saveMember(raw) {
  const member = clean(raw);
  const list = loadFamily();
  const at = list.findIndex((m) => m.id === member.id);
  if (at >= 0) list[at] = member;
  else if (list.length < MAX_MEMBERS) list.push(member);
  else return false;
  write(list);
  return true;
}

export const removeMember = (id) => write(loadFamily().filter((m) => m.id !== id));

// What is sent to the backend: no id, no name, nothing medical. Members with nothing to say are left out.
export function forRequest(list = loadFamily()) {
  return list
    .map((m) => ({
      relation: m.relation, diet: m.diet, likes: m.likes, favourites: m.favourites, dislikes: m.dislikes,
      allergies: m.allergies, lowSalt: m.lowSalt, lowSugar: m.lowSugar,
    }))
    .filter((m) => m.diet || m.likes || m.favourites || m.dislikes || m.allergies || m.lowSalt || m.lowSugar);
}

// A short code for the family's food needs. A plan, recipes or shopping list made for other needs is out of date.
// "" when there is nothing to send, so people who never use this feature see no change.
export function familyFingerprint() {
  const sent = forRequest();
  if (!sent.length) return "";
  const json = JSON.stringify(sent);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) hash = ((hash * 33) ^ json.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}
