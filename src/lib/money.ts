export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const hasPaise = Math.round(paise) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: hasPaise ? 2 : 0,
    minimumFractionDigits: hasPaise ? 2 : 0,
  }).format(rupees);
}

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return NaN;
  return Math.round(rupees * 100);
}
