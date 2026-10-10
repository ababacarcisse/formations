export type Meeting = {
  id: string;
  meeting_number: number;
  title: string;
  starts_at: string;
  duration_minutes: number;
};
export type PublicSession = {
  id: string;
  title: string;
  capacity: number;
  remaining: number;
  registration_deadline: string;
  meetings: Meeting[];
};
export type TrainingSession = PublicSession & {
  status: "draft" | "open" | "closed" | "completed";
  meeting_link: string | null;
  whatsapp_group_link: string | null;
  notes: string | null;
};
export type Order = {
  id: string;
  session_id: string;
  full_name: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "expired" | "refunded";
  participant_number: number | null;
  manual_review: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  failure_reason: string | null;
  saspay_payment_id: string | null;
  saspay_session_id: string | null;
  checkout_url: string | null;
  access_token_hash: string;
  idempotency_key: string;
};
export type OrderView = {
  id: string;
  session_id: string;
  status: Order["status"];
  manual_review: boolean;
  participant_number: number | null;
  title?: string;
  meetings?: Meeting[];
  whatsapp_group_link?: string | null;
};
export type EmailLog = {
  id: string;
  order_id: string;
  type: string;
  status: string;
  attempts: number;
  locked_at: string | null;
};
export type Product = {
  id: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
  low_stock: number;
};
export type Client = { id: string; name: string; phone: string };
export type Sale = {
  id: string;
  product_id: string;
  client_id: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  paid: number;
  created_at: string;
};
export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  created_at: string;
};
