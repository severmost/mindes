import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { formatDeadline } from "../src/utils.js";

const srcDir = new URL("../src/", import.meta.url);
const i18n = readFileSync(new URL("i18n.jsx", srcDir), "utf8");
const translationsSource = i18n.slice(i18n.indexOf("const translations = {"));
const languages = ["en", "ru", "zh", "es", "hi", "pt", "fr", "kk"];
const sections = [...translationsSource.matchAll(/^  (en|ru|zh|es|hi|pt|fr|kk): \{/gm)];

function keysForSection(index) {
  const start = sections[index].index;
  const end = sections[index + 1]?.index ?? translationsSource.indexOf("// ─── Context", start);
  const keys = [...translationsSource.slice(start, end).matchAll(/^\s+"([^"]+)":/gm)].map(match => match[1]);
  assert.equal(keys.length, new Set(keys).size, `Duplicate keys in ${sections[index][1]}`);
  return new Set(keys);
}

test("every supported language has every interface translation", () => {
  assert.deepEqual(sections.map(match => match[1]), languages);
  const english = keysForSection(0);
  for (let index = 1; index < sections.length; index++) {
    const keys = keysForSection(index);
    assert.deepEqual([...keys].sort(), [...english].sort(), sections[index][1]);
  }

  for (const file of readdirSync(srcDir).filter(name => /\.[jt]sx?$/.test(name) && name !== "i18n.jsx")) {
    const source = readFileSync(new URL(file, srcDir), "utf8");
    for (const [, key] of source.matchAll(/\bt\(\s*"([^"]+)"/g)) {
      assert.ok(english.has(key), `${file}: missing translation ${key}`);
    }
  }
});

test("deadline labels follow the selected language", () => {
  const now = new Date(2026, 9, 23, 12, 0);
  const translate = (key, vars) => ({
    "deadline.overdue": "vencido",
    "deadline.todayAt": `hoy ${vars?.time}`,
    "deadline.tomorrowAt": `mañana ${vars?.time}`,
  })[key];
  const at = (day, hour, minute) => new Date(2026, 9, day, hour, minute).toISOString();

  assert.equal(formatDeadline(at(23, 11, 0), translate, now).text, "vencido");
  assert.equal(formatDeadline(at(23, 13, 0), translate, now).text, "hoy 13:00");
  assert.equal(formatDeadline(at(24, 9, 30), translate, now).text, "mañana 09:30");
});
