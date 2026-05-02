import type { Meta, StoryObj } from "@storybook/preact";

import { Category } from "@/types";

import CategoryListView from "@/components/categories/CategoryListView";

const SAMPLE_CATEGORIES: Category[] = [
  { id: 1, user_id: 1, name: "Groceries", description: "Food and household items", with_autotax: false },
  { id: 2, user_id: 1, name: "Electronics", description: "Tech purchases", with_autotax: true },
  { id: 3, user_id: 1, name: "Travel", description: "Flights, hotels, and transport", with_autotax: false },
  { id: 4, user_id: 1, name: "Tax", description: "Sales tax", with_autotax: true },
];

const noop = () => {};

const meta: Meta<typeof CategoryListView> = {
  title: "Categories/CategoryListView",
  component: CategoryListView,
  args: {
    categories: SAMPLE_CATEGORIES,
    onAdd: noop,
  },
};

export default meta;

type Story = StoryObj<typeof CategoryListView>;

/** Default view with sample categories, sorted by name ascending. */
export const Default: Story = {};

/** Empty state with no categories. */
export const Empty: Story = {
  args: {
    categories: [],
  },
};
