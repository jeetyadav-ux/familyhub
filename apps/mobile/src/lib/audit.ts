import { isFamilyRole, roleLabel, type AuditLogEntry } from '@familyhub/shared';

function role(v: unknown): string {
  return isFamilyRole(v) ? roleLabel(v) : String(v ?? '');
}

/** Short, plain-language summary of an audit row. */
export function describeAudit(entry: Pick<AuditLogEntry, 'table_name' | 'action' | 'old_values' | 'new_values' | 'changed_fields'>): string {
  const o = entry.old_values ?? {};
  const n = entry.new_values ?? {};
  const changed = entry.changed_fields ?? [];

  switch (entry.table_name) {
    case 'families':
      if (entry.action === 'insert') return `Family created: ${String(n.name ?? '')}`;
      if (changed.includes('deleted_at')) return 'Family deleted';
      if (changed.includes('primary_admin_id')) return 'Primary admin transferred';
      if (changed.includes('name')) return `Family renamed: ${String(o.name)} → ${String(n.name)}`;
      return `Family settings changed (${changed.join(', ')})`;
    case 'family_members':
      if (entry.action === 'insert') return `Member added as ${role(n.role)}`;
      if (changed.includes('status')) {
        if (n.status === 'removed') return 'Member removed';
        if (n.status === 'left') return 'Member left';
        if (n.status === 'active') return `Member re-joined as ${role(n.role ?? o.role)}`;
      }
      if (changed.includes('role')) return `Role changed: ${role(o.role)} → ${role(n.role)}`;
      return `Membership updated (${changed.join(', ')})`;
    case 'family_invitations':
      if (entry.action === 'insert') return `Invitation created for ${role(n.role)}`;
      if (changed.includes('status')) return `Invitation ${String(n.status)}`;
      if (changed.includes('code_hint') || changed.includes('expires_at')) return 'Invitation resent with a new code';
      return 'Invitation updated';
    case 'family_role_permissions':
      if (entry.action === 'delete') return `Permission reset to default: ${String(o.permission)} for ${role(o.role)}s`;
      return `Permission ${n.allowed ? 'granted' : 'removed'}: ${String(n.permission)} for ${role(n.role)}s`;
    default:
      return `${entry.action} on ${entry.table_name}`;
  }
}
