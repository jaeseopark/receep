export type UserInfo = {
  user_id: number;
  username: string;
  roles: string[];
  config: Record<string, any>;
};

export type AppInfo = {
  signup: "OPEN" | "CLOSED" | "INVITE_ONLY";
  totp_enabled: boolean;
  user_count: number;
};

export type Receipt = {
  id: number;
  user_id: number;
  created_at: number;
  content_type: string;
  content_length: number;
  content_hash: string;
  transactions: object[];
  is_uploading: boolean;
};

export type LineItem = {
  id: number;
  name: string;
  transaction_id: number;
  amount: number;
  notes?: string;
  category_id: number;
  biz_portion_input: string;
  biz_portion: number;
};

export type Transaction = {
  id: number;
  user_id: number;
  created_at: number;
  line_items: LineItem[];
  vendor?: string;
  receipt_id?: number;
  notes?: string;
};
