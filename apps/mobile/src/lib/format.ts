import { roleLabel, type ActivityItem, type FamilyRole, isFamilyRole } from '@familyhub/shared';

/** "just now", "5 min ago", "3 h ago", "yesterday", "12 Oct". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24 && then.getDate() === now.getDate()) return `${hours} h ago`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return 'yesterday';
  if (hours < 24) return `${hours} h ago`;
  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "Expires in 6 days", "Expires today", "Expired". */
export function expiryLabel(iso: string, now: Date = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function role(value: unknown): string {
  return isFamilyRole(value) ? roleLabel(value as FamilyRole).toLowerCase() : 'member';
}

/** "an adult", "a child", "an admin", "a viewer" */
export function roleWithArticle(value: FamilyRole): string {
  return article(roleLabel(value).toLowerCase());
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

/** Plain-language sentence for an activity item. Unknown verbs fall back to a generic line. */
export function describeActivity(item: Pick<ActivityItem, 'verb' | 'data'>, myName?: string | null): string {
  const d = item.data ?? {};
  const actor = d.actor_name && d.actor_name !== myName ? String(d.actor_name) : d.actor_name ? 'You' : 'Someone';
  const target = d.target_name ? String(d.target_name) : 'a member';
  switch (item.verb) {
    case 'family.created':
      return `${actor} created the family`;
    case 'family.renamed':
      return `${actor} renamed the family to "${String(d.to ?? '')}"`;
    case 'member.joined':
      return `${actor} joined as ${article(role(d.role))}`;
    case 'member.left':
      return `${actor} left the family`;
    case 'member.removed':
      return `${actor} removed ${target}`;
    case 'member.role_changed':
      return `${actor} changed ${target} from ${role(d.from)} to ${role(d.to)}`;
    case 'invitation.created': {
      const who = d.relationship_label ? String(d.relationship_label) : d.phone_masked ? String(d.phone_masked) : 'someone';
      return `${actor} invited ${who} as ${article(role(d.role))}`;
    }
    case 'admin.transferred':
      return `${actor} made ${target} the primary admin`;
    case 'permissions.changed':
      return `${actor} ${d.allowed ? 'allowed' : 'stopped'} ${role(d.role)}s: ${String(d.permission ?? '')}`;
    default:
      return `${actor} made a change`;
  }
}

export function activityIcon(verb: string): string {
  if (verb.startsWith('member.joined')) return 'person-add-outline';
  if (verb.startsWith('member.')) return 'people-outline';
  if (verb.startsWith('invitation.')) return 'mail-outline';
  if (verb.startsWith('permissions.')) return 'shield-checkmark-outline';
  if (verb.startsWith('admin.')) return 'star-outline';
  return 'home-outline';
}
