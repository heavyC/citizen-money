export const CATEGORIES = [
  "Income",
  "Transfer",
  "Groceries",
  "Restaurants",
  "Coffee Shops",
  "Shopping",
  "Entertainment",
  "Travel",
  "Transportation",
  "Utilities",
  "Rent/Mortgage",
  "Insurance",
  "Health",
  "Subscriptions",
  "Fees & Charges",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
