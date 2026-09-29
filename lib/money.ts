const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatPaise(paise: number) {
  return rupees.format(paise / 100);
}

export function parseDecimal(text: string, places: number) {
  const clean = text.trim().replace(/,/g, "");
  const pattern = new RegExp(`^[-+]?\\d+(\\.\\d{1,${places}})?$`);
  if (!pattern.test(clean)) {
    return null;
  }

  const parts = clean.replace(/^[-+]/, "").split(".");
  let value = Number(parts[0]) * 10 ** places;
  if (parts.length === 2) {
    value += Number(parts[1].padEnd(places, "0"));
  }

  if (clean.startsWith("-")) {
    return -value;
  }

  return value;
}

export function rupeesToPaise(text: string) {
  return parseDecimal(text, 2);
}

export function paiseToRupees(paise: number | null) {
  if (paise === null) {
    return "";
  }

  return (paise / 100).toFixed(2);
}

export function percentOfPaise(paise: number, percentThousandths: number) {
  const scaled = paise * percentThousandths;
  let result = Math.floor(scaled / 100000);
  if ((scaled % 100000) * 2 >= 100000) {
    result += 1;
  }

  return result;
}
