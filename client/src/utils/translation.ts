type Language = "de" | "en";

function t(text: string, lang: Language = "de"): string {
  switch (lang) {
    case "en":
      return "Translated into english";
    default:
      return text;
  }
}

export default t;
