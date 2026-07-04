const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ar", label: "Arabic" },
];

export function getSupportedLanguages() {
  return SUPPORTED_LANGS;
}

export function isValidLang(code) {
  return SUPPORTED_LANGS.some((l) => l.code === code);
}

export async function translateText(text, targetLang, sourceLang = "auto") {
  if (!text?.trim()) {
    return { translatedText: "", detectedSource: sourceLang };
  }

  const pair =
    sourceLang === "auto"
      ? `autodetect|${targetLang}`
      : `${sourceLang}|${targetLang}`;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return {
        translatedText: data.responseData.translatedText,
        detectedSource: sourceLang === "auto" ? "auto" : sourceLang,
      };
    }

    const msg = data.responseDetails || "Translation failed";
    throw new Error(msg);
  } catch (error) {
    console.error("[translate]", error.message);
    throw new Error("Could not translate comment. Try again later.");
  }
}
