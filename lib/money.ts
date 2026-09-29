const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatPaise(paise: number) {
  return rupees.format(paise / 100);
}
