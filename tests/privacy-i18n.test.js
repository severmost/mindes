import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { privacyLanguages, privacyTranslations, resolvePrivacyLocale } from "../public/privacy-i18n.js";

const supported = ["en", "ru", "zh", "es", "hi", "pt", "fr", "kk"];

test("privacy policy has every section in all supported languages", () => {
  const html = readFileSync(new URL("../public/privacy.html", import.meta.url), "utf8");
  const htmlKeys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
  const englishKeys = Object.keys(privacyTranslations.en).sort();

  assert.deepEqual(Object.keys(privacyLanguages), supported);
  assert.deepEqual(Object.keys(privacyTranslations), supported);
  assert.equal(htmlKeys.length, new Set(htmlKeys).size);
  assert.deepEqual(htmlKeys.sort(), englishKeys.filter(key => key !== "language"));

  for (const language of supported) {
    const dictionary = privacyTranslations[language];
    assert.deepEqual(Object.keys(dictionary).sort(), englishKeys, language);
    assert.ok(Object.values(dictionary).every(value => typeof value === "string" && value.trim()), language);
  }
});

test("privacy policy prefers a selected language, then saved language, then browser language", () => {
  assert.equal(resolvePrivacyLocale("es", "ru", "fr-FR"), "es");
  assert.equal(resolvePrivacyLocale(null, "kk", "fr-FR"), "kk");
  assert.equal(resolvePrivacyLocale(null, null, "pt-BR"), "pt");
  assert.equal(resolvePrivacyLocale("xx", null, "de-DE"), "en");
});
