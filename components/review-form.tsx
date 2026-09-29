"use client";

import { CircleAlertIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBill } from "@/app/actions/bills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearDraft, saveDraft, tipPaise, toBillBody, type Draft, type DraftCharge, type DraftItem } from "@/lib/draft";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import type { ChargeKind, Issue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dropIssuesAt, dropIssuesUnder, keepServerOnly, validateDraft } from "@/lib/validate";

const CHARGE_KINDS = {
  tax: "Tax",
  service_charge: "Service charge",
  discount: "Discount",
  round_off: "Round off",
  other: "Other",
};

const ITEM_FIELDS = {
  name: "name",
  quantity: "quantity",
  unitPrice: "unit_price_paise",
  lineTotal: "line_total_paise",
};

const CHARGE_FIELDS = {
  label: "label",
  kind: "kind",
  rate: "rate_percent",
  amount: "amount_paise",
};

const EMPTY_ITEM: DraftItem = { name: "", quantity: "1", unitPrice: "", lineTotal: "" };
const EMPTY_CHARGE: DraftCharge = { label: "", kind: "other", rate: "", amount: "" };

function issuesAt(issues: Issue[], field: string) {
  const matching = [];
  for (const issue of issues) {
    if (issue.field === field) {
      matching.push(issue);
    }
  }

  return matching;
}

function issuesUnder(issues: Issue[], prefix: string) {
  const matching = [];
  for (const issue of issues) {
    if (issue.field.startsWith(prefix)) {
      matching.push(issue);
    }
  }

  return matching;
}

function countErrors(issues: Issue[]) {
  let count = 0;
  for (const issue of issues) {
    if (issue.severity === "error") {
      count += 1;
    }
  }

  return count;
}

function plural(count: number, word: string) {
  if (count === 1) {
    return `1 ${word}`;
  }

  return `${count} ${word}s`;
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-1">
      {issues.map((issue, index) => (
        <li
          key={index}
          className={cn("flex gap-2 text-sm", issue.severity === "error" ? "text-destructive" : "text-warning")}
        >
          {issue.severity === "error" && <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />}
          {issue.severity === "warning" && <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <span>
            <span className="sr-only">{issue.severity === "error" ? "Error: " : "Warning: "}</span>
            {issue.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

function IssueBanner({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return null;
  }

  const errorCount = countErrors(issues);
  const warningCount = issues.length - errorCount;

  let title = `${plural(warningCount, "warning")} to check. They won't stop you creating the bill.`;
  if (errorCount > 0) {
    title = `${plural(errorCount, "issue")} to fix before you can create the bill`;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl p-4 ring-1",
        errorCount > 0 ? "bg-destructive/5 ring-destructive/20" : "bg-warning/5 ring-warning/20",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <IssueList issues={issues} />
    </div>
  );
}

type DraftInputProps = React.ComponentProps<typeof Input> & {
  issues: Issue[];
  field: string;
};

function DraftInput({ issues, field, className, ...props }: DraftInputProps) {
  const matching = issuesAt(issues, field);
  const hasError = countErrors(matching) > 0;
  const hasWarning = matching.length > 0 && !hasError;

  return (
    <Input
      autoComplete="off"
      aria-invalid={hasError}
      className={cn("h-10", hasWarning && "border-warning", className)}
      {...props}
    />
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 min-w-10 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        active && "bg-background text-foreground shadow-sm",
      )}
    >
      {children}
    </button>
  );
}

type Props = {
  initialDraft: Draft;
  onStartOver: () => void;
};

export function ReviewForm({ initialDraft, onStartOver }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const issues = validateDraft(draft).concat(draft.serverIssues);
  const errorCount = countErrors(issues);

  function update(next: Draft) {
    setDraft(next);
    saveDraft(next);
  }

  function editField(next: Draft, field: string) {
    update({ ...next, serverIssues: dropIssuesAt(next.serverIssues, field) });
  }

  function setItem(index: number, key: keyof DraftItem, value: string) {
    const items = draft.items.slice();
    items[index] = { ...items[index], [key]: value };
    editField({ ...draft, items }, `items[${index}].${ITEM_FIELDS[key]}`);
  }

  function addItem() {
    update({ ...draft, items: draft.items.concat(EMPTY_ITEM), serverIssues: dropIssuesUnder(draft.serverIssues, "items") });
  }

  function removeItem(index: number) {
    const items = draft.items.slice();
    items.splice(index, 1);
    update({ ...draft, items, serverIssues: dropIssuesUnder(draft.serverIssues, "items") });
  }

  function setCharge(index: number, key: keyof DraftCharge, value: string) {
    const charges = draft.charges.slice();
    charges[index] = { ...charges[index], [key]: value };
    editField({ ...draft, charges }, `charges[${index}].${CHARGE_FIELDS[key]}`);
  }

  function addCharge() {
    update({ ...draft, charges: draft.charges.concat(EMPTY_CHARGE), serverIssues: dropIssuesUnder(draft.serverIssues, "charges") });
  }

  function removeCharge(index: number) {
    const charges = draft.charges.slice();
    charges.splice(index, 1);
    update({ ...draft, charges, serverIssues: dropIssuesUnder(draft.serverIssues, "charges") });
  }

  function setTipMode(tipMode: Draft["tipMode"]) {
    editField({ ...draft, tipMode, tip: "" }, "tip");
  }

  function create() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createBill(toBillBody(draft));

      if (result.slug) {
        clearDraft();
        router.push(`/b/${result.slug}`);
        return;
      }

      if (result.error) {
        setSubmitError(result.error);
        return;
      }

      update({ ...draft, serverIssues: keepServerOnly(result.issues, validateDraft(draft)) });
    });
  }

  const tip = tipPaise(draft);
  const total = rupeesToPaise(draft.total);
  let grandTotal: number | null = null;
  if (tip !== null && total !== null) {
    grandTotal = total + tip;
  }

  let createLabel = "Create bill";
  if (pending) {
    createLabel = "Creating bill…";
  } else if (errorCount > 0) {
    createLabel = `Fix ${plural(errorCount, "issue")} to continue`;
  }

  return (
    <div className="flex flex-col gap-6">
      <IssueBanner issues={issues} />

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="merchant">Restaurant</Label>
            <DraftInput
              id="merchant"
              issues={issues}
              field="merchant"
              value={draft.merchant}
              onChange={(event) => editField({ ...draft, merchant: event.target.value }, "merchant")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bill-date">Date</Label>
            <DraftInput
              id="bill-date"
              type="date"
              issues={issues}
              field="bill_date"
              value={draft.billDate}
              onChange={(event) => editField({ ...draft, billDate: event.target.value }, "bill_date")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold">Items</CardTitle>
          <CardDescription>Check each line against the receipt. Amounts are in ₹.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <IssueList issues={issuesAt(issues, "items")} />

          <div className="grid grid-cols-[4rem_1fr_1fr_2.5rem] gap-2 text-xs font-medium text-muted-foreground sm:grid-cols-[1fr_4.5rem_7rem_7rem_2.5rem]">
            <span className="hidden sm:block">Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Amount</span>
          </div>

          {draft.items.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0 sm:border-0 sm:pb-0">
              <div className="grid grid-cols-[4rem_1fr_1fr_2.5rem] gap-2 sm:grid-cols-[1fr_4.5rem_7rem_7rem_2.5rem]">
                <DraftInput
                  className="col-span-4 sm:col-span-1"
                  aria-label={`Item ${index + 1} name`}
                  placeholder="Item name"
                  issues={issues}
                  field={`items[${index}].name`}
                  value={item.name}
                  onChange={(event) => setItem(index, "name", event.target.value)}
                />
                <DraftInput
                  className="text-right tabular-nums"
                  aria-label={`Item ${index + 1} quantity`}
                  placeholder="Qty"
                  inputMode="decimal"
                  issues={issues}
                  field={`items[${index}].quantity`}
                  value={item.quantity}
                  onChange={(event) => setItem(index, "quantity", event.target.value)}
                />
                <DraftInput
                  className="text-right tabular-nums"
                  aria-label={`Item ${index + 1} unit price`}
                  placeholder="Unit price"
                  inputMode="decimal"
                  issues={issues}
                  field={`items[${index}].unit_price_paise`}
                  value={item.unitPrice}
                  onChange={(event) => setItem(index, "unitPrice", event.target.value)}
                />
                <DraftInput
                  className="text-right tabular-nums"
                  aria-label={`Item ${index + 1} amount`}
                  placeholder="Amount"
                  inputMode="decimal"
                  issues={issues}
                  field={`items[${index}].line_total_paise`}
                  value={item.lineTotal}
                  onChange={(event) => setItem(index, "lineTotal", event.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() => removeItem(index)}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <IssueList issues={issuesUnder(issues, `items[${index}].`)} />
            </div>
          ))}

          <Button variant="outline" className="h-10 w-fit" onClick={addItem}>
            <PlusIcon aria-hidden />
            Add item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold">Charges and total</CardTitle>
          <CardDescription>
            Every line between the items and the total. Discounts are negative. If the restaurant&apos;s maths is off, add an
            Other charge called Adjustment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="subtotal">Subtotal</Label>
              <DraftInput
                id="subtotal"
                className="w-36 text-right tabular-nums"
                inputMode="decimal"
                issues={issues}
                field="subtotal_paise"
                value={draft.subtotal}
                onChange={(event) => editField({ ...draft, subtotal: event.target.value }, "subtotal_paise")}
              />
            </div>
            <IssueList issues={issuesAt(issues, "subtotal_paise")} />
          </div>

          {draft.charges.map((charge, index) => (
            <div key={index} className="flex flex-col gap-2 border-b pb-4 sm:border-0 sm:pb-0">
              <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-2 sm:grid-cols-[1fr_9rem_4.5rem_7rem_2.5rem]">
                <DraftInput
                  className="col-span-2 sm:col-span-1"
                  aria-label={`Charge ${index + 1} label`}
                  placeholder="Label, e.g. CGST 2.5%"
                  issues={issues}
                  field={`charges[${index}].label`}
                  value={charge.label}
                  onChange={(event) => setCharge(index, "label", event.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground sm:order-last"
                  aria-label={`Remove charge ${index + 1}`}
                  onClick={() => removeCharge(index)}
                >
                  <Trash2Icon />
                </Button>
                <Select
                  items={CHARGE_KINDS}
                  value={charge.kind}
                  onValueChange={(value) => setCharge(index, "kind", value as ChargeKind)}
                >
                  <SelectTrigger
                    className="col-span-3 w-full data-[size=default]:h-10 sm:col-span-1"
                    aria-label={`Charge ${index + 1} kind`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="service_charge">Service charge</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="round_off">Round off</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <DraftInput
                  className="text-right tabular-nums"
                  aria-label={`Charge ${index + 1} rate in percent`}
                  placeholder="Rate %"
                  inputMode="decimal"
                  issues={issues}
                  field={`charges[${index}].rate_percent`}
                  value={charge.rate}
                  onChange={(event) => setCharge(index, "rate", event.target.value)}
                />
                <DraftInput
                  className="col-span-2 text-right tabular-nums sm:col-span-1"
                  aria-label={`Charge ${index + 1} amount`}
                  placeholder="Amount"
                  inputMode="decimal"
                  issues={issues}
                  field={`charges[${index}].amount_paise`}
                  value={charge.amount}
                  onChange={(event) => setCharge(index, "amount", event.target.value)}
                />
              </div>
              <IssueList issues={issuesUnder(issues, `charges[${index}].`)} />
            </div>
          ))}

          <Button variant="outline" className="h-10 w-fit" onClick={addCharge}>
            <PlusIcon aria-hidden />
            Add charge
          </Button>

          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="total" className="font-semibold">
                Total
              </Label>
              <DraftInput
                id="total"
                className="w-36 text-right font-semibold tabular-nums"
                inputMode="decimal"
                issues={issues}
                field="total_paise"
                value={draft.total}
                onChange={(event) => editField({ ...draft, total: event.target.value }, "total_paise")}
              />
            </div>
            <IssueList issues={issuesAt(issues, "total_paise")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold">Tip</CardTitle>
          <CardDescription>Optional. Everyone pays it in proportion to what they had.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div role="group" aria-label="Tip type" className="inline-flex rounded-lg bg-muted p-[3px]">
              <ModeButton active={draft.tipMode === "percent"} onClick={() => setTipMode("percent")}>
                %
              </ModeButton>
              <ModeButton active={draft.tipMode === "amount"} onClick={() => setTipMode("amount")}>
                ₹
              </ModeButton>
            </div>
            <DraftInput
              className="w-28 text-right tabular-nums"
              aria-label={draft.tipMode === "percent" ? "Tip percent" : "Tip amount"}
              placeholder={draft.tipMode === "percent" ? "10" : "0.00"}
              inputMode="decimal"
              issues={issues}
              field="tip"
              value={draft.tip}
              onChange={(event) => editField({ ...draft, tip: event.target.value }, "tip")}
            />
            {draft.tipMode === "percent" && tip !== null && tip > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">= {formatPaise(tip)}</span>
            )}
          </div>
          <IssueList issues={issuesAt(issues, "tip")} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {grandTotal !== null && (
          <p className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Total with tip</span>
            <span className="text-lg font-semibold tabular-nums">{formatPaise(grandTotal)}</span>
          </p>
        )}
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button className="h-10" disabled={errorCount > 0 || pending} onClick={create}>
          {createLabel}
        </Button>
        <Button variant="ghost" className="h-10" disabled={pending} onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </div>
  );
}
