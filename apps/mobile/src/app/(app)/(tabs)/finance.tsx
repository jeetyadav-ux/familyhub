import { TAB_MODULES } from '@familyhub/shared';
import { ModulePlaceholder } from '@/features/ModulePlaceholder';

export default function FinanceTab() {
  return <ModulePlaceholder module={TAB_MODULES.find((m) => m.key === 'finance')!} />;
}
