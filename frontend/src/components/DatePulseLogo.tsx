interface DatePulseLogoProps {
  dark?: boolean;
  className?: string;
  /** Show only the icon (no text) */
  iconOnly?: boolean;
}

export default function DatePulseLogo({ dark = false, className = "", iconOnly = false }: DatePulseLogoProps) {
  const accent = dark ? "#818CF8" : "#4F46E5";
  const textColor = dark ? "#ffffff" : "#1a1a2e";

  if (iconOnly) {
    return (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M18 15.5 C16.2 13, 12 13, 12 16.2 C12 19, 15.2 22.5, 18 25 C20.8 22.5, 24 19, 24 16.2 C24 13, 19.8 13, 18 15.5Z" fill={accent} />
        <path d="M26 11 A 12 12 0 0 1 26 29" stroke={accent} strokeWidth="1.6" opacity="0.5" fill="none" strokeLinecap="round" />
        <path d="M29.5 7 A 17 17 0 0 1 29.5 33" stroke={accent} strokeWidth="1.3" opacity="0.3" fill="none" strokeLinecap="round" />
        <path d="M33 3.5 A 22 22 0 0 1 33 36.5" stroke={accent} strokeWidth="1" opacity="0.15" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 260 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g transform="translate(22, 25)">
        <path d="M0 -5.5 C-2.2 -8.5, -7.5 -8.5, -7.5 -4.2 C-7.5 -0.8, -3.2 3.5, 0 6.5 C3.2 3.5, 7.5 -0.8, 7.5 -4.2 C7.5 -8.5, 2.2 -8.5, 0 -5.5Z" fill={accent} />
        <path d="M10 -10 A 14 14 0 0 1 10 10" stroke={accent} strokeWidth="1.8" opacity="0.5" fill="none" strokeLinecap="round" />
        <path d="M14 -15 A 20 20 0 0 1 14 15" stroke={accent} strokeWidth="1.5" opacity="0.3" fill="none" strokeLinecap="round" />
        <path d="M18 -20 A 26 26 0 0 1 18 20" stroke={accent} strokeWidth="1.2" opacity="0.15" fill="none" strokeLinecap="round" />
      </g>
      <text x="54" y="33" fontFamily="Inter, DM Sans, sans-serif" fontWeight="600" fontSize="24" fill={textColor}>
        Date<tspan fill={accent}>Pulse</tspan>
      </text>
    </svg>
  );
}
