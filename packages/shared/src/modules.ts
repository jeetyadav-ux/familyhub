/** The phase currently shipped. Modules and widgets from later phases show as upcoming. */
export const CURRENT_PHASE = 1;

export interface ModuleDef {
  key: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  phase: number;
}

/** Bottom tabs, in spec order (§4). */
export const TAB_MODULES: readonly ModuleDef[] = [
  { key: 'home', title: 'Home', description: 'Your family at a glance.', icon: 'home', phase: 1 },
  { key: 'finance', title: 'Finance', description: 'Expenses, income, accounts, cards and reports.', icon: 'wallet', phase: 2 },
  { key: 'shopping', title: 'Shopping', description: 'Shared shopping and grocery lists that sync in real time.', icon: 'cart', phase: 4 },
  { key: 'health', title: 'Health', description: 'Medicines, reminders, appointments and medical records.', icon: 'medkit', phase: 6 },
  { key: 'family', title: 'Family', description: 'Members, roles, invitations and permissions.', icon: 'people', phase: 1 },
  { key: 'more', title: 'More', description: 'Every other FamilyHub module.', icon: 'grid', phase: 1 },
];

/** "More" menu, in spec order (§4). */
export const MORE_MODULES: readonly ModuleDef[] = [
  { key: 'income', title: 'Income', description: 'Salary, business, rental and other income.', icon: 'cash-outline', phase: 2 },
  { key: 'accounts', title: 'Bank Accounts', description: 'Accounts, UPI, wallets and cash.', icon: 'business-outline', phase: 2 },
  { key: 'cards', title: 'Credit Cards', description: 'Limits, statements, due dates and card spending.', icon: 'card-outline', phase: 3 },
  { key: 'loans', title: 'EMI & Loans', description: 'EMI schedules, reminders and outstanding principal.', icon: 'repeat-outline', phase: 3 },
  { key: 'budgets', title: 'Budgets', description: 'Monthly and category budgets with forecasts.', icon: 'pie-chart-outline', phase: 3 },
  { key: 'vault', title: 'Family Vault', description: 'Documents and photos with expiry reminders.', icon: 'folder-open-outline', phase: 5 },
  { key: 'chat', title: 'Chat', description: 'Family group and one-to-one chat.', icon: 'chatbubbles-outline', phase: 4 },
  { key: 'tasks', title: 'Tasks', description: 'Shared tasks and reminders.', icon: 'checkbox-outline', phase: 6 },
  { key: 'calendar', title: 'Calendar', description: 'Birthdays, appointments, renewals and events.', icon: 'calendar-outline', phase: 6 },
  { key: 'bills', title: 'Bills', description: 'Utility bills, rent, fees and premiums.', icon: 'receipt-outline', phase: 6 },
  { key: 'subscriptions', title: 'Subscriptions', description: 'Recurring subscriptions and renewals.', icon: 'refresh-circle-outline', phase: 6 },
  { key: 'meals', title: 'Meal Planner', description: 'Weekly meals and recipes.', icon: 'restaurant-outline', phase: 7 },
  { key: 'inventory', title: 'Inventory', description: 'Household stock, expiry and low-stock alerts.', icon: 'cube-outline', phase: 7 },
  { key: 'vehicles', title: 'Vehicles', description: 'Insurance, PUC and service reminders.', icon: 'car-outline', phase: 7 },
  { key: 'property', title: 'Property', description: 'Properties, rent and maintenance.', icon: 'home-outline', phase: 7 },
  { key: 'travel', title: 'Travel', description: 'Trips, itineraries, packing and budgets.', icon: 'airplane-outline', phase: 7 },
  { key: 'savings', title: 'Savings Goals', description: 'Goals, contributions and progress.', icon: 'trending-up-outline', phase: 3 },
  { key: 'members', title: 'Family Members', description: 'Members, roles and invitations.', icon: 'people-outline', phase: 1 },
  { key: 'settings', title: 'Settings', description: 'Profile, appearance, family settings and app info.', icon: 'settings-outline', phase: 1 },
];

export function isModuleLive(module: Pick<ModuleDef, 'phase'>, currentPhase = CURRENT_PHASE): boolean {
  return module.phase <= currentPhase;
}

export const PHASE_NAMES: Record<number, string> = {
  1: 'Foundation',
  2: 'Core finance',
  3: 'Budgets & planning',
  4: 'Shopping & collaboration',
  5: 'Vault & backup',
  6: 'Health & household',
  7: 'More family modules',
  8: 'Intelligence & launch',
};
