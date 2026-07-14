export default function Plate({
  code,
  title,
  lead,
}: {
  code: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="mb-12">
      <div className="mb-3.5 font-mono text-xs uppercase tracking-[0.18em] text-blue">
        {code}
      </div>
      <h2 className="max-w-[640px] font-display text-[clamp(26px,4vw,38px)] font-bold leading-[1.15]">
        {title}
      </h2>
      {lead && (
        <p className="mt-4 max-w-[620px] text-[17px] text-mute">{lead}</p>
      )}
    </header>
  );
}
