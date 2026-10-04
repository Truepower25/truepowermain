const DEFAULT_ITEMS = [
  "REAL INSTALLATIONS",
  "SAME-DAY NAIROBI SUPPORT",
  "WHATSAPP QUOTES",
  "PRODUCTS TESTED FOR KENYAN CONDITIONS",
  "SHOWROOM: NYAMAKIMA",
];

export default function LivelyTrustStrip({ items = DEFAULT_ITEMS }) {
  const repeated = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-[#ffd92f]/40 bg-[#292566] py-3 text-white">
      <div className="flex min-w-max animate-[marquee_26s_linear_infinite] items-center gap-8 whitespace-nowrap">
        {repeated.map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em]">
            <span className="h-2 w-2 rounded-full bg-[#ffd92f] shadow-[0_0_12px_rgba(255,217,47,0.9)]" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
