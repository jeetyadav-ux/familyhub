import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { MORE_MODULES, TAB_MODULES } from '@familyhub/shared';
import { ModulePlaceholder } from '@/features/ModulePlaceholder';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ConfirmDialog } from '@/ui/dialogs';
import { OtpField } from '@/ui/inputs';
import { RoleBadge } from '@/ui/primitives';

const wrap = (ui: ReactNode) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('ModulePlaceholder', () => {
  it('explains when the module arrives and offers no fake actions', async () => {
    await wrap(<ModulePlaceholder module={TAB_MODULES.find((m) => m.key === 'finance')!} />);
    expect(screen.getByText('Finance')).toBeTruthy();
    expect(screen.getByText(/Arrives in Phase 2 · Core finance/)).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('marks shipped phases as available', async () => {
    await wrap(<ModulePlaceholder module={MORE_MODULES.find((m) => m.key === 'vault')!} />);
    expect(screen.getByText('Phase 1: Foundation (available)')).toBeTruthy();
    expect(screen.getByText('Phase 5: Vault & backup')).toBeTruthy();
  });
});

describe('RoleBadge', () => {
  it('labels the primary admin distinctly', async () => {
    await wrap(<RoleBadge role="admin" isPrimaryAdmin />);
    expect(screen.getByText('Primary admin')).toBeTruthy();
  });
});

describe('OtpField', () => {
  it('keeps digits only and completes at six', async () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    await wrap(<OtpField value="" onChange={onChange} onComplete={onComplete} />);
    await fireEvent.changeText(screen.getByTestId('otp-input'), '12a3 45');
    expect(onChange).toHaveBeenLastCalledWith('12345');
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('otp-input'), '1234567');
    expect(onChange).toHaveBeenLastCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });
});

describe('ConfirmDialog', () => {
  it('requires the typed confirmation before enabling the action', async () => {
    const onConfirm = jest.fn();
    await wrap(
      <ConfirmDialog visible title="Delete this family?" confirmLabel="Delete family" destructive requireText="Yadav Family" onConfirm={onConfirm} onCancel={() => undefined} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Delete family' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Type "Yadav Family" to confirm'), 'yadav family');
    await fireEvent.press(screen.getByRole('button', { name: 'Delete family' }));
    expect(onConfirm).toHaveBeenCalledWith({ reason: undefined, typed: 'yadav family' });
  });

  it('passes an optional reason for the audit log', async () => {
    const onConfirm = jest.fn();
    await wrap(<ConfirmDialog visible title="Remove Rohan?" confirmLabel="Remove member" askReason onConfirm={onConfirm} onCancel={() => undefined} />);
    await fireEvent.changeText(screen.getByLabelText('Reason (optional, saved in the audit log)'), '  Moved out ');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove member' }));
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'Moved out', typed: undefined });
  });
});
