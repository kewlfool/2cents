"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function SummaryCard(props: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line/70 bg-panel/96 space-y-1 rounded-xl border px-4 py-3">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <p className="text-ink text-xl font-semibold tracking-tight">{props.value}</p>
      <p className="text-muted text-sm leading-5">{props.description}</p>
    </div>
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
        "items-start transition",
        props.isSelected
          ? "bg-accent-soft/50"
          : "bg-transparent hover:bg-panel-strong/18",
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

      <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] xl:items-center">
        <div className="min-w-0 space-y-1.5">
          <p className="text-ink truncate text-sm font-semibold tracking-tight sm:text-base">
            {props.transaction.merchantRaw}
          </p>
          {props.transaction.notes ? (
            <p className="text-muted text-sm leading-5">
              {props.transaction.notes}
            </p>
          ) : null}
        </div>

        <div className="text-muted text-sm leading-5">
          <p>{formatDateLabel(props.transaction.date)}</p>
          <p>{props.sourceLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <Badge variant="default">Transfer-like</Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-3 xl:justify-end">
          <p
            className={cn(
              "text-base font-semibold tracking-tight",
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

        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <Button onClick={props.onEdit} size="sm" variant="secondary">
            Edit
          </Button>
        </div>
      </div>
    </ListRow>
  );
}

function TransactionEditorCard(props: {
  activeCategories: BudgetCategory[];
  allCategories: BudgetCategory[];
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
      <Card className="xl:sticky xl:top-28">
        <CardHeader>
          <CardTitle>Transaction editor</CardTitle>
          <CardDescription>
            Select a row to correct it, or create a manual transaction for cash,
            transfers, or statement fixes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4 text-sm leading-6">
            No transaction is selected yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="xl:sticky xl:top-28">
      <CardHeader>
        <CardTitle>
          {isCreateMode ? "Create manual transaction" : "Edit transaction"}
        </CardTitle>
        <CardDescription>
          {isCreateMode
            ? "Manual entries are stored locally and included in the same monthly rollups as imported activity."
            : `Adjust the saved transaction and rebuild the affected month snapshots. Source: ${sourceLabel}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
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

            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="space-y-2">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-direction"
              >
                Direction
              </label>
              <Select
                id="transaction-direction"
                {...props.form.register("direction")}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2 sm:col-span-2">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-notes"
              >
                Notes
              </label>
              <Textarea
                id="transaction-notes"
                placeholder="Optional context for this transaction"
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
            <label className="border-line/70 bg-panel-strong/30 flex items-start gap-3 rounded-[22px] border px-4 py-3">
              <input
                aria-label="Ignore in rollups"
                className="border-line text-accent focus:ring-accent mt-1 size-4 rounded border"
                type="checkbox"
                {...props.form.register("ignored")}
              />
              <span>
                <span className="text-ink block text-sm font-semibold">
                  Ignore in rollups
                </span>
                <span className="text-muted block text-sm leading-6">
                  Keep the row for reference, but exclude it from planned vs
                  actual totals.
                </span>
              </span>
            </label>

            <label className="border-line/70 bg-panel-strong/30 flex items-start gap-3 rounded-[22px] border px-4 py-3">
              <input
                aria-label="Mark as transfer-like"
                className="border-line text-accent focus:ring-accent mt-1 size-4 rounded border"
                type="checkbox"
                {...props.form.register("transferLike")}
              />
              <span>
                <span className="text-ink block text-sm font-semibold">
                  Mark as transfer-like
                </span>
                <span className="text-muted block text-sm leading-6">
                  Use this flag for reimbursements, card payments, or internal
                  moves that deserve extra review.
                </span>
              </span>
            </label>
          </div>

          {props.transaction ? (
            <div className="border-line/70 bg-panel-strong/30 rounded-[22px] border px-4 py-3 text-sm leading-6">
              <p className="text-ink font-semibold">Saved record metadata</p>
              <p className="text-muted mt-1">
                Created {formatDateTime(props.transaction.createdAt)}. Last
                updated {formatDateTime(props.transaction.updatedAt)}.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button disabled={props.isSaving} type="submit" variant="primary">
              {props.isSaving
                ? isCreateMode
                  ? "Creating..."
                  : "Saving..."
                : isCreateMode
                  ? "Create transaction"
                  : "Save transaction"}
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
                {props.isDeleting ? "Deleting..." : "Delete transaction"}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
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
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Phase 7 loading</Badge>}
          description="Preparing the local transaction ledger with categories, imports, and saved corrections from IndexedDB."
          eyebrow="Transactions"
          title="Transactions"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            Loading the local transaction workspace from IndexedDB.
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
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">Phase 11 ready</Badge>}
        description="Work through the transaction ledger locally: search by merchant, focus a month, fix categories, flag transfers, ignore noise safely, and add manual corrections without leaving the device."
        eyebrow="Transactions"
        title="Transactions"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          description="Rows currently visible after the active filters."
          label="Visible rows"
          value={String(filteredTransactions.length)}
        />
        <SummaryCard
          description="Visible rows that still need a category."
          label="Uncategorized"
          value={String(visibleUncategorizedCount)}
        />
        <SummaryCard
          description="Visible rows excluded from planned vs actual calculations."
          label="Ignored"
          value={String(visibleIgnoredCount)}
        />
        <SummaryCard
          description="Rows selected for a bulk category action."
          label="Selected"
          value={String(visibleSelectedCount)}
        />
      </section>

      {message ? (
        <Notice tone={message.tone}>
          {message.body}
        </Notice>
      ) : null}

      {bootstrap.errorMessage ? (
        <Notice tone="warning">
          {bootstrap.errorMessage}
        </Notice>
      ) : null}

      <Card className="xl:sticky xl:top-4 xl:z-10" variant="muted">
        <CardHeader className="flex flex-col gap-3 border-b border-line/60 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Ledger filters</CardTitle>
            <CardDescription>
              Narrow the ledger by month, category, direction, ignored state, or
              merchant search before editing or bulk categorizing. Press `/` to
              focus search or `N` to add a manual transaction.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              setFilters(createDefaultTransactionFilters(monthKeys[0] ?? null))
            }
            size="sm"
            variant="secondary"
          >
            Reset filters
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
            <div className="space-y-2">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-search"
              >
                Search merchant or notes
              </label>
              <Input
                aria-keyshortcuts="/"
                id="transaction-search"
                onChange={(event) =>
                  updateFilters({
                    searchQuery: event.target.value,
                  })
                }
                placeholder="Whole Foods, payroll, correction..."
                ref={searchInputRef}
                value={filters.searchQuery}
              />
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="space-y-2">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="transaction-ignored-filter"
              >
                Ignored filter
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

          <label className="border-line/70 bg-panel flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm">
            <input
              checked={filters.onlyUncategorized}
              className="border-line text-accent focus:ring-accent size-4 rounded border"
              onChange={(event) =>
                updateFilters({
                  onlyUncategorized: event.target.checked,
                })
              }
              type="checkbox"
            />
            Only uncategorized
          </label>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_390px]">
        <div className="grid gap-4">
          <Card variant="elevated">
            <CardHeader className="flex flex-col gap-4 border-b border-line/60 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle>Transaction ledger</CardTitle>
                <CardDescription>
                  The ledger mixes imported and manual rows. Bulk actions only
                  affect the rows you explicitly select.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
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
                  Add manual transaction
                </Button>
                <Button
                  disabled={filteredTransactions.length === 0}
                  onClick={() =>
                    setSelectedTransactionIds(
                      filteredTransactions.map((transaction) => transaction.id),
                    )
                  }
                  variant="secondary"
                >
                  Select all visible
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {visibleSelectedCount > 0 ? (
                <div className="border-line/70 bg-panel-strong/20 rounded-xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-ink text-sm font-semibold">
                        {visibleSelectedCount} selected transaction
                        {visibleSelectedCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-muted mt-1 text-sm leading-6">
                        Apply one category to the visible selection without
                        changing amounts, dates, or notes.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Select
                        aria-label="Bulk category"
                        className="min-w-48"
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
                        Clear selection
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {filteredTransactions.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4 text-sm leading-6">
                  No transactions match the current filters.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-muted hidden grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] px-4 text-xs font-semibold uppercase tracking-[0.16em] xl:grid">
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
            </CardContent>
          </Card>
        </div>

        <TransactionEditorCard
          activeCategories={activeCategories}
          allCategories={workspace.categories}
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
      </section>
    </div>
  );
}
