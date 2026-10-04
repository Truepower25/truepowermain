"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bluetooth, Plus, Trash2, Printer, Share2, Search, X, History, Download, Package } from "lucide-react";
import { getProducts, supabase } from "@/lib/supabase";
import { buildThermalReceipt } from "@/lib/thermalReceipt";

function toBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function compactReceiptName(value) {
  const words = String(value || "Item").trim().split(/\s+/).filter(Boolean);
  return `${words.slice(0, 3).join(" ")}${words.length > 3 ? "..." : ""}`;
}

function emptyLine() {
  return {
    id: crypto.randomUUID(),
    description: "",
    qty: 1,
    price: 0,
  };
}

function describeRlsError(error) {
  const code = String(error?.code || "");
  const status = error?.status || error?.statusCode;

  if (status === 403 || code === "42501") {
    return "Supabase RLS is blocking access to receipts. Add the receipts policies to your database."
  }

  return error?.message || "Could not load receipt data."
}

function buildReceiptSubtitle() {
  return "Professional electrical, solar, and water-heating solutions.";
}

function parseReceiptNumber(value) {
  const parsed = Number.parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatReceiptDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getNextReceiptNumber(rows, fallback = 1007) {
  const highest = (rows || []).reduce((max, row) => {
    const number = parseReceiptNumber(row?.receipt_number);
    return number != null && number > max ? number : max;
  }, fallback - 1);

  return String(Math.max(fallback, highest + 1));
}

function summarizeItems(items) {
  const descriptions = (Array.isArray(items) ? items : [])
    .map((item) => String(item?.description || item?.product_name || item?.name || "").trim())
    .filter(Boolean);

  if (!descriptions.length) return "No item details";
  if (descriptions.length === 1) return descriptions[0];

  const [first, second] = descriptions;
  const remaining = descriptions.length - 2;
  return remaining > 0 ? `${first}, ${second} +${remaining} more` : `${first}, ${second}`;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getHistoryRangeBounds(range) {
  const start = new Date();
  const end = new Date();

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  } else if (range === "yesterday") {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    const dayIndex = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayIndex);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  } else if (range === "last12months") {
    start.setMonth(start.getMonth() - 12);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  } else if (range === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  } else {
    return null;
  }

  return { start, end };
}

function getMonthRangeBounds(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function getYearRangeBounds(year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function isWithinHistoryRange(row, bounds) {
  if (!bounds) return true;

  const createdAt = new Date(row?.created_at);
  if (Number.isNaN(createdAt.getTime())) return false;

  if (bounds.start && createdAt < bounds.start) return false;
  if (bounds.end && createdAt >= bounds.end) return false;
  return true;
}

const RECYCLE_BIN_STORAGE_KEY = "truepower.receipt.recycle-bin";

function readDeletedReceiptIds() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECYCLE_BIN_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeDeletedReceiptIds(ids) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RECYCLE_BIN_STORAGE_KEY, JSON.stringify(ids));
  } catch {
  }
}

const RECEIPT_HISTORY_PAGE_SIZE = 1000;
const RECEIPT_HISTORY_SELECT =
  "id, receipt_number, customer_name, customer_phone, subtotal, total, created_at, items, notes";

async function fetchReceiptHistory() {
  const rows = [];
  let pageStart = 0;

  while (true) {
    const { data, error } = await supabase
      .from("receipts")
      .select(RECEIPT_HISTORY_SELECT)
      .order("created_at", { ascending: false })
      .range(pageStart, pageStart + RECEIPT_HISTORY_PAGE_SIZE - 1);

    if (error) throw error;

    const page = data || [];
    rows.push(...page);

    if (page.length < RECEIPT_HISTORY_PAGE_SIZE) {
      return rows;
    }

    pageStart += RECEIPT_HISTORY_PAGE_SIZE;
  }
}

async function waitForElementImages(element) {
  const images = Array.from(element?.querySelectorAll("img") || []);

  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }),
    ),
  );
}

export default function ReceiptBuilder() {
  const [products, setProducts] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [business, setBusiness] = useState({
    name: "TruePower Solutions",
    address: "",
    phone: "+254 701 039256",
    website: "https://www.truepower.co.ke/",
    logo: "/logo.png",
  });

  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [notes, setNotes] = useState(
    "Payment after installation\nPochi la Biashara: 0701 039256\n2 years warranty",
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [thermalPrinting, setThermalPrinting] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const [history, setHistory] = useState([]);
  const [deletedReceiptIds, setDeletedReceiptIds] = useState(() => readDeletedReceiptIds());
  const [recycleBinNotice, setRecycleBinNotice] = useState(null);
  const [activePanel, setActivePanel] = useState("builder");
  const [historyQuery, setHistoryQuery] = useState("");
  const [binQuery, setBinQuery] = useState("");
  const [historyRange, setHistoryRange] = useState("month");
  const [historyMonth, setHistoryMonth] = useState(() => new Date().getMonth());
  const [historyYear, setHistoryYear] = useState(() => new Date().getFullYear());
  const [historyPage, setHistoryPage] = useState(0);
  const [binPage, setBinPage] = useState(0);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const items = await getProducts();
        if (isMounted) setProducts(items);
      } catch {
        if (isMounted) setProducts([]);
      }

      try {
        const { data } = await supabase.from("settings").select("key, value");
        if (!isMounted || !data) return;
        const map = {};
        data.forEach((row) => (map[row.key] = row.value));
        setBusiness((current) => ({
          ...current,
          name: map.business_name || current.name,
          address: map.business_address || current.address,
          phone: map.whatsapp_number
            ? `+${String(map.whatsapp_number).replace(/^\+/, "")}`
            : map.wa_number
              ? `+${String(map.wa_number).replace(/^\+/, "")}`
              : current.phone,
          website: map.business_website || current.website,
        }));
      } catch (err) {
        if (isMounted) setLoadError(describeRlsError(err));
      }

      try {
        const rows = await fetchReceiptHistory();
        if (!isMounted) return;
        setHistory(rows);
        setReceiptNumber(getNextReceiptNumber(rows));
        const latestDate = new Date(rows[0]?.created_at);
        if (!Number.isNaN(latestDate.getTime())) {
          setHistoryMonth(latestDate.getMonth());
          setHistoryYear(latestDate.getFullYear());
        }
      } catch (error) {
        if (!isMounted) return;
        setHistory([]);
        setLoadError(describeRlsError(error));
        setReceiptNumber("1007");
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    writeDeletedReceiptIds(deletedReceiptIds);
  }, [deletedReceiptIds]);

  const filteredProducts = useMemo(() => {
    if (!productQuery.trim()) return products.slice(0, 30);
    const q = productQuery.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(q)).slice(0, 30);
  }, [productQuery, products]);

  const activeHistory = useMemo(
    () => history.filter((row) => !deletedReceiptIds.includes(String(row.id))),
    [history, deletedReceiptIds],
  );

  const recycleBinHistory = useMemo(
    () => history.filter((row) => deletedReceiptIds.includes(String(row.id))),
    [history, deletedReceiptIds],
  );

  const availableHistoryYears = useMemo(() => {
    const years = history
      .map((row) => {
        const date = new Date(row?.created_at);
        return Number.isNaN(date.getTime()) ? null : date.getFullYear();
      })
      .filter((year) => Number.isFinite(year));

    const currentYear = new Date().getFullYear();
    const oldestYear = years.length ? Math.min(...years) : currentYear;
    const latestYear = Math.max(currentYear, ...years, currentYear);

    return Array.from({ length: latestYear - oldestYear + 1 }, (_, index) => latestYear - index);
  }, [history]);

  const selectedMonthStats = useMemo(() => {
    const bounds = getMonthRangeBounds(historyYear, historyMonth);
    const rows = activeHistory.filter((row) => isWithinHistoryRange(row, bounds));
    const totalSales = rows.reduce((sum, row) => sum + (Number(row?.total) || 0), 0);

    return {
      count: rows.length,
      totalSales,
      averageSale: rows.length ? totalSales / rows.length : 0,
    };
  }, [activeHistory, historyMonth, historyYear]);

  const selectedYearStats = useMemo(() => {
    const bounds = getYearRangeBounds(historyYear);
    const rows = activeHistory.filter((row) => isWithinHistoryRange(row, bounds));
    const totalSales = rows.reduce((sum, row) => sum + (Number(row?.total) || 0), 0);

    return {
      count: rows.length,
      totalSales,
      averageSale: rows.length ? totalSales / rows.length : 0,
    };
  }, [activeHistory, historyYear]);

  const rangeFilteredHistory = useMemo(() => {
    const bounds =
      historyRange === "month"
        ? getMonthRangeBounds(historyYear, historyMonth)
        : historyRange === "year"
          ? getYearRangeBounds(historyYear)
          : getHistoryRangeBounds(historyRange);
    return activeHistory.filter((row) => isWithinHistoryRange(row, bounds));
  }, [activeHistory, historyRange, historyMonth, historyYear]);

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return rangeFilteredHistory;

    return rangeFilteredHistory.filter((row) => {
      const fields = [
        row?.receipt_number,
        row?.customer_name,
        row?.customer_phone,
        row?.total,
        row?.created_at,
        ...(Array.isArray(row?.items) ? row.items.map((item) => item?.description || item?.product_name || item?.name || "") : []),
      ]
        .map((value) => String(value || "").toLowerCase().trim())
        .filter(Boolean);

      return fields.some((value) => value.includes(q));
    });
  }, [rangeFilteredHistory, historyQuery]);

  const historyPageSize = 12;
  const historyPageCount = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const visibleHistory = filteredHistory.slice(historyPage * historyPageSize, (historyPage + 1) * historyPageSize);
  const selectedMonthLabel = `${MONTH_LABELS[historyMonth]} ${historyYear}`;

  const filteredBinHistory = useMemo(() => {
    const q = binQuery.trim().toLowerCase();
    if (!q) return recycleBinHistory;

    return recycleBinHistory.filter((row) => {
      const fields = [
        row?.receipt_number,
        row?.customer_name,
        row?.customer_phone,
        row?.total,
        row?.created_at,
        ...(Array.isArray(row?.items) ? row.items.map((item) => item?.description || item?.product_name || item?.name || "") : []),
      ]
        .map((value) => String(value || "").toLowerCase().trim())
        .filter(Boolean);

      return fields.some((value) => value.includes(q));
    });
  }, [recycleBinHistory, binQuery]);

  const binPageCount = Math.max(1, Math.ceil(filteredBinHistory.length / historyPageSize));
  const visibleBinHistory = filteredBinHistory.slice(binPage * historyPageSize, (binPage + 1) * historyPageSize);

  function shiftHistoryMonth(step) {
    const nextDate = new Date(historyYear, historyMonth + step, 1);
    setHistoryMonth(nextDate.getMonth());
    setHistoryYear(nextDate.getFullYear());
    setHistoryPage(0);
  }

  function addLine() {
    setLines((ls) => [...ls, emptyLine()]);
  }

  function removeLine(id) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));
  }

  function updateLine(id, patch) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addProductLine(product) {
    setLines((ls) => {
      const last = ls[ls.length - 1];
      const productName = String(product.name || "").trim();
      const productPrice = Number(product.price) || 0;
      const matchingLine = ls.find(
        (line) =>
          line.description.trim().toLowerCase() === productName.toLowerCase() &&
          (Number(line.price) || 0) === productPrice,
      );

      if (matchingLine) {
        return ls.map((line) =>
          line.id === matchingLine.id
            ? { ...line, qty: (Number(line.qty) || 0) + 1 }
            : line,
        );
      }

      const newLine = {
        id: crypto.randomUUID(),
        description: productName,
        qty: 1,
        price: productPrice,
        image: Array.isArray(product.images) ? product.images[0] : product.image_url || "",
        availableQuantity: product.stock ?? product.quantity ?? product.available_quantity ?? null,
      };
      if (!last.description.trim() && ls.length === 1) {
        return [newLine];
      }
      return [...ls, newLine];
    });
    setShowProductPicker(false);
    setProductQuery("");
  }

  async function loadHistory() {
    const rows = await fetchReceiptHistory();
    setHistory(rows);
    return rows;
  }

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.price) || 0), 0),
    [lines],
  );
  const total = subtotal;

  async function createA4ReceiptPdf() {
    const source = printRef.current;
    if (!source) return null;

    await waitForElementImages(source);

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(source, {
      backgroundColor: "#ffffff",
      height: source.scrollHeight,
      logging: false,
      scale: 2,
      useCORS: true,
      width: source.scrollWidth,
      windowWidth: source.scrollWidth,
    });

    const receiptWidthMm = 58;
    const receiptHeightMm = (canvas.height / canvas.width) * receiptWidthMm;
    const pdf = new jsPDF({
      compress: true,
      format: "a4",
      orientation: "portrait",
      unit: "mm",
    });

    // Keep the receipt at the exact Xprinter width and place it on the left
    // side of the A4 sheet for easy trimming after printing.
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      10,
      10,
      receiptWidthMm,
      receiptHeightMm,
      undefined,
      "FAST",
    );

    return pdf;
  }

  async function createReceiptPdf({ paper = "58mm" } = {}) {
    if (paper === "a4") return createA4ReceiptPdf();

    const source = printRef.current;
    if (!source) return null;

    await waitForElementImages(source);

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(source, {
      backgroundColor: "#ffffff",
      height: source.scrollHeight,
      logging: false,
      scale: 2,
      useCORS: true,
      width: source.scrollWidth,
      windowWidth: source.scrollWidth,
    });

    const imageRatio = canvas.height / canvas.width;
    const pageWidthMm = 58;
    const pageHeightMm = Math.max(60, imageRatio * pageWidthMm);
    const pdf = new jsPDF({
      compress: true,
      format: [pageWidthMm, pageHeightMm],
      orientation: "portrait",
      unit: "mm",
    });

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      pageWidthMm,
      pageHeightMm,
      undefined,
      "FAST",
    );

    return pdf;
  }

  async function handleDownloadPdf() {
    setExporting(true);
    try {
      if (!savedId) {
        await saveReceipt();
      }

      const pdf = await createReceiptPdf({ paper: "58mm" });
      if (pdf) {
        pdf.save(`TruePower-Receipt-${receiptNumber || "receipt"}.pdf`);
      }
    } catch (error) {
      alert(error.message || "Could not export the 58mm receipt PDF");
    } finally {
      setExporting(false);
    }
  }

  async function saveReceipt({ openHistory = false, openModal = false } = {}) {
    setSaving(true);
    try {
      const nextReceiptNumber = getNextReceiptNumber(history);
      const parsedReceiptNumber = parseReceiptNumber(receiptNumber);
      const receiptNumberForSave =
        savedId
          ? parsedReceiptNumber || Number(nextReceiptNumber)
          : parsedReceiptNumber && parsedReceiptNumber >= Number(nextReceiptNumber)
            ? parsedReceiptNumber
            : Number(nextReceiptNumber);

      const payload = {
        receipt_number: receiptNumberForSave,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: lines.map((l) => ({
          description: l.description,
          qty: Number(l.qty) || 0,
          price: Number(l.price) || 0,
        })),
        subtotal,
        total,
        notes,
      };
      let response;
      if (savedId) {
        const updateResult = await supabase
          .from("receipts")
          .update(payload)
          .eq("id", savedId)
          .select()
          .single();
        response = updateResult;
      } else {
        const insertResult = await supabase
          .from("receipts")
          .insert(payload)
          .select()
          .single();
        response = insertResult;
      }
      if (response.error) throw response.error;
      const data = response.data;
      setSavedId(data.id);
      setSelectedReceipt(data);
      setReceiptNumber(String(data.receipt_number || receiptNumberForSave));
      if (openModal) {
        setIsReceiptModalOpen(true);
      }
      await loadHistory();
      if (openHistory) {
        setActivePanel("history");
        setHistoryPage(0);
      }
      return data;
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    if (!savedId) {
      try {
        await saveReceipt();
      } catch (error) {
        alert(error.message || "Could not save receipt before printing");
        return;
      }
    }

    try {
      const pdf = await createReceiptPdf({ paper: "58mm" });
      if (!pdf) return;

      const pdfUrl = pdf.output("bloburl");
      const printWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

      if (!printWindow) {
        pdf.save(`TruePower-Receipt-${receiptNumber || "receipt"}.pdf`);
      }
    } catch (error) {
      alert(error.message || "Could not prepare the exact 58mm receipt PDF");
    }
  }

  async function handleA4Print() {
    if (!savedId) {
      try {
        await saveReceipt();
      } catch (error) {
        alert(error.message || "Could not save receipt before printing");
        return;
      }
    }

    try {
      const pdf = await createReceiptPdf({ paper: "a4" });
      if (!pdf) return;

      const pdfUrl = pdf.output("bloburl");
      const printWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

      if (!printWindow) {
        pdf.save(`TruePower-Receipt-A4-${receiptNumber || "receipt"}.pdf`);
      }
    } catch (error) {
      alert(error.message || "Could not prepare the A4 receipt PDF");
    }
  }

  async function handleThermalPrint() {
    setThermalPrinting(true);
    try {
      let saveError = null;
      let savedReceipt = null;
      if (!savedId) {
        try {
          savedReceipt = await saveReceipt();
        } catch (error) {
          // Printing should still work when a temporary connection/RLS issue
          // prevents history from being saved.
          saveError = error;
          console.error("Receipt printed without saving history:", error);
        }
      }

      const nativePrinter =
        typeof window !== "undefined" ? window.AndroidThermalPrinter : null;
      const printPayload = {
        business: {
          name: business.name,
          phone: business.phone,
          website: business.website,
        },
        receipt: {
          receiptNumber: receiptNumber || savedReceipt?.receipt_number || getNextReceiptNumber(history),
          receiptDate,
          customerName,
          items: lines.map((line) => ({
            description: line.description,
            qty: Number(line.qty) || 0,
            price: Number(line.price) || 0,
          })),
          notes,
          total,
        },
      };

      if (nativePrinter?.printImage || nativePrinter?.printReceipt) {
        // Prefer structured ESC/POS text. The Android companion converts it
        // to width-safe TSPL and calculates the label height, so long carts
        // cannot crop the amount column or the footer. Bitmap printing stays
        // as a fallback for older/native bridges that expose no text method.
        if (nativePrinter?.printReceipt) {
          const bytes = buildThermalReceipt(printPayload);
          nativePrinter.printReceipt(toBase64(bytes));
        } else if (nativePrinter?.printImage && printRef.current) {
          const source = printRef.current;
          await waitForElementImages(source);
          const { default: html2canvas } = await import("html2canvas");
          const canvas = await html2canvas(source, {
            backgroundColor: "#ffffff",
            height: source.scrollHeight,
            logging: false,
            scale: 2,
            useCORS: true,
            width: source.scrollWidth,
            windowWidth: source.scrollWidth,
          });
          nativePrinter.printImage(canvas.toDataURL("image/png").split(",")[1]);
        }
        if (saveError) {
          alert("Receipt sent to the printer, but it could not be saved to sales history.");
        }
        return;
      }

      const bridgeUrl =
        process.env.NEXT_PUBLIC_THERMAL_BRIDGE_URL || "http://127.0.0.1:18181";
      let healthResponse;
      try {
        healthResponse = await fetch(`${bridgeUrl}/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(2500),
        });
      } catch {
        throw new Error(
          "Chrome cannot connect to the Xprinter directly. Start the TruePower thermal bridge on the computer paired with the printer, or use the Android companion app.",
        );
      }
      const health = await healthResponse.json().catch(() => ({}));
      if (!healthResponse.ok || !health.configured) {
        throw new Error(
          "The TruePower thermal bridge is reachable, but no printer COM port is configured. Set THERMAL_PRINTER_PORT and restart the bridge.",
        );
      }
      const response = await fetch(`${bridgeUrl}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(printPayload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "The thermal printer bridge rejected the receipt.");
      }
      if (saveError) {
        alert("Receipt sent to the printer, but it could not be saved to sales history.");
      }
    } catch (error) {
      alert(
        error.message ||
          "Could not reach the Xprinter. Use the Android companion or start the desktop thermal bridge.",
      );
    } finally {
      setThermalPrinting(false);
    }
  }

  function startEditingReceipt(receipt) {
    if (!receipt) return;

    const nextLines =
      Array.isArray(receipt.items) && receipt.items.length
        ? receipt.items.map((item) => ({
            id: crypto.randomUUID(),
            description: item?.description || item?.product_name || item?.name || "",
            qty: item?.qty ?? 1,
            price: item?.price ?? 0,
          }))
        : [emptyLine()];

    setSavedId(receipt.id);
    setReceiptNumber(String(receipt.receipt_number || ""));
    setReceiptDate(
      receipt.created_at
        ? new Date(receipt.created_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    setCustomerName(receipt.customer_name || "");
    setCustomerPhone(receipt.customer_phone || "");
    setLines(nextLines);
    setNotes(receipt.notes || "");
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(false);
    setShowProductPicker(false);
    setActivePanel("builder");
  }

  async function handleSave() {
    try {
      await saveReceipt({ openHistory: true, openModal: true });
    } catch (error) {
      alert(error.message || "Could not save receipt");
    }
  }

  function buildWhatsAppText() {
    const lines_ = [];
    lines_.push(`*${business.name}*`);
    lines_.push(`Receipt #${receiptNumber}`);
    lines_.push(`Date: ${receiptDate}`);
    if (customerName) lines_.push(`Customer: ${customerName}`);
    lines_.push("");
    lines.forEach((l) => {
      if (!l.description) return;
      const lineTotal = (Number(l.qty) || 0) * (Number(l.price) || 0);
      lines_.push(`${l.description} x${l.qty} - KSh ${formatMoney(lineTotal)}`);
    });
    lines_.push("");
    lines_.push(`*TOTAL: KSh ${formatMoney(total)}*`);
    if (notes) {
      lines_.push("");
      lines_.push(notes);
    }
    return lines_.join("\n");
  }

  async function handleShareWhatsApp() {
    const text = buildWhatsAppText();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Receipt #${receiptNumber}`, text });
        return;
      } catch {
      }
    }
    const phone = customerPhone.replace(/[^0-9]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function restoreReceipt(receiptId) {
    const nextDeletedIds = deletedReceiptIds.filter((id) => String(id) !== String(receiptId));
    setDeletedReceiptIds(nextDeletedIds);
    writeDeletedReceiptIds(nextDeletedIds);
    setRecycleBinNotice(null);
  }

  async function deleteReceipt(receiptId) {
    const receiptToDelete = history.find((entry) => String(entry.id) === String(receiptId));
    if (!receiptToDelete) return;

    if (!window.confirm("Move this receipt to the recycle bin? You can undo it later.")) {
      return;
    }

    try {
      setSaving(true);
      const nextDeletedIds = Array.from(new Set([...deletedReceiptIds, String(receiptId)]));
      setDeletedReceiptIds(nextDeletedIds);
      writeDeletedReceiptIds(nextDeletedIds);
      setRecycleBinNotice(receiptToDelete);

      if (String(selectedReceipt?.id) === String(receiptId)) {
        setSelectedReceipt(null);
      }

      if (String(savedId) === String(receiptId)) {
        setSavedId(null);
        setReceiptNumber(getNextReceiptNumber(activeHistory.filter((row) => String(row.id) !== String(receiptId))));
        setCustomerName("");
        setCustomerPhone("");
        setLines([emptyLine()]);
        setNotes("Payment after installation\nPochi la Biashara: 0701 039256\n2 years warranty");
      }

      setIsReceiptModalOpen(false);
    } catch (error) {
      alert(error.message || "Could not move receipt to the recycle bin");
    } finally {
      setSaving(false);
    }
  }

  function renderReceiptDetails(
    receipt,
    { showActions = false, showOpenDetails = true } = {},
  ) {
    if (!receipt) {
      return (
        <div className="rounded-[28px] border border-dashed border-brand-200 bg-gradient-to-br from-slate-50 to-white p-6 text-sm text-sub">
          Pick a sale on the left to see the full receipt breakdown here. The selected receipt will open with customer,
          totals, notes, and item lines.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {showActions && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="w-full rounded-full border border-border bg-white px-3 py-2 text-xs sm:w-auto sm:text-sm font-semibold text-sub shadow-sm transition hover:border-brand-300 hover:text-brand-600"
              onClick={() => startEditingReceipt(receipt)}
            >
              Edit in builder
            </button>
            <button
              type="button"
              className="w-full rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:w-auto sm:text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
              onClick={() => deleteReceipt(receipt.id)}
            >
              <Trash2 size={14} className="inline mr-1" /> Move to recycle bin
            </button>
            {showOpenDetails && (
              <button
                type="button"
                className="w-full rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-xs sm:w-auto sm:text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100"
                onClick={() => {
                  setSelectedReceipt(receipt);
                  setIsReceiptModalOpen(true);
                }}
              >
                Open details
              </button>
            )}
          </div>
        )}
        <div className="overflow-hidden rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.24em] text-brand-600 font-semibold">Selected sale</div>
          <div className="mt-1 text-2xl font-display font-bold text-ink">Receipt #{receipt.receipt_number}</div>
          <div className="mt-1 text-sm text-sub">{formatReceiptDate(receipt.created_at)}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-white p-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sub">Customer</div>
            <div className="mt-1 font-semibold text-ink">{receipt.customer_name || "N/A"}</div>
            <div className="text-xs text-sub">{receipt.customer_phone || "No phone"}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">Subtotal</div>
            <div className="mt-1 font-semibold text-emerald-950">KSh {formatMoney(receipt.subtotal ?? receipt.total)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sub">Total</div>
            <div className="mt-1 font-semibold text-slate-950">KSh {formatMoney(receipt.total)}</div>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-sub">Notes</div>
          <p className="mt-2 rounded-2xl border border-border bg-white p-4 text-sm leading-6 whitespace-pre-line shadow-sm">
            {receipt.notes || "None"}
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-sub">Items</div>
          <div className="mt-2 grid gap-2">
            {(receipt.items || []).map((item, index) => (
              <div
                key={`${receipt.id}-item-${index}`}
                className="rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-ink">{item.description || item.product_name || "Item"}</div>
                  <div className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                    KSh {formatMoney(item.price)}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-sub">
                  <span className="rounded-full border border-border px-2 py-1">Qty: {item.qty || 0}</span>
                  <span>Line total: KSh {formatMoney((Number(item.qty) || 0) * (Number(item.price) || 0))}</span>
                </div>
              </div>
            ))}
            {!(receipt.items || []).length && (
              <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-3 text-sm text-sub">
                No item details saved.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderReceiptModal(receipt) {
    if (!receipt || !isReceiptModalOpen) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-8"
        onClick={() => setIsReceiptModalOpen(false)}
      >
        <div
          className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand-500 font-semibold">Receipt details</p>
              <h3 className="mt-1 text-2xl font-bold">Receipt #{receipt.receipt_number}</h3>
              <p className="text-sm text-sub">{formatReceiptDate(receipt.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="btn-ghost p-2 text-sub"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-5">
            {renderReceiptDetails(receipt, { showActions: true, showOpenDetails: false })}
          </div>
        </div>
      </div>
    );
  }

  function renderHistoryPanel() {
    const totalMatches = filteredHistory.length;
    const showingStart = totalMatches === 0 ? 0 : historyPage * historyPageSize + 1;
    const showingEnd = Math.min((historyPage + 1) * historyPageSize, totalMatches);
    const selectedHistoryReceipt =
      selectedReceipt && filteredHistory.some((row) => String(row.id) === String(selectedReceipt.id))
        ? selectedReceipt
        : visibleHistory[0] || filteredHistory[0] || null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Sales History</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink">Sales and receipts</h2>
            <p className="text-sub text-sm">Browse receipts without covering the builder screen.</p>
          </div>
          <button
            type="button"
            onClick={() => setActivePanel("builder")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <X size={16} />
            Back to Builder
          </button>
        </div>

        {recycleBinNotice && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">Receipt #{recycleBinNotice.receipt_number || ""} moved to the recycle bin.</div>
                <div className="mt-1 text-xs text-amber-700">You can undo this action right here.</div>
              </div>
              <button
                type="button"
                className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                onClick={() => restoreReceipt(recycleBinNotice.id)}
              >
                Undo
              </button>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-sky-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="label">Search sales</label>
              <input
                className="input bg-white"
                value={historyQuery}
                onChange={(e) => {
                  setHistoryQuery(e.target.value);
                  setHistoryPage(0);
                  setSelectedReceipt(null);
                }}
                placeholder="Search by receipt number, customer, phone, product..."
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[260px]">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sub">Receipts</div>
                <div className="mt-1 text-lg font-semibold text-ink">{activeHistory.length}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sub">Results</div>
                <div className="mt-1 text-lg font-semibold text-ink">{totalMatches}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: "Selected period",
                value: selectedMonthLabel,
                note: "Exact calendar month",
                accent: "from-brand-500 to-sky-500",
              },
              {
                label: "Receipts in month",
                value: selectedMonthStats?.count ?? 0,
                note: `${selectedYearStats?.count ?? 0} receipts this year`,
                accent: "from-slate-700 to-slate-900",
              },
              {
                label: "Sales total",
                value: `KSh ${formatMoney(selectedMonthStats?.totalSales ?? 0)}`,
                note: "Month revenue",
                accent: "from-emerald-500 to-teal-500",
              },
              {
                label: "Average sale",
                value: `KSh ${formatMoney(selectedMonthStats?.averageSale ?? 0)}`,
                note: "Per receipt average",
                accent: "from-amber-500 to-orange-500",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="overflow-hidden rounded-3xl border border-white/70 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-4"
              >
                <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${card.accent}`} />
                <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-sub">{card.label}</div>
                <div className="mt-2 text-base font-semibold text-ink sm:text-xl">{card.value}</div>
                <div className="mt-1 text-xs text-sub">{card.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-border bg-white/80 p-2 shadow-sm">
            {[
              { key: "all", label: "All receipts" },
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "week", label: "This week" },
              { key: "month", label: "Monthly archive" },
              { key: "year", label: "This year" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setHistoryRange(option.key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  historyRange === option.key
                    ? "bg-brand-500 text-white shadow-sm"
                    : "border border-border bg-white text-sub hover:border-brand-300 hover:text-brand-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {historyRange === "month" && (
            <div className="mt-4 rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">
                    Month archive
                  </div>
                  <h3 className="mt-2 text-2xl font-display font-bold text-ink">{selectedMonthLabel}</h3>
                  <p className="mt-1 max-w-xl text-sm text-sub">
                    Browse receipts by month like a timeline. Pick a year, switch the month, or move through the archive
                    one snapshot at a time.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => shiftHistoryMonth(-1)}
                    className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-sub shadow-sm transition hover:border-brand-300 hover:text-brand-600"
                  >
                    Back one month
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftHistoryMonth(1)}
                    className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-sub shadow-sm transition hover:border-brand-300 hover:text-brand-600"
                  >
                    Forward one month
                  </button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
                  <label className="label text-[11px] sm:text-xs">Year</label>
                  <select
                    className="input bg-white"
                    value={historyYear}
                    onChange={(e) => {
                      setHistoryYear(Number(e.target.value));
                      setHistoryPage(0);
                    }}
                  >
                    {availableHistoryYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-sub sm:text-xs">Choose the year you want to revisit.</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
                  <label className="label text-[11px] sm:text-xs">Month</label>
                  <select
                    className="input bg-white"
                    value={historyMonth}
                    onChange={(e) => {
                      setHistoryMonth(Number(e.target.value));
                      setHistoryPage(0);
                    }}
                  >
                    {MONTH_LABELS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-sub sm:text-xs">Open the monthly snapshot for {selectedMonthLabel}.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {loadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadError}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border bg-white p-4 sm:p-5">
            {totalMatches === 0 ? (
              <div className="rounded-[28px] border border-dashed border-brand-200 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-6 text-sm text-brand-800">
                No sales found for that search.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleHistory.map((r) => {
                  const isActive = String(selectedReceipt?.id || "") === String(r.id);
                  return (
                    <article
                      key={r.id}
                      className={`group relative overflow-hidden rounded-3xl border p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.07)] transition ${
                        isActive
                          ? "border-brand-400 bg-gradient-to-br from-brand-50 via-white to-sky-50 ring-2 ring-brand-100"
                          : "border-border bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1 ${
                          isActive
                            ? "bg-gradient-to-r from-brand-500 via-sky-400 to-cyan-400"
                            : "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200"
                        }`}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-ink">#{r.receipt_number}</div>
                            {isActive && (
                              <span className="rounded-full bg-brand-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="mt-1 truncate text-xs text-sub">{r.customer_name || "Customer"}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-base font-semibold text-brand-700">KSh {formatMoney(r.total)}</div>
                          <div className="mt-1 text-xs text-sub">{r.customer_phone || "No phone"}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-faint">
                        <span className="rounded-full bg-brand-50 px-2 py-1">{formatReceiptDate(r.created_at)}</span>
                        <span className="truncate">{summarizeItems(r.items)}</span>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          className="w-full rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-sub transition hover:border-brand-300 hover:text-brand-600 sm:w-auto"
                          onClick={() => {
                            setSelectedReceipt(r);
                            setIsReceiptModalOpen(true);
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 sm:w-auto"
                          onClick={() => startEditingReceipt(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 sm:w-auto"
                          onClick={() => deleteReceipt(r.id)}
                        >
                          <Trash2 size={14} className="inline mr-1" /> Move to bin
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {historyPageCount > 1 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-sub">
                  Showing {showingStart}-{showingEnd} of {totalMatches} sales
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost px-3 py-2 text-sm disabled:opacity-50"
                    disabled={historyPage === 0}
                    onClick={() => {
                      setHistoryPage((page) => Math.max(0, page - 1));
                      setSelectedReceipt(visibleHistory[0] || filteredHistory[0] || null);
                    }}
                  >
                    Prev
                  </button>
                  <span className="text-xs font-semibold text-sub">
                    Page {historyPage + 1} of {historyPageCount}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost px-3 py-2 text-sm disabled:opacity-50"
                    disabled={historyPage + 1 >= historyPageCount}
                    onClick={() => {
                      setHistoryPage((page) => Math.min(historyPageCount - 1, page + 1));
                      const nextStart = Math.min((historyPage + 1) * historyPageSize, Math.max(0, filteredHistory.length - 1));
                      setSelectedReceipt(filteredHistory[nextStart] || filteredHistory[0] || null);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-white p-4 sm:p-5">
            {renderReceiptDetails(selectedHistoryReceipt, { showActions: true })}
          </div>
        </div>
      </div>
    );
  }

  function renderBinPanel() {
    const totalMatches = filteredBinHistory.length;
    const showingStart = totalMatches === 0 ? 0 : binPage * historyPageSize + 1;
    const showingEnd = Math.min((binPage + 1) * historyPageSize, totalMatches);
    const selectedBinReceipt =
      selectedReceipt && filteredBinHistory.some((row) => String(row.id) === String(selectedReceipt.id))
        ? selectedReceipt
        : visibleBinHistory[0] || filteredBinHistory[0] || null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Recycle Bin</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink">Deleted receipts</h2>
            <p className="text-sub text-sm">Restore deleted receipts or keep them in the recycle bin.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setActivePanel("builder")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-semibold text-brand-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 sm:w-auto sm:text-sm"
            >
              <X size={16} /> Back to Builder
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel("history");
                setHistoryPage(0);
                setSelectedReceipt(filteredHistory[0] || null);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:border-blue-700 sm:w-auto sm:text-sm"
            >
              <History size={16} /> View Sales History
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Search deleted receipts</label>
              <input
                className="input bg-white"
                value={binQuery}
                onChange={(e) => {
                  setBinQuery(e.target.value);
                  setBinPage(0);
                  setSelectedReceipt(null);
                }}
                placeholder="Search receipt number, customer, phone or item..."
              />
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-sub">Deleted receipts</div>
              <div className="mt-1 text-lg font-semibold text-ink">{totalMatches}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-sub">Page</div>
              <div className="mt-1 text-lg font-semibold text-ink">{binPage + 1} / {binPageCount}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border bg-white p-4 sm:p-5">
            {totalMatches === 0 ? (
              <div className="rounded-[28px] border border-dashed border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 text-sm text-amber-800">
                No deleted receipts in the recycle bin.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleBinHistory.map((r) => {
                  const isActive = String(selectedReceipt?.id || "") === String(r.id);
                  return (
                    <article
                      key={r.id}
                      className={`group relative overflow-hidden rounded-3xl border p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.07)] transition ${
                        isActive
                          ? "border-amber-400 bg-gradient-to-br from-amber-50 via-white to-orange-50 ring-2 ring-amber-100"
                          : "border-border bg-white hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1 ${
                          isActive
                            ? "bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400"
                            : "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200"
                        }`}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-ink">#{r.receipt_number}</div>
                            {isActive && (
                              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                                Deleted
                              </span>
                            )}
                          </div>
                          <div className="mt-1 truncate text-xs text-sub">{r.customer_name || "Customer"}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-base font-semibold text-amber-700">KSh {formatMoney(r.total)}</div>
                          <div className="mt-1 text-xs text-sub">{r.customer_phone || "No phone"}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-faint">
                        <span className="rounded-full bg-amber-50 px-2 py-1">{formatReceiptDate(r.created_at)}</span>
                        <span className="truncate">{summarizeItems(r.items)}</span>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          className="w-full rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-sub transition hover:border-amber-300 hover:text-amber-700 sm:w-auto"
                          onClick={() => {
                            setSelectedReceipt(r);
                            setIsReceiptModalOpen(true);
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 sm:w-auto"
                          onClick={() => startEditingReceipt(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 sm:w-auto"
                          onClick={() => restoreReceipt(r.id)}
                        >
                          Undo
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {binPageCount > 1 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-sub">
                  Showing {showingStart}-{showingEnd} of {totalMatches} deleted receipts
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost px-3 py-2 text-sm disabled:opacity-50"
                    disabled={binPage === 0}
                    onClick={() => {
                      setBinPage((page) => Math.max(0, page - 1));
                      setSelectedReceipt(visibleBinHistory[0] || filteredBinHistory[0] || null);
                    }}
                  >
                    Prev
                  </button>
                  <span className="text-xs font-semibold text-sub">
                    Page {binPage + 1} of {binPageCount}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost px-3 py-2 text-sm disabled:opacity-50"
                    disabled={binPage + 1 >= binPageCount}
                    onClick={() => {
                      setBinPage((page) => Math.min(binPageCount - 1, page + 1));
                      const nextStart = Math.min((binPage + 1) * historyPageSize, Math.max(0, filteredBinHistory.length - 1));
                      setSelectedReceipt(filteredBinHistory[nextStart] || filteredBinHistory[0] || null);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-white p-4 sm:p-5">
            {renderReceiptDetails(selectedBinReceipt, { showActions: true })}
          </div>
        </div>
      </div>
    );
  }

  const receiptNotes = notes?.trim()
    ? notes.trim()
    : "Payment after installation";

  return (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-5 overflow-x-hidden px-3 py-4 sm:gap-8 sm:px-5 sm:py-8 lg:grid-cols-[minmax(0,1fr)_410px] lg:px-8 xl:grid-cols-[minmax(0,1fr)_440px] xl:px-12">
      {activePanel === "builder" ? (
        <>
          <div className="order-2 min-w-0 space-y-5 print:hidden lg:order-1 lg:space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/60 p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Sales workspace
                </div>
                <h2 className="font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Receipt Builder</h2>
                <p className="mt-1 text-xs leading-relaxed text-sub sm:text-sm">
                  Enter the sale details, review the live receipt, then print or save it.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setActivePanel("history");
                    setSelectedReceipt(filteredHistory[0] || null);
                    setHistoryPage(0);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-xs sm:w-auto sm:text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:border-blue-700"
                >
                  <History size={16} /> Sales History
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePanel("bin");
                    setBinPage(0);
                    setSelectedReceipt(null);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-500 bg-amber-50 px-4 py-2 text-xs sm:w-auto sm:text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 hover:border-amber-600"
                >
                  <Trash2 size={16} /> Recycle Bin
                </button>
              </div>
              </div>
            </div>

            {loadError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {loadError}
                <div className="mt-1 text-xs text-amber-700/80">
                  This tool needs the `receipts` table and read/write access in
                  Supabase.
                </div>
              </div>
            )}

            <div className="card hover:translate-y-0 border-slate-200 p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">01</div>
                <div><h3 className="text-sm font-bold text-slate-900">Receipt details</h3><p className="text-xs text-sub">Identify this transaction and the customer.</p></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label className="label">Receipt #</label>
                <input
                  className="input py-2.5 sm:py-3"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input py-2.5 sm:py-3"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Customer Name (optional)</label>
                <input
                  className="input py-2.5 sm:py-3"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="label">Customer Phone</label>
                <input
                  className="input py-2.5 sm:py-3"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0712345678"
                />
              </div>
              </div>
            </div>

            <div className="card hover:translate-y-0 overflow-hidden border-slate-200 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">02</div><label className="label mb-0">Items</label></div>
                  <p className="mt-1 text-xs text-sub">
                    Each line becomes a clean product row with quantity and amount.
                  </p>
                </div>
                <div className="relative w-full sm:w-auto min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowProductPicker((s) => !s)}
                    className="btn-outline text-sm py-2 px-4 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Search size={14} /> Add from Products
                  </button>
                  {showProductPicker && (
                    <div
                      className="fixed inset-0 z-50 overscroll-contain overflow-y-auto bg-slate-950/40 p-4 touch-pan-y sm:p-6"
                      onClick={() => setShowProductPicker(false)}
                    >
                      <div
                        className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-white shadow-pop [transform:translateZ(0)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center">
                          <input
                            autoFocus
                            className="input flex-1 py-2"
                            placeholder="Search products..."
                            value={productQuery}
                            onChange={(e) => setProductQuery(e.target.value)}
                          />
                          <button
                            onClick={() => setShowProductPicker(false)}
                            className="inline-flex items-center justify-center rounded-full border border-border bg-white p-2 text-sub shadow-sm transition hover:border-brand-300 hover:text-brand-600"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="max-h-[min(65vh,34rem)] overflow-y-auto divide-y divide-border p-3">
                          {filteredProducts.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => addProductLine(p)}
                              type="button"
                              className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-3 text-left transition hover:border-blue-100 hover:bg-blue-50/60 active:bg-blue-50 sm:px-3"
                            >
                              {(() => {
                                const image = Array.isArray(p.images) ? p.images[0] : p.image_url;
                                return image ? (
                                  <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover" />
                                ) : (
                                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600"><Package size={22} /></span>
                                );
                              })()}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold leading-snug text-slate-900">{p.name}</span>
                                <span className="mt-1 block text-xs text-sub">Tap to add · Qty 1{(() => { const available = p.stock ?? p.quantity ?? p.available_quantity; return available != null ? ` · Available: ${available}` : ""; })()}</span>
                              </span>
                              <span className="flex shrink-0 flex-col items-end gap-1">
                                <span className="whitespace-nowrap text-sm font-bold text-brand-600">KSh {formatMoney(p.price)}</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600"><Plus size={12} /> Add</span>
                              </span>
                            </button>
                          ))}
                          {filteredProducts.length === 0 && (
                            <p className="text-sub text-sm py-4 text-center">No products found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                {lines.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 shadow-sm transition hover:border-blue-200 hover:bg-white sm:grid sm:grid-cols-[minmax(0,1fr)_76px_120px_36px] sm:items-end sm:gap-2"
                  >
                    <div className="flex min-w-0 items-end gap-2">
                      {l.image ? <img src={l.image} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover shadow-sm" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><Package size={24} /></span>}
                      <label className="block min-w-0 flex-1"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Product / service</span><input className="input py-2.5 sm:py-3" placeholder="e.g. Black Anlabeier" value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} /></label>
                    </div>
                    <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Quantity</span><input type="number" min="0" className="input py-2.5 text-center sm:py-3" placeholder="1" value={l.qty} onChange={(e) => updateLine(l.id, { qty: e.target.value })} />{l.availableQuantity != null && <span className="mt-1 block text-[10px] font-semibold text-emerald-700">Available: {l.availableQuantity}</span>}</label>
                    <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Unit price</span><input type="number" min="0" className="input py-2.5 text-right sm:py-3" placeholder="0" value={l.price} onChange={(e) => updateLine(l.id, { price: e.target.value })} /></label>
                    <div className="flex items-center justify-between gap-2 sm:block">
                      <span className="text-xs font-bold text-slate-700 sm:hidden">Line total: KSh {formatMoney((Number(l.qty) || 0) * (Number(l.price) || 0))}</span>
                      <button onClick={() => removeLine(l.id)} className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 p-2 text-red-500 transition hover:border-red-300 hover:bg-red-100 sm:justify-self-center" title="Remove line"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addLine}
                className="btn-ghost text-sm mt-3 inline-flex items-center gap-2 w-full sm:w-auto"
              >
                <Plus size={14} /> Add line
              </button>
            </div>

            <div className="card hover:translate-y-0 border-slate-200 p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-sm font-bold text-amber-700">03</div><div><label className="label mb-0">Terms & Notes</label><p className="text-xs text-sub">These words appear below the total.</p></div></div>
              <textarea
                className="input h-24 resize-none py-2.5 sm:py-3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">Ready to finish?</p><p className="text-xs text-sub">Choose how you want to deliver this receipt.</p></div><Printer size={18} className="text-blue-600" /></div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={() => setShowMobilePreview(true)} className="btn-outline justify-center lg:hidden">
                <Printer size={16} /> Preview receipt
              </button>
              <button
                onClick={handleThermalPrint}
                disabled={thermalPrinting || saving}
                className="btn-primary justify-center disabled:opacity-60"
                title="Print directly to the paired Xprinter through the local thermal bridge"
              >
                <Bluetooth size={16} /> {thermalPrinting ? "Printing..." : "Print Bluetooth"}
              </button>
              <button onClick={handlePrint} className="btn-primary justify-center">
                <Printer size={16} /> Open exact 58mm PDF
              </button>
              <button onClick={handleA4Print} className="btn-primary justify-center">
                <Printer size={16} /> Print A4 PDF
              </button>
              <button onClick={handleDownloadPdf} disabled={exporting} className="btn-outline justify-center">
                <Download size={16} /> {exporting ? "Exporting..." : "Download 58mm PDF"}
              </button>
              <button onClick={handleShareWhatsApp} className="btn-outline justify-center">
                <Share2 size={16} /> Share via WhatsApp
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-ghost justify-center">
                {saving ? "Saving..." : savedId ? "Update record" : "Save receipt record"}
              </button>
              </div>
            </div>
          </div>

          <div className={showMobilePreview ? "fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-3 sm:p-6" : "order-1 absolute -left-[10000px] top-0 min-w-0 pointer-events-none lg:static lg:sticky lg:top-24 lg:order-2 lg:pointer-events-auto lg:self-start"}>
            <div className="relative mx-auto rounded-[2rem] border border-slate-200 bg-slate-100/80 p-3 shadow-sm sm:p-5 lg:mx-0">
              <div className="mb-3 flex items-center justify-between px-1 sm:mb-4"><div><p className="text-sm font-bold text-slate-900">Live preview</p><p className="text-xs text-sub">58mm thermal receipt</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm">Ready</span><button type="button" onClick={() => setShowMobilePreview(false)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 lg:hidden">Back</button></div></div>
              <div
              ref={printRef}
              id="receipt-print-area"
              className="receipt-sheet rounded-lg shadow-xl ring-1 ring-slate-900/5"
            >
              <div className="receipt-header">
                <img className="receipt-logo" src="/logo.png" alt="TruePower Solutions" />
                <div className="receipt-company-name">{String(business.name || "TRUEPOWER SOLUTIONS").toUpperCase()}</div>
                <div className="receipt-company-contact">{business.phone}</div>
                <div className="receipt-company-contact">{business.website.replace(/^https?:\/\//i, "")}</div>
              </div>

              <p className="receipt-subtitle">{buildReceiptSubtitle()}</p>
              <div className="receipt-divider" />

              <div className="receipt-meta-block">
                <div className="receipt-heading-title">RECEIPT</div>
                <div className="receipt-meta-row">
                  <span>No.</span>
                  <span>{receiptNumber}</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Date</span>
                  <span>{receiptDate}</span>
                </div>
              </div>

              <div className="receipt-divider" />

              <div className="receipt-table-head">
                <span>Item</span>
                <span>Qty</span>
                <span>Amount</span>
              </div>

              <div className="receipt-lines">
                {lines.filter((l) => l.description.trim()).length ? (
                  lines
                    .filter((l) => l.description.trim())
                    .map((l) => {
                      const amount = (Number(l.qty) || 0) * (Number(l.price) || 0);
                      return (
                        <div key={l.id} className="receipt-row">
                          <div className="receipt-item-description">
                            <span>
                              {compactReceiptName(l.description)}
                              <i className="receipt-leader" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="receipt-item-qty">x{Number(l.qty) || 0}</div>
                          <div className="receipt-item-total">KSh {formatMoney(amount)}</div>
                        </div>
                      );
                    })
                ) : (
                  <div className="receipt-empty-state">No line items added yet.</div>
                )}
              </div>

              <div className="receipt-total-row">
                <span>Total</span>
                <strong>KSh {formatMoney(total)}</strong>
              </div>

              <div className="receipt-divider" />

              <div className="receipt-terms-block">
                <p className="receipt-section-label">TERMS & CONDITIONS</p>
                <p className="receipt-terms-text">{receiptNotes}</p>
              </div>

              <div className="receipt-footer-box">
                <p className="receipt-footer-message">Thank you for shopping with us.</p>
                <p className="receipt-footer-support">
                  Need help with delivery, installation, or after-sales support? Call or WhatsApp us on{" "}
                  <strong>{business.phone}</strong>.
                </p>
                <p className="receipt-footer-link">{business.website}</p>
              </div>
              </div>
            </div>
          </div>
        </>
      ) : activePanel === "history" ? (
        <div className="col-span-full min-w-0">
          {renderHistoryPanel()}
        </div>
      ) : (
        <div className="col-span-full min-w-0">
          {renderBinPanel()}
        </div>
      )}

      {renderReceiptModal(selectedReceipt)}

      <style jsx global>{`
        .receipt-sheet {
          color: #000000;
          background: #ffffff;
          border: none;
          border-radius: 0.5rem;
          box-shadow: none;
          width: 58mm;
          min-width: 58mm;
          max-width: 58mm;
          margin: 0 auto;
          /* Keep the browser/PDF rendering close to the printer's compact sans-serif output. */
          padding: 3mm 5mm;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9.5px;
          line-height: 1.3;
          letter-spacing: 0;
          font-variant-numeric: tabular-nums;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          page-break-inside: avoid;
          break-inside: avoid;
          box-sizing: border-box;
        }

        .receipt-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.1rem;
          margin-bottom: 0.15rem;
        }

        .receipt-logo {
          width: 13mm;
          height: 13mm;
          object-fit: contain;
          margin-bottom: 0.4rem;
        }

        .receipt-company-name {
          font-weight: 800;
          font-size: 1.15rem;
          line-height: 1.2;
          color: #0f172a;
        }

        .receipt-company-contact {
          font-size: 0.8rem;
          color: #000000;
          line-height: 1.4;
          word-break: break-word;
          font-weight: 800;
        }

        .receipt-meta-block {
          text-align: center;
          margin: 0.45rem 0;
        }

        .receipt-heading-title {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #0f172a;
          margin-bottom: 0.2rem;
        }

        .receipt-meta-row {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          color: #000000;
          font-weight: 600;
        }

        .receipt-subtitle {
          margin: 0.35rem 0 0.45rem;
          font-size: 0.78rem;
          color: #000000;
          text-align: center;
          line-height: 1.35;
          font-weight: 600;
        }

        .receipt-divider {
          border-top: 1px dashed #000000;
          margin: 0.45rem 0 0.5rem;
        }

        .receipt-table-head,
        .receipt-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 8mm 22mm;
          align-items: start;
          column-gap: 0.25rem;
        }

        .receipt-table-head {
          border-bottom: 1px solid #475569;
          padding-bottom: 0.25rem;
          margin-bottom: 0.2rem;
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #0f172a;
        }

        .receipt-table-head span:nth-child(2) {
          text-align: center;
        }

        .receipt-table-head span:last-child {
          text-align: right;
        }

        .receipt-lines {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .receipt-row {
          align-items: flex-start;
          font-size: 0.78rem;
          color: #000000;
          padding-bottom: 0.1rem;
          page-break-inside: avoid;
          break-inside: avoid;
          font-weight: 500;
        }

        .receipt-item-description {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .receipt-item-description span {
          display: block;
          line-height: 1.25;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          overflow-wrap: normal;
          word-break: keep-all;
          hyphens: none;
        }

        .receipt-leader {
          display: none;
        }

        .receipt-item-price,
        .receipt-item-total {
          text-align: right;
          white-space: nowrap;
          font-weight: 800;
        }

        .receipt-item-qty {
          text-align: center;
          white-space: nowrap;
          font-weight: 700;
        }

        .receipt-empty-state {
          border: 1px dashed rgba(15, 23, 42, 0.25);
          border-radius: 0.75rem;
          padding: 0.55rem;
          color: #64748b;
          font-size: 0.68rem;
          text-align: center;
        }

        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: nowrap;
          gap: 0.5rem;
          margin-top: 0.45rem;
          padding-top: 0.25rem;
          border-top: 1px solid #334155;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
        }

        .receipt-total-row span,
        .receipt-total-row strong {
          white-space: nowrap;
        }

        .receipt-total-row strong {
          flex: 0 0 auto;
          font-size: 0.86rem;
          color: #0f172a;
        }

        .receipt-terms-block {
          margin-top: 0.45rem;
          text-align: center;
        }

        .receipt-section-label {
          margin: 0 0 0.3rem;
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #0f172a;
          text-align: center;
          text-transform: uppercase;
          font-weight: 900;
        }

        .receipt-terms-text {
          margin: 0;
          font-size: 0.74rem;
          color: #000000;
          line-height: 1.35;
          white-space: pre-line;
          text-align: center;
          text-wrap: balance;
          word-spacing: normal;
          letter-spacing: normal;
          overflow-wrap: normal;
          word-break: normal;
          font-weight: 700;
        }

        .receipt-terms-text strong,
        .receipt-footer-support strong {
          font-weight: 900;
          font-size: 1.05em;
        }

        .receipt-footer-box {
          margin-top: 0.7rem;
          padding-top: 0.5rem;
          border-top: 1px dashed rgba(0, 0, 0, 0.9);
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .receipt-footer-message {
          margin: 0;
          font-size: 0.88rem;
          font-weight: 800;
          color: #0f172a;
        }

        .receipt-footer-support {
          margin: 0.3rem 0 0;
          font-size: 0.8rem;
          color: #000000;
          line-height: 1.45;
          text-align: center;
          font-weight: 700;
        }

        .receipt-footer-support span {
          font-weight: 800;
          color: #0f172a;
        }

        .receipt-footer-link {
          margin: 0.2rem 0 0;
          font-size: 0.76rem;
          color: #000000;
          word-break: break-word;
          text-align: center;
          font-weight: 600;
        }

        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }

          html, body {
            width: 58mm !important;
            max-width: 58mm !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body {
            display: block !important;
          }

          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          .receipt-sheet {
            position: static;
            top: auto;
            left: auto;
            width: 58mm !important;
            max-width: 58mm !important;
            min-width: 58mm !important;
            margin: 0 auto !important;
            padding: 3mm 5mm !important;
            overflow: visible;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            border: none;
            box-shadow: none;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .receipt-sheet,
          .receipt-sheet * {
            color: #000000 !important;
          }

          .receipt-divider,
          .receipt-table-head,
          .receipt-total-row,
          .receipt-footer-box {
            border-color: #000000 !important;
          }

          .receipt-row,
          .receipt-total-row,
          .receipt-table-head,
          .receipt-footer-box {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
