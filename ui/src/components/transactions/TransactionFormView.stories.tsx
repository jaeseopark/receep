import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/preact";

import { Category, Transaction, UserInfo, Vendor } from "@/types";

import TransactionFormView from "@/components/transactions/TransactionFormView";

const SAMPLE_USER_INFO: UserInfo = {
  user_id: 1,
  username: "demo",
  roles: ["user"],
  config: {
    tax_rate: 0.1,
    currency_decimal_places: 2,
    advanced_mode: false,
    notes: "",
  },
};

const SAMPLE_VENDORS: Vendor[] = [
  { id: 1, user_id: 1, name: "Whole Foods" },
  { id: 2, user_id: 1, name: "Amazon" },
  { id: 3, user_id: 1, name: "Target" },
];

const SAMPLE_CATEGORIES: Category[] = [
  { id: 1, user_id: 1, name: "Groceries", description: "Food and household items", with_autotax: false },
  { id: 2, user_id: 1, name: "Electronics", description: "Tech purchases", with_autotax: true },
  { id: 3, user_id: 1, name: "Tax", description: "Sales tax", with_autotax: false },
];

const SAMPLE_TRANSACTION: Transaction = {
  id: -1,
  user_id: 1,
  timestamp: Math.floor(Date.now() / 1000),
  amount: 42.5,
  vendor_id: 1,
  line_items: [
    {
      id: 1,
      transaction_id: -1,
      name: "Weekly groceries",
      amount_input: "42.50",
      amount: 42.5,
      category_id: 1,
    },
  ],
};

const noop = () => {};
const noopAsync = () => Promise.resolve(0);
const pendingSave = () => new Promise<void>(() => {}); // never resolves, to simulate an in-flight save

const meta: Meta<typeof TransactionFormView> = {
  title: "Transactions/TransactionFormView",
  component: TransactionFormView,
  args: {
    transaction: SAMPLE_TRANSACTION,
    vendors: SAMPLE_VENDORS,
    categories: SAMPLE_CATEGORIES,
    receipts: [],
    userInfo: SAMPLE_USER_INFO,
    onSave: noop,
    onDelete: noop,
    onCloneSuccess: noop,
    onCreateVendor: noopAsync,
    onCreateCategory: noopAsync,
  },
};

export default meta;

type Story = StoryObj<typeof TransactionFormView>;

/** Default desktop view of a new transaction form with sample data. */
export const NewTransaction: Story = {};

/** Desktop view of an existing (editable) transaction. */
export const ExistingTransaction: Story = {
  args: {
    transaction: {
      ...SAMPLE_TRANSACTION,
      id: 42,
    },
  },
};

/** Readonly view shown when the transaction belongs to another user. */
export const OtherUsersTransaction: Story = {
  args: {
    transaction: {
      ...SAMPLE_TRANSACTION,
      id: 99,
      user_id: 2,
    },
  },
};

/** Resolves the DatePicker's text input by locating it next to the "Date:" label. */
async function getDateInput(canvasElement: HTMLElement) {
  const label = within(canvasElement).getByText("Date:");
  const container = label.closest("div")!;
  return within(container).getByRole("textbox");
}

const SANITIZABLE_DATE = "20250312";
const EXPECTED_DATE = "2025-03-12";

/** Date normalization: clicking away corrects a sanitizable date string. */
export const DateNormalizationClickAway: Story = {
  play: async ({ canvasElement }) => {
    const dateInput = await getDateInput(canvasElement);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, SANITIZABLE_DATE);
    // Click the "Date:" label span to move focus away without re-opening the picker.
    await userEvent.click(within(canvasElement).getByText("Date:"));
    await expect(dateInput).toHaveValue(EXPECTED_DATE);
  },
};

/** Date normalization: tabbing away corrects a sanitizable date string. */
export const DateNormalizationTab: Story = {
  play: async ({ canvasElement }) => {
    const dateInput = await getDateInput(canvasElement);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, SANITIZABLE_DATE);
    await userEvent.tab();
    await expect(dateInput).toHaveValue(EXPECTED_DATE);
  },
};

/** Date normalization: pressing Enter corrects a sanitizable date string and moves focus to vendor. */
export const DateNormalizationEnter: Story = {
  play: async ({ canvasElement }) => {
    const dateInput = await getDateInput(canvasElement);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, SANITIZABLE_DATE);
    await userEvent.keyboard("{Enter}");
    await expect(dateInput).toHaveValue(EXPECTED_DATE);
  },
};

/** Save button in loading state (simulates an in-flight API call). */
export const SavingState: Story = {
  args: {
    transaction: {
      ...SAMPLE_TRANSACTION,
      id: 42,
    },
    onSave: pendingSave,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const saveButton = await canvas.findByTestId("save-button");
    await userEvent.click(saveButton);
  },
};
