import { CURRENT_PHASE } from './modules';

export interface WidgetDef {
  id: string;
  title: string;
  description: string;
  phase: number;
  /** Permission the viewer needs for the widget to apply to them. */
  requiresPermission?: string;
}

/** Home dashboard widgets from spec §4, tagged with the phase that makes them real. */
export const DASHBOARD_WIDGETS: readonly WidgetDef[] = [
  { id: 'setup_checklist', title: 'Get your family set up', description: 'Next steps for a new family.', phase: 1 },
  { id: 'family_members', title: 'Family members', description: 'Who is in this family and their roles.', phase: 1 },
  { id: 'pending_invitations', title: 'Pending invitations', description: 'Invitations waiting to be accepted.', phase: 1, requiresPermission: 'members.invite' },
  { id: 'family_activity', title: 'Family activity', description: 'Recent changes across the family.', phase: 1 },
  { id: 'month_expenses', title: 'Expenses this month', description: 'Total family spending this month.', phase: 2 },
  { id: 'month_income', title: 'Income this month', description: 'Total family income this month.', phase: 2 },
  { id: 'recent_transactions', title: 'Recent transactions', description: 'Latest expenses and income.', phase: 2 },
  { id: 'budget_overview', title: 'Budget', description: 'Budget, spent and remaining.', phase: 3 },
  { id: 'savings_progress', title: 'Savings progress', description: 'Progress towards savings goals.', phase: 3 },
  { id: 'upcoming_emis', title: 'Upcoming EMIs', description: 'EMIs due soon.', phase: 3 },
  { id: 'card_reminders', title: 'Credit card payments', description: 'Card bills due soon.', phase: 3 },
  { id: 'shopping_pending', title: 'Shopping list', description: 'Items still to buy.', phase: 4 },
  { id: 'document_expiry', title: 'Document expiry', description: 'Documents expiring soon.', phase: 5 },
  { id: 'todays_tasks', title: "Today's tasks", description: 'Tasks due today.', phase: 6 },
  { id: 'upcoming_events', title: 'Upcoming events', description: 'Birthdays, appointments and events.', phase: 6 },
  { id: 'upcoming_bills', title: 'Upcoming bills', description: 'Bills due soon.', phase: 6 },
  { id: 'medicine_reminders', title: 'Medicine reminders', description: "Today's medicine schedule.", phase: 6 },
];

export interface SavedWidget {
  id: string;
  visible: boolean;
}

export interface ResolvedLayout {
  /** Live widgets in the user's order, visible ones first in display order. */
  items: Array<WidgetDef & { visible: boolean }>;
  /** Widgets that arrive in a later phase. */
  upcoming: WidgetDef[];
}

/**
 * Merges a saved layout with the widget registry. Unknown ids are dropped, newly
 * available widgets are appended (visible), and widgets the user lacks permission
 * for are left out.
 */
export function resolveDashboardLayout(
  saved: ReadonlyArray<SavedWidget> | null | undefined,
  permissions: ReadonlyArray<string>,
  currentPhase: number = CURRENT_PHASE,
): ResolvedLayout {
  const allowed = (w: WidgetDef) => !w.requiresPermission || permissions.includes(w.requiresPermission);
  const live = DASHBOARD_WIDGETS.filter((w) => w.phase <= currentPhase && allowed(w));
  const upcoming = DASHBOARD_WIDGETS.filter((w) => w.phase > currentPhase);
  const liveById = new Map(live.map((w) => [w.id, w]));

  const items: ResolvedLayout['items'] = [];
  const seen = new Set<string>();
  for (const entry of saved ?? []) {
    const def = liveById.get(entry.id);
    if (!def || seen.has(entry.id)) continue;
    seen.add(entry.id);
    items.push({ ...def, visible: entry.visible !== false });
  }
  for (const def of live) {
    if (!seen.has(def.id)) items.push({ ...def, visible: true });
  }
  return { items, upcoming };
}

/** Converts a resolved layout back to what is stored in user_dashboard_layouts.widgets. */
export function toSavedLayout(items: ReadonlyArray<{ id: string; visible: boolean }>): SavedWidget[] {
  return items.map(({ id, visible }) => ({ id, visible }));
}

export function moveWidget<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}
