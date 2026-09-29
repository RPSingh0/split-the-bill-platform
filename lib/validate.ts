import type { Draft, DraftCharge, DraftItem } from "@/lib/draft";
import { formatPaise, parseDecimal, rupeesToPaise } from "@/lib/money";
import type { Issue } from "@/lib/types";

function error(code: string, field: string, message: string, expected: number | null = null, actual: number | null = null): Issue {
  return { code, severity: "error", field, message, expected, actual };
}

function parseAmount(issues: Issue[], text: string, field: string, label: string) {
  const paise = rupeesToPaise(text);
  if (paise === null) {
    issues.push(error("INVALID_AMOUNT", field, `${label} must look like 120.50`));
  }

  return paise;
}

function checkItem(issues: Issue[], item: DraftItem, index: number) {
  const label = `Item ${index + 1}`;
  const path = `items[${index}]`;

  if (item.name.trim() === "") {
    issues.push(error("FIELD_MISSING", `${path}.name`, `${label} has no name`));
  }

  if (item.quantity.trim() === "") {
    issues.push(error("FIELD_MISSING", `${path}.quantity`, `${label} has no quantity`));
  } else {
    const quantity = parseDecimal(item.quantity, 3);
    if (quantity === null) {
      issues.push(error("INVALID_AMOUNT", `${path}.quantity`, `${label} quantity must be a number like 2`));
    } else if (quantity <= 0) {
      issues.push(error("INVALID_AMOUNT", `${path}.quantity`, `${label} quantity must be more than 0`));
    }
  }

  if (item.unitPrice.trim() !== "") {
    const unitPrice = parseAmount(issues, item.unitPrice, `${path}.unit_price_paise`, `${label} unit price`);
    if (unitPrice !== null && unitPrice < 0) {
      issues.push(error("INVALID_AMOUNT", `${path}.unit_price_paise`, `${label} unit price can't be negative`));
    }
  }

  if (item.lineTotal.trim() === "") {
    issues.push(error("FIELD_MISSING", `${path}.line_total_paise`, `${label} has no amount`));
    return null;
  }

  const lineTotal = parseAmount(issues, item.lineTotal, `${path}.line_total_paise`, `${label} amount`);
  if (lineTotal !== null && lineTotal < 0) {
    issues.push(error("INVALID_AMOUNT", `${path}.line_total_paise`, `${label} amount can't be negative`));
  }

  return lineTotal;
}

function checkCharge(issues: Issue[], charge: DraftCharge, index: number) {
  const label = charge.label.trim() || `Charge ${index + 1}`;
  const path = `charges[${index}]`;

  if (charge.rate.trim() !== "" && parseDecimal(charge.rate, 3) === null) {
    issues.push(error("INVALID_AMOUNT", `${path}.rate_percent`, `${label} rate must be a number like 2.5`));
  }

  if (charge.amount.trim() === "") {
    issues.push(error("FIELD_MISSING", `${path}.amount_paise`, `${label} has no amount`));
    return null;
  }

  const amount = parseAmount(issues, charge.amount, `${path}.amount_paise`, label);
  if (amount === null) {
    return null;
  }

  if (amount < 0 && (charge.kind === "tax" || charge.kind === "service_charge")) {
    issues.push(error("INVALID_AMOUNT", `${path}.amount_paise`, `${label} can't be negative`));
  }

  if (amount > 0 && charge.kind === "discount") {
    issues.push(error("DISCOUNT_SIGN", `${path}.amount_paise`, `${label} should be a negative amount`));
  }

  return amount;
}

function checkTotal(issues: Issue[], text: string) {
  if (text.trim() === "") {
    issues.push(error("FIELD_MISSING", "total_paise", "The total is missing"));
    return null;
  }

  const total = parseAmount(issues, text, "total_paise", "The total");
  if (total !== null && total <= 0) {
    issues.push(error("INVALID_AMOUNT", "total_paise", "The total must be more than ₹0.00"));
  }

  return total;
}

function checkTip(issues: Issue[], draft: Draft) {
  if (draft.tip.trim() === "") {
    return;
  }

  if (draft.tipMode === "amount") {
    const tip = rupeesToPaise(draft.tip);
    if (tip === null) {
      issues.push(error("TIP_INVALID", "tip", "Tip must look like 50.00"));
    } else if (tip < 0) {
      issues.push(error("TIP_INVALID", "tip", "Tip can't be negative"));
    }
    return;
  }

  const percent = parseDecimal(draft.tip, 3);
  if (percent === null || percent < 0 || percent > 100000) {
    issues.push(error("TIP_INVALID", "tip", "Tip % must be between 0 and 100"));
  }
}

export function validateDraft(draft: Draft) {
  const issues: Issue[] = [];

  if (draft.items.length === 0) {
    issues.push(error("NO_ITEMS", "items", "The receipt has no items"));
  }

  let itemsSum = 0;
  let itemsComplete = true;
  for (let index = 0; index < draft.items.length; index++) {
    const lineTotal = checkItem(issues, draft.items[index], index);
    if (lineTotal === null) {
      itemsComplete = false;
    } else {
      itemsSum += lineTotal;
    }
  }

  let chargesSum = 0;
  let chargesComplete = true;
  for (let index = 0; index < draft.charges.length; index++) {
    const amount = checkCharge(issues, draft.charges[index], index);
    if (amount === null) {
      chargesComplete = false;
    } else {
      chargesSum += amount;
    }
  }

  let subtotal: number | null = null;
  if (draft.subtotal.trim() !== "") {
    subtotal = parseAmount(issues, draft.subtotal, "subtotal_paise", "The subtotal");
  }

  const total = checkTotal(issues, draft.total);

  if (draft.items.length > 0 && itemsComplete && itemsSum <= 0) {
    issues.push(error("INVALID_AMOUNT", "items", "Items must add up to more than ₹0.00"));
  }

  if (itemsComplete && subtotal !== null && itemsSum !== subtotal) {
    const message = `Items add up to ${formatPaise(itemsSum)} but the subtotal says ${formatPaise(subtotal)}`;
    issues.push(error("ITEMS_SUBTOTAL_MISMATCH", "subtotal_paise", message, subtotal, itemsSum));
  }

  let base = subtotal;
  if (draft.subtotal.trim() === "" && itemsComplete) {
    base = itemsSum;
  }

  if (base !== null && total !== null && chargesComplete && base + chargesSum !== total) {
    const computed = base + chargesSum;
    const message = `Subtotal plus charges is ${formatPaise(computed)} but the total says ${formatPaise(total)}`;
    issues.push(error("TOTAL_MISMATCH", "total_paise", message, computed, total));
  }

  checkTip(issues, draft);

  return issues;
}

function hasIssue(issues: Issue[], code: string, field: string) {
  for (const issue of issues) {
    if (issue.code === code && issue.field === field) {
      return true;
    }
  }

  return false;
}

export function keepServerOnly(serverIssues: Issue[], liveIssues: Issue[]) {
  const kept = [];
  for (const issue of serverIssues) {
    if (!hasIssue(liveIssues, issue.code, issue.field)) {
      kept.push(issue);
    }
  }

  return kept;
}

export function dropIssuesAt(issues: Issue[], field: string) {
  const kept = [];
  for (const issue of issues) {
    if (issue.field !== field) {
      kept.push(issue);
    }
  }

  return kept;
}

export function dropIssuesUnder(issues: Issue[], prefix: string) {
  const kept = [];
  for (const issue of issues) {
    if (!issue.field.startsWith(prefix)) {
      kept.push(issue);
    }
  }

  return kept;
}
