import type { Meta, StoryObj } from "@storybook/preact";

import { Vendor } from "@/types";

import VendorListView from "@/components/vendors/VendorListView";

const SAMPLE_VENDORS: Vendor[] = [
  { id: 1, user_id: 1, name: "Whole Foods" },
  { id: 2, user_id: 1, name: "Amazon" },
  { id: 3, user_id: 1, name: "Target" },
  { id: 4, user_id: 1, name: "Costco" },
];

const noop = () => {};

const meta: Meta<typeof VendorListView> = {
  title: "Vendors/VendorListView",
  component: VendorListView,
  args: {
    vendors: SAMPLE_VENDORS,
    onAdd: noop,
  },
};

export default meta;

type Story = StoryObj<typeof VendorListView>;

/** Default view with sample vendors, sorted by name ascending. */
export const Default: Story = {};

/** Empty state with no vendors. */
export const Empty: Story = {
  args: {
    vendors: [],
  },
};
