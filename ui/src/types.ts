export type UserInfo = {
  user_id: number;
  username: string;
  roles: string[];
  config: {
    tax_rate: number; // Ex. 0.05
    currency_decimal_places: number; // Ex. 2
    advanced_mode: boolean;
    notes: string;
  };
};

export type AppInfo = {
  signup: "OPEN" | "CLOSED" | "INVITE_ONLY";
  totp_enabled: boolean;
  user_count: number;
};

export type LineItem = {
  id: number;
  name: string;
  transaction_id: number;
  amount_input: string;
  amount: number;
  notes?: string;
  category_id: number;
};

export type Transaction = {
  id: number;
  user_id: number;
  timestamp: number;
  line_items: LineItem[];
  vendor_id?: number;
  receipt_id?: number;
  amount: number;
};

export type Receipt = {
  id: number;
  user_id: number;
  created_at: number;
  content_type: string;
  content_length: number;
  content_hash: string;
  transactions: Transaction[];
  is_uploading: boolean;
  rotation: number;
  ocr_metadata: Record<string, number>;
};

export type Vendor = {
  id: number;
  user_id: number;
  name: string;
};

export type Category = {
  id: number;
  name: string;
  description: string;
  user_id: number;
};
