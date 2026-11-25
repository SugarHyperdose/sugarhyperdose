import fs from "node:fs";
import path from "node:path";

const ART_DIR = path.resolve("assets/images/art");
const JSON_PATH = path.resolve("art.json");
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"
];

function parseFilename(filename) {
  const clean = filename.replace(/\.[^/.]+$/, "");
  const [rawDate, rawName] = clean.split("_");

  let date = "";
  let sortKey = "";

  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [y, m, d] = rawDate.split("-");
    const monthIndex = parseInt(m, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      date = `${MONTHS[monthIndex]} ${d}, ${y}`;
    }
    sortKey = rawDate;
  }

  const title = (rawName || clean)
    .replace(/-(\d+)$/, " #$1")
    .replace(/-/g, " ");

  return { title, date, sortKey };
}

let existing = [];
if (fs.existsSync(JSON_PATH)) {
  const raw = fs.readFileSync(JSON_PATH, "utf8").trim();
  if (raw) existing = JSON.parse(raw);
}

const existingByFile = new Map(
  (Array.isArray(existing) ? existing : []).map((entry) => [entry.file, entry])
);

const files = fs.existsSync(ART_DIR)
  ? fs.readdirSync(ART_DIR).filter((file) => {
      const fullPath = path.join(ART_DIR, file);
      return (
        fs.statSync(fullPath).isFile() &&
        IMAGE_EXTS.has(path.extname(file).toLowerCase())
      );
    })
  : [];

const merged = files.map((file) => {
  const parsed = parseFilename(file);
  const prev = existingByFile.get(file);

  if (prev) {
    return {
      file,
      title: prev.title !== undefined ? prev.title : parsed.title,
      date: prev.date !== undefined ? prev.date : parsed.date,
      desc: prev.desc !== undefined ? prev.desc : "",
      music: prev.music !== undefined ? prev.music : "",
      kofi: prev.kofi !== undefined ? Boolean(prev.kofi) : false,
      _sortKey: parsed.sortKey,
      _file: file
    };
  }

  return {
    file,
    title: parsed.title,
    date: parsed.date,
    desc: "",
    music: "",
    kofi: false,
    _sortKey: parsed.sortKey,
    _file: file
  };
});

merged.sort((a, b) => {
  if (a._sortKey && b._sortKey && a._sortKey !== b._sortKey) {
    return b._sortKey.localeCompare(a._sortKey);
  }
  if (a._sortKey && b._sortKey && a._sortKey === b._sortKey) {
    return b._file.localeCompare(a._file);
  }
  if (a._sortKey && !b._sortKey) return -1;
  if (!a._sortKey && b._sortKey) return 1;
  return b._file.localeCompare(a._file);
});

const cleaned = merged.map(({ _sortKey, _file, ...rest }) => rest);

fs.writeFileSync(JSON_PATH, JSON.stringify(cleaned, null, 2) + "\n", "utf8");
console.log(`Updated art.json with ${cleaned.length} item(s).`);