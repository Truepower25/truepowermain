const ESC = 0x1b;
const RECEIPT_COLUMNS = 32;
const encoder = new TextEncoder();

function text(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

function money(value) {
  const amount = Number(value) || 0;
  return `KSh ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function compactMoney(value) {
  const amount = Number(value) || 0;
  return `KSh ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function wrap(value, width) {
  const words = text(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let current = "";

  words.forEach((word) => {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function compactDescription(value, width) {
  const words = text(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "Item";

  const selected = [];
  for (const word of words) {
    if (selected.length >= 3) break;
    const candidate = [...selected, word].join(" ");
    if (candidate.length <= width || selected.length === 0) {
      selected.push(word);
    } else {
      break;
    }
  }

  const hasMoreWords = selected.length < words.length;
  const withEllipsis = `${selected.join(" ")}...`;
  if (hasMoreWords && withEllipsis.length <= width) return withEllipsis;
  return selected.join(" ");
}

function centered(value) {
  return wrap(value, RECEIPT_COLUMNS).map(
    (line) => line.padStart(Math.floor((RECEIPT_COLUMNS + line.length) / 2)),
  );
}

function itemLines(item) {
  const amount = compactMoney((Number(item?.qty) || 0) * (Number(item?.price) || 0));
  const quantity = `x${Math.max(0, Number(item?.qty) || 0)}`;
  const right = `${amount} ${quantity}`;
  const descriptionWords = String(item?.description || item?.product_name || "Item")
    .trim()
    .split(/\s+/)
    .join(" ");
  const descriptionWidth = Math.max(8, RECEIPT_COLUMNS - right.length - 1);
  const description = compactDescription(descriptionWords, descriptionWidth);
  return [`${description.padEnd(descriptionWidth)} ${right}`];
}

function bytes(parts) {
  return Uint8Array.from(parts.flatMap((part) =>
    typeof part === "string" ? Array.from(encoder.encode(part)) : Array.from(part),
  ));
}

export function buildThermalReceipt({ business, receipt }) {
  const lines = [];
  const add = (value = "") => lines.push(text(value));
  const rule = () => add("-".repeat(RECEIPT_COLUMNS));

  lines.push(...centered(business?.name || "TruePower Solutions"));
  lines.push(...centered(business?.phone || ""));
  lines.push(...centered(String(business?.website || "").replace(/^https?:\/\//i, "")));
  lines.push(...centered("Professional electrical, solar, and water-heating solutions."));
  rule();
  lines.push(...centered("RECEIPT"));
  add(`No.  ${receipt?.receiptNumber || ""}`.padStart(22).padEnd(RECEIPT_COLUMNS));
  add(`Date ${receipt?.receiptDate || ""}`.padStart(22).padEnd(RECEIPT_COLUMNS));
  rule();
  add("ITEM".padEnd(RECEIPT_COLUMNS - 6) + "AMOUNT".padStart(6));
  rule();

  (Array.isArray(receipt?.items) ? receipt.items : [])
    .filter((item) => String(item?.description || item?.product_name || "").trim())
    .forEach((item) => itemLines(item).forEach(add));

  rule();
  add(`TOTAL${money(receipt?.total).padStart(RECEIPT_COLUMNS - 5)}`);
  rule();
  lines.push(...centered("TERMS & CONDITIONS"));
  String(receipt?.notes || "Payment after installation")
    .split(/\r?\n/)
    .forEach((line) => lines.push(...centered(line)));
  rule();
  lines.push(...centered("Thank you for shopping with us."));
  lines.push(...centered(`Call or WhatsApp: ${business?.phone || ""}`));
  lines.push(...centered(String(business?.website || "")));

  // Xprinter Bluetooth firmware commonly expects CRLF line endings. LF-only
  // payloads can connect successfully but remain buffered without printing.
  const paperText = `${lines.join("\r\n")}\r\n\r\n\r\n\r\n`;

  return bytes([
    Uint8Array.from([ESC, 0x40]),
    Uint8Array.from([ESC, 0x61, 0x00]),
    Uint8Array.from([ESC, 0x45, 0x00]),
    paperText,
  ]);
}
