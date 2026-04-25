import * as DOMPurify from "dompurify";

interface SanitizeConfig {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
}

const RICH_CONFIG: SanitizeConfig = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "br",
    "p",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "a",
    "code",
    "pre",
    "blockquote",
    "hr",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
};

const BASIC_CONFIG: SanitizeConfig = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
};

const purify = DOMPurify.default;

const createSanitizer =
  (config: SanitizeConfig) => (dirty: string) => {
    if (!dirty) return "";
    return purify.sanitize(dirty, {
      ALLOWED_TAGS: config.ALLOWED_TAGS,
      ALLOWED_ATTR: config.ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ["target"],
    });
  };

export const sanitizeHtml = createSanitizer(RICH_CONFIG);

export const sanitizeRichHtml = createSanitizer(RICH_CONFIG);

export const sanitizeText = createSanitizer(BASIC_CONFIG);

export const sanitizeUrl = (url: string): string => {
  if (!url) return "";
  const clean = purify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  const parsed = new URL(clean, "http:// example.com");
  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:" &&
    parsed.protocol !== "mailto:"
  ) {
    return "";
  }
  return clean;
};

export const escapeHtml = (dirty: string): string => {
  if (!dirty) return "";
  const div = document.createElement("div");
  div.textContent = dirty;
  return div.innerHTML;
};