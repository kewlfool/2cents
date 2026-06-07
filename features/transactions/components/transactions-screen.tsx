"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTransactionsWorkspace } from "@/features/transactions/hooks/use-transactions-workspace";
import {
  collectTransactionMonthKeys,
  createDefaultTransactionFilters,
  filterTransactions,
  type TransactionFilters,
} from "@/features/transactions/lib/transaction-filters";
import {
  createEmptyTransactionFormValues,
  mapTransactionToFormValues,
  transactionFormSchema,
  type TransactionFormValues,
} from "@/features/transactions/lib/transaction-form";
import {
  bulkCategorizeTransactions,
  deleteTransaction,
  saveTransaction,
} from "@/features/transactions/lib/transactions-service";
import { formatMonthKeyLabel } from "@/lib/date";
import { formatMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BudgetCategory, StatementImport, Transaction } from "@/types";

type ScreenMessage = {
  body: string;
  tone: "error" | "success";
};

type EditorState =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      transactionId: string;
    }
  | null;

const emptyCategories: BudgetCategory[] = [];
const emptyTransactions: Transaction[] = [];

function formatDateLabel(value: string) {
  const [rawYear, rawMonth, rawDay] = value.split("-");
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultEditorDate(monthKey: string) {
  const today = getTodayIsoDate();

  if (monthKey === "all") {
    return today;
  }

  return today.startsWith(monthKey) ? today : `${monthKey}-01`;
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function formatSignedAmount(
  amount: number,
  currency: string,
  direction: Transaction["direction"],
) {
  const sign = direction === "income" ? "+" : "-";
  return `${sign}${formatMinorUnits(amount, currency)}`;
}

function getCategoryPresentation(
  categoryId: string | null,
  categories: BudgetCategory[],
) {
  if (!categoryId) {
    return {
      label: "Uncategorized",
      tone: "warning" as const,
    };
  }

  const category = categories.find((item) => item.id === categoryId);

  if (!category) {
    return {
      label: "Missing category",
      tone: "warning" as const,
    };
  }

  return {
    label: category.archived ? `${category.name} (archived)` : category.name,
    tone: category.archived ? ("default" as const) : ("accent" as const),
  };
}

function resolveSourceLabel(
  transaction: Transaction,
  statementImports: StatementImport[],
) {
  if (transaction.sourceType === "manual") {
    return "Manual entry";
  }

  const sourceImport = statementImports.find(
    (statementImport) => statementImport.id === transaction.sourceImportId,
  );

  return sourceImport?.fileName ?? "Imported statement";
}

function SummaryMetric(props: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line/70 bg-panel/96 rounded-[var(--radius-panel)] border px-3 py-2">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-ink text-base font-semibold tracking-tight">
          {props.value}
        </p>
        <p className="text-muted text-right text-[0.75rem] leading-4">
          {props.detail}
        </p>
      </div>
    </div>
  );
}

function WorkspaceSection(props: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
  variant?: "default" | "elevated" | "muted";
}) {
  const variantClass =
    props.variant === "elevated"
      ? "shadow-[var(--shadow-panel)]"
      : props.variant === "muted"
        ? "bg-panel-strong/18"
        : "bg-panel/96";

  return (
    <section
      className={cn(
        "border-line/70 rounded-[var(--radius-panel)] border",
        variantClass,
      )}
    >
      <div className="border-line/60 flex items-start justify-between gap-3 border-b px-[var(--space-card)] py-[var(--space-card-compact)]">
        <div className="min-w-0">
          <h2 className="text-ink text-sm font-semibold tracking-tight">
            {props.title}
          </h2>
          {props.description ? (
            <p className="text-muted mt-1 text-[0.8125rem] leading-5">
              {props.description}
            </p>
          ) : null}
        </div>
        {props.actions ? <div className="shrink-0">{props.actions}</div> : null}
      </div>
      <div className="p-[var(--space-card)]">{props.children}</div>
    </section>
  );
}

function InlineToggle(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="border-line/70 bg-panel flex min-h-[var(--control-height)] items-center gap-3 rounded-[var(--radius-control)] border px-3 text-sm">
      <input
        checked={props.checked}
        className="border-line text-accent focus:ring-accent size-4 rounded border"
        onChange={(event) => props.onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="text-ink">{props.label}</span>
    </label>
  );
}

function LedgerMetaRow(props: { label: string; secondary: string; value: ReactNode }) {
  return (
    <ListRow className="items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold tracking-tight">{props.label}</p>
        <p className="text-muted text-[0.75rem] leading-4">{props.secondary}</p>
      </div>
      <div className="text-ink shrink-0 text-sm font-semibold">{props.value}</div>
    </ListRow>
  );
}

function TransactionRow(props: {
  categories: BudgetCategory[];
  currency: string;
  isSelected: boolean;
  onEdit: () => void;
  onSelectionChange: (checked: boolean) => void;
  sourceLabel: string;
  transaction: Transaction;
}) {
  const categoryPresentation = getCategoryPresentation(
    props.transaction.categoryId,
    props.categories,
  );

  return (
    <ListRow
      aria-label={`${props.transaction.merchantRaw} transaction row`}
      className={cn(
        "items-start py-2 transition",
        props.isSelected
          ? "bg-accent-soft/45"
          : "bg-transparent hover:bg-panel-strong/16",
      )}
    >
      <div className="pt-0.5">
        <input
          aria-label={`Select ${props.transaction.merchantRaw}`}
          checked={props.isSelected}
          className="border-line text-accent focus:ring-accent size-4 rounded border"
          onChange={(event) => props.onSelectionChange(event.target.checked)}
          type="checkbox"
        />
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] xl:items-center">
        <div className="min-w-0 space-y-0.5">
          <p className="text-ink truncate text-sm font-semibold tracking-tight">
            {props.transaction.merchantRaw}
          </p>
          {props.transaction.notes ? (
            <p className="text-muted text-[0.75rem] leading-4">
              {props.transaction.notes}
            </p>
          ) : null}
        </div>

        <div className="order-3 text-muted text-[0.75rem] leading-4 xl:order-none">
          <p>{formatDateLabel(props.transaction.date)}</p>
          <p>{props.sourceLabel}</p>
        </div>

        <div className="order-5 col-span-2 flex flex-wrap items-center gap-1.5 xl:order-none xl:col-span-1">
          <Badge variant={categoryPresentation.tone}>
            {categoryPresentation.label}
          </Badge>
          <Badge variant="outline">
            {props.transaction.direction === "income" ? "Income" : "Expense"}
          </Badge>
          {props.transaction.ignored ? (
            <Badge variant="warning">Ignored</Badge>
          ) : null}
          {props.transaction.transferLike ? (
            <Badge variant="default">Transfer</Badge>
          ) : null}
        </div>

        <div className="flex items-start justify-end gap-3 xl:justify-end">
          <p
            className={cn(
              "text-sm font-semibold tracking-tight",
              props.transaction.direction === "income"
                ? "text-success"
                : "text-ink",
            )}
          >
            {formatSignedAmount(
              props.transaction.amount,
              props.currency,
              props.transaction.direction,
            )}
          </p>
        </div>

        <div className="order-4 flex items-center justify-end gap-3 xl:order-none xl:justify-end">
          <Button onClick={props.onEdit} size="sm" variant="secondary">
            Edit
          </Button>
        </div>
      </div>
    </ListRow>
  );
}

function EditorFlag(props: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (event: { target: HTMLInputElement; type?: string }) => void;
}) {
  return (
    <label className="border-line/70 bg-panel-strong/25 flex items-start gap-3 rounded-[var(--radius-control)] border px-3.5 py-3">
      <input
        checked={props.checked}
        className="border-line text-accent focus:ring-accent mt-0.5 size-4 rounded border"
        onChange={props.onChange}
        type="checkbox"
      />
      <span>
        <span className="text-ink block text-sm font-semibold">{props.label}</span>
        <span className="text-muted block text-[0.8125rem] leading-5">
          {props.description}
        </span>
      </span>
    </label>
  );
}

function TransactionEditorPanel(props: {
  activeCategories: BudgetCategory[];
  allCategories: BudgetCategory[];
  currency: string;
  editorState: EditorState;
  form: UseFormReturn<TransactionFormValues>;
  isDeleting: boolean;
  isSaving: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onMerchantInputRefChange?: (element: HTMLInputElement | null) => void;
  onSubmit: () => Promise<void>;
  statementImports: StatementImport[];
  transaction: Transaction | null;
}) {
  const { ref: merchantFieldRef, ...merchantFieldProps } =
    props.form.register("merchantRaw");
  const currentCategory =
    props.transaction?.categoryId
      ? props.allCategories.find(
          (category) => category.id === props.transaction?.categoryId,
        ) ?? null
      : null;
  const hasMissingCategoryReference = Boolean(
    props.transaction?.categoryId && !currentCategory,
  );
  const historicalCategories =
    currentCategory && currentCategory.archived
      ? [currentCategory]
      : props.allCategories.filter(
          (category) =>
            category.archived && category.id === props.transaction?.categoryId,
        );
  const sourceLabel = props.transaction
    ? resolveSourceLabel(props.transaction, props.statementImports)
    : "Manual transaction";
  const isCreateMode = props.editorState?.mode === "create";

  if (!props.editorState) {
    return (
      <WorkspaceSection
        description="Select a row or press N."
        title="Transaction editor"
        variant="muted"
      >
        <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[var(--radius-control)] border px-3.5 py-3 text-sm leading-5">
          No transaction selected.
        </div>
      </WorkspaceSection>
    );
  }

  return (
    <WorkspaceSection
      actions={
        props.transaction ? <Badge variant="outline">{sourceLabel}</Badge> : null
      }
      description={isCreateMode ? "Stored locally." : sourceLabel}
      title={isCreateMode ? "New manual transaction" : "Edit transaction"}
      variant="elevated"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void props.onSubmit();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="transaction-merchant"
            >
              Merchant
            </label>
            <Input
              id="transaction-merchant"
              placeholder="Corner Market"
              ref={(element) => {
                props.onMerchantInputRefChange?.(element);
                merchantFieldRef(element);
              }}
              {...merchantFieldProps}
            />
            {props.form.formState.errors.merchantRaw ? (
              <p className="text-warning text-sm">
                {props.form.formState.errors.merchantRaw.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="transaction-date"
            >
              Date
            </label>
            <Input
              id="transaction-date"
              type="date"
              {...props.form.register("date")}
            />
            {props.form.formState.errors.date ? (
              <p className="text-warning text-sm">
                {props.form.formState.errors.date.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="transaction-amount"
            >
              Amount
            </label>
            <Input
              id="transaction-amount"
              inputMode="decimal"
              placeholder="0.00"
              {...props.form.register("amountInput")}
            />
            {props.form.formState.errors.amountInput ? (
              <p className="text-warning text-sm">
                {props.form.formState.errors.amountInput.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="transaction-direction"
            >
              Direction
            </label>
            <Select id="transaction-direction" {...props.form.register("direction")}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="transaction-category"
            >
              Category
            </label>
            <Select
              aria-label="Transaction category"
              id="transaction-category"
              {...props.form.register("categoryId")}
            >
              <option value="">Uncategorized</option>
              {props.activeCategories.length > 0 ? (
                <optgroup label="Active categories">
                  {props.activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {historicalCategories.length > 0 ? (
                <optgroup label="Historical categories">
                  {historicalCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} (archived)
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {hasMissingCategoryReference ? (
                <optgroup label="Missing reference">
                  <option value={props.transaction?.categoryId ?? ""}>
                    Deleted category reference
                  </option>
                </optgroup>
              ) : null}
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="transaction-notes"
            >
              Notes
            </label>
            <Textarea
              id="transaction-notes"
              placeholder="Optional notes"
              {...props.form.register("notes")}
            />
            {props.form.formState.errors.notes ? (
              <p className="text-warning text-sm">
                {props.form.formState.errors.notes.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3">
          <EditorFlag
            checked={props.form.watch("ignored")}
            description="Keep the row, but exclude it from rollups."
            label="Ignore in rollups"
            onChange={props.form.register("ignored").onChange}
          />
          <EditorFlag
            checked={props.form.watch("transferLike")}
            description="Flag reimbursements, card payments, or internal moves."
            label="Mark as transfer-like"
            onChange={props.form.register("transferLike").onChange}
          />
        </div>

        {props.transaction ? (
          <div className="border-line/70 bg-panel-strong/20 rounded-[var(--radius-control)] border px-3.5 py-3 text-sm leading-5">
            <p className="text-ink font-semibold">Record metadata</p>
            <p className="text-muted mt-1">
              Created {formatDateTime(props.transaction.createdAt)}. Updated{" "}
              {formatDateTime(props.transaction.updatedAt)}.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button disabled={props.isSaving} type="submit" variant="primary">
            {props.isSaving
              ? isCreateMode
                ? "Creating..."
                : "Saving..."
              : isCreateMode
                ? "Create"
                : "Save"}
          </Button>
          <Button
            disabled={props.isSaving || props.isDeleting}
            onClick={props.onClose}
            variant="secondary"
          >
            Close
          </Button>
          {props.transaction ? (
            <Button
              className="border-warning/30 text-warning hover:border-warning/40 hover:bg-orange-50"
              disabled={props.isSaving || props.isDeleting}
              onClick={() => void props.onDelete()}
              variant="secondary"
            >
              {props.isDeleting ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>
      </form>
    </WorkspaceSection>
  );
}

export function TransactionsScreen() {
  const bootstrap = useAppBootstrap();
  const workspace = useTransactionsWorkspace();
  const [message, setMessage] = useState<ScreenMessage | null>(null);
  const [filters, setFilters] = useState<TransactionFilters | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>(
    [],
  );
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const merchantInputRef = useRef<HTMLInputElement | null>(null);

  const transactions = workspace?.transactions ?? emptyTransactions;
  const categories = workspace?.categories ?? emptyCategories;
  const monthKeys = collectTransactionMonthKeys(transactions);
  const activeCategories = categories.filter((category) => !category.archived);
  const editingTransaction =
    editorState?.mode === "edit" && workspace
      ? transactions.find(
          (transaction) => transaction.id === editorState.transactionId,
        ) ?? null
      : null;
  const defaultEditorDate = getDefaultEditorDate(filters?.monthKey ?? "all");

  const form = useForm<TransactionFormValues>({
    defaultValues: createEmptyTransactionFormValues(defaultEditorDate),
    resolver: zodResolver(transactionFormSchema),
  });

  useEffect(() => {
    if (!workspace || filters) {
      return;
    }

    setFilters(
      createDefaultTransactionFilters(
        collectTransactionMonthKeys(transactions)[0] ?? null,
      ),
    );
  }, [filters, transactions, workspace]);

  useEffect(() => {
    const nextActiveCategories = categories.filter((category) => !category.archived);

    if (!filters || nextActiveCategories.length === 0) {
      return;
    }

    if (
      bulkCategoryId &&
      nextActiveCategories.some((category) => category.id === bulkCategoryId)
    ) {
      return;
    }

    setBulkCategoryId(nextActiveCategories[0]?.id ?? "");
  }, [bulkCategoryId, categories, filters]);

  useEffect(() => {
    const availableMonthKeys = collectTransactionMonthKeys(transactions);

    if (
      !filters ||
      filters.monthKey === "all" ||
      availableMonthKeys.includes(filters.monthKey)
    ) {
      return;
    }

    setFilters((currentFilters) =>
      currentFilters
        ? {
            ...currentFilters,
            monthKey: availableMonthKeys[0] ?? "all",
          }
        : currentFilters,
    );
  }, [filters, transactions]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    if (editorState?.mode === "edit" && !editingTransaction) {
      setEditorState(null);
    }
  }, [editingTransaction, editorState, workspace]);

  useEffect(() => {
    if (!editorState) {
      form.reset(createEmptyTransactionFormValues(defaultEditorDate));
      return;
    }

    if (editorState.mode === "create") {
      form.reset(createEmptyTransactionFormValues(defaultEditorDate));
      return;
    }

    if (editingTransaction) {
      form.reset(mapTransactionToFormValues(editingTransaction));
    }
  }, [defaultEditorDate, editorState, editingTransaction, form]);

  useEffect(() => {
    if (!editorState) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      merchantInputRef.current?.focus();
      merchantInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [editingTransaction?.id, editorState]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (
        (event.key === "/" || event.code === "Slash") &&
        !isEditableElement(event.target)
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (
        (event.key.toLowerCase() === "n" || event.code === "KeyN") &&
        !editorState &&
        !isEditableElement(event.target)
      ) {
        event.preventDefault();
        setEditorState({
          mode: "create",
        });
        setMessage(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editorState]);

  const filteredTransactions =
    workspace && filters ? filterTransactions(transactions, filters) : [];
  const visibleTransactionIdKey = filteredTransactions
    .map((transaction) => transaction.id)
    .join("|");

  useEffect(() => {
    if (!workspace || !filters) {
      return;
    }

    const visibleTransactionIds = new Set(
      visibleTransactionIdKey ? visibleTransactionIdKey.split("|") : [],
    );

    setSelectedTransactionIds((currentSelection) => {
      const nextSelection = currentSelection.filter((transactionId) =>
        visibleTransactionIds.has(transactionId),
      );

      if (
        nextSelection.length === currentSelection.length &&
        nextSelection.every(
          (transactionId, index) => transactionId === currentSelection[index],
        )
      ) {
        return currentSelection;
      }

      return nextSelection;
    });
  }, [filters, visibleTransactionIdKey, workspace]);

  if (bootstrap.status === "booting" || !workspace || !filters) {
    return (
      <div className="space-y-5">
        <PageHeader
          badge={<Badge variant="accent">Transactions loading</Badge>}
          description="Preparing the transaction ledger."
          eyebrow="Transactions"
          title="Transactions"
        />
        <Card>
          <CardContent className="text-muted p-5 text-sm leading-5">
            Loading the local transaction workspace.
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleTransactionIds = new Set(
    filteredTransactions.map((transaction) => transaction.id),
  );
  const visibleIgnoredCount = filteredTransactions.filter(
    (transaction) => transaction.ignored,
  ).length;
  const visibleUncategorizedCount = filteredTransactions.filter(
    (transaction) => !transaction.categoryId,
  ).length;
  const visibleSelectedCount = selectedTransactionIds.filter((transactionId) =>
    visibleTransactionIds.has(transactionId),
  ).length;
  const selectedMonthLabel =
    filters.monthKey === "all"
      ? "All months"
      : formatMonthKeyLabel(filters.monthKey, workspace.locale, workspace.monthStartDay);

  const handleSaveTransaction = form.handleSubmit(async (values) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const savedTransaction = await saveTransaction(values, {
        transactionId:
          editorState?.mode === "edit" ? editorState.transactionId : null,
      });
      setEditorState({
        mode: "edit",
        transactionId: savedTransaction.id,
      });
      setMessage({
        body: `Saved transaction for ${savedTransaction.merchantRaw}.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the transaction.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  });

  async function handleDeleteTransaction() {
    if (!editingTransaction) {
      return;
    }

    if (
      !window.confirm(
        `Delete ${editingTransaction.merchantRaw} from ${formatDateLabel(editingTransaction.date)}? The affected month snapshots will be rebuilt.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      await deleteTransaction(editingTransaction.id);
      setEditorState(null);
      setSelectedTransactionIds((currentSelection) =>
        currentSelection.filter((transactionId) => transactionId !== editingTransaction.id),
      );
      setMessage({
        body: `Deleted transaction for ${editingTransaction.merchantRaw}.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to delete the selected transaction.",
        tone: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkCategorize() {
    if (!bulkCategoryId || selectedTransactionIds.length === 0) {
      return;
    }

    setIsBulkApplying(true);
    setMessage(null);

    try {
      const result = await bulkCategorizeTransactions({
        categoryId: bulkCategoryId,
        transactionIds: selectedTransactionIds,
      });
      setSelectedTransactionIds([]);
      setMessage({
        body:
          result.updatedCount === 0
            ? "The selected rows already had that category."
            : `Categorized ${result.updatedCount} transactions as ${result.categoryName}.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to apply the bulk category.",
        tone: "error",
      });
    } finally {
      setIsBulkApplying(false);
    }
  }

  function updateFilters(
    updater:
      | Partial<TransactionFilters>
      | ((currentFilters: TransactionFilters) => TransactionFilters),
  ) {
    setFilters((currentFilters) => {
      if (!currentFilters) {
        return currentFilters;
      }

      if (typeof updater === "function") {
        return updater(currentFilters);
      }

      return {
        ...currentFilters,
        ...updater,
      };
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        badge={<Badge variant="accent">Transactions live</Badge>}
        eyebrow="Transactions"
        title="Transactions"
      />

      <section className="border-line/70 bg-canvas/95 rounded-[var(--radius-panel)] border lg:sticky lg:top-0 lg:z-10 lg:backdrop-blur">
        <div className="flex flex-col gap-3 px-[var(--space-card)] py-[var(--space-card-compact)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <Badge variant="outline">{selectedMonthLabel}</Badge>
              <span className="text-muted text-sm">
                {filteredTransactions.length} visible
              </span>
              <span className="text-muted text-sm">
                {visibleSelectedCount} selected
              </span>
              <span className="text-muted text-sm">
                `/` search • `N` new row
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                aria-keyshortcuts="N"
                onClick={() => {
                  setEditorState({
                    mode: "create",
                  });
                  setMessage(null);
                }}
                variant="primary"
              >
                Add manual
              </Button>
              <Button
                onClick={() =>
                  setFilters(createDefaultTransactionFilters(monthKeys[0] ?? null))
                }
                size="sm"
                variant="secondary"
              >
                Reset
              </Button>
              <Button
                disabled={filteredTransactions.length === 0}
                onClick={() =>
                  setSelectedTransactionIds(
                    filteredTransactions.map((transaction) => transaction.id),
                  )
                }
                size="sm"
                variant="secondary"
              >
                Select all
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
            <div className="space-y-1.5">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-search"
              >
                Search
              </label>
              <Input
                aria-keyshortcuts="/"
                id="transaction-search"
                onChange={(event) =>
                  updateFilters({
                    searchQuery: event.target.value,
                  })
                }
                placeholder="Merchant, note, date..."
                ref={searchInputRef}
                value={filters.searchQuery}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-month-filter"
              >
                Month
              </label>
              <Select
                id="transaction-month-filter"
                onChange={(event) =>
                  updateFilters({
                    monthKey: event.target.value,
                  })
                }
                value={filters.monthKey}
              >
                <option value="all">All months</option>
                {monthKeys.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {formatMonthKeyLabel(
                      monthKey,
                      workspace.locale,
                      workspace.monthStartDay,
                    )}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-category-filter"
              >
                Category
              </label>
              <Select
                id="transaction-category-filter"
                onChange={(event) =>
                  updateFilters({
                    categoryId: event.target.value,
                  })
                }
                value={filters.categoryId}
              >
                <option value="all">All categories</option>
                {workspace.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.archived ? `${category.name} (archived)` : category.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-direction-filter"
              >
                Direction
              </label>
              <Select
                id="transaction-direction-filter"
                onChange={(event) =>
                  updateFilters({
                    direction: event.target.value as TransactionFilters["direction"],
                  })
                }
                value={filters.direction}
              >
                <option value="all">All directions</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-ignored-filter"
              >
                Ignored
              </label>
              <Select
                id="transaction-ignored-filter"
                onChange={(event) =>
                  updateFilters({
                    ignoredMode: event.target.value as TransactionFilters["ignoredMode"],
                  })
                }
                value={filters.ignoredMode}
              >
                <option value="active">Exclude ignored</option>
                <option value="all">Show all</option>
                <option value="ignored">Ignored only</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <InlineToggle
              checked={filters.onlyUncategorized}
              label="Only uncategorized"
              onChange={(checked) =>
                updateFilters({
                  onlyUncategorized: checked,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          detail="Filtered"
          label="Visible rows"
          value={String(filteredTransactions.length)}
        />
        <SummaryMetric
          detail="Need cat"
          label="Uncategorized"
          value={String(visibleUncategorizedCount)}
        />
        <SummaryMetric
          detail="Excluded"
          label="Ignored"
          value={String(visibleIgnoredCount)}
        />
        <SummaryMetric
          detail="Bulk"
          label="Selected"
          value={String(visibleSelectedCount)}
        />
      </section>

      {message ? <Notice tone={message.tone}>{message.body}</Notice> : null}

      {bootstrap.errorMessage ? (
        <Notice tone="warning">{bootstrap.errorMessage}</Notice>
      ) : null}

      <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.95fr)]">
        <div className="grid gap-3.5">
          <WorkspaceSection
            actions={<Badge variant="outline">{filteredTransactions.length} rows</Badge>}
            title="Transaction ledger"
            variant="elevated"
          >
            <div className="space-y-3">
              {visibleSelectedCount > 0 ? (
                <div className="border-line/70 bg-panel-strong/20 rounded-[var(--radius-control)] border px-3.5 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-ink text-sm font-semibold">
                        {visibleSelectedCount} selected
                      </p>
                      <p className="text-muted text-[0.75rem] leading-4">
                        Apply one category.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        aria-label="Bulk category"
                        className="min-w-44"
                        onChange={(event) => setBulkCategoryId(event.target.value)}
                        value={bulkCategoryId}
                      >
                        {activeCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                      <Button
                        disabled={isBulkApplying || !bulkCategoryId}
                        onClick={() => void handleBulkCategorize()}
                        size="sm"
                        variant="primary"
                      >
                        {isBulkApplying ? "Applying..." : "Apply category"}
                      </Button>
                      <Button
                        onClick={() => setSelectedTransactionIds([])}
                        size="sm"
                        variant="secondary"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {filteredTransactions.length === 0 ? (
                <EmptyState body="No rows match the current filters." />
              ) : (
                <div className="space-y-2">
                  <div className="text-muted hidden grid-cols-[minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] px-3.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] xl:grid">
                    <span>Merchant</span>
                    <span>Source</span>
                    <span>Category</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Action</span>
                  </div>
                  <List>
                    {filteredTransactions.map((transaction) => (
                      <TransactionRow
                        categories={workspace.categories}
                        currency={workspace.currency}
                        isSelected={selectedTransactionIds.includes(transaction.id)}
                        key={transaction.id}
                        onEdit={() => {
                          setEditorState({
                            mode: "edit",
                            transactionId: transaction.id,
                          });
                          setMessage(null);
                        }}
                        onSelectionChange={(checked) =>
                          setSelectedTransactionIds((currentSelection) => {
                            if (checked) {
                              return [...currentSelection, transaction.id];
                            }

                            return currentSelection.filter(
                              (transactionId) => transactionId !== transaction.id,
                            );
                          })
                        }
                        sourceLabel={resolveSourceLabel(
                          transaction,
                          workspace.statementImports,
                        )}
                        transaction={transaction}
                      />
                    ))}
                  </List>
                </div>
              )}
            </div>
          </WorkspaceSection>
        </div>

        <div className="grid gap-3.5 xl:sticky xl:top-[4.5rem] xl:self-start">
          <WorkspaceSection title="Workspace snapshot" variant="muted">
            <List>
              <LedgerMetaRow
                label="Review period"
                secondary="Current filter"
                value={selectedMonthLabel}
              />
              <LedgerMetaRow
                label="Currency"
                secondary="Display"
                value={workspace.currency}
              />
              <LedgerMetaRow
                label="Categories"
                secondary="Active"
                value={activeCategories.length}
              />
              <LedgerMetaRow
                label="Imported files"
                secondary="Sources"
                value={workspace.statementImports.length}
              />
            </List>
          </WorkspaceSection>

          <TransactionEditorPanel
            activeCategories={activeCategories}
            allCategories={workspace.categories}
            currency={workspace.currency}
            editorState={editorState}
            form={form}
            isDeleting={isDeleting}
            isSaving={isSaving}
            onClose={() => setEditorState(null)}
            onDelete={handleDeleteTransaction}
            onMerchantInputRefChange={(element) => {
              merchantInputRef.current = element;
            }}
            onSubmit={handleSaveTransaction}
            statementImports={workspace.statementImports}
            transaction={editingTransaction}
          />
        </div>
      </section>
    </div>
  );
}
