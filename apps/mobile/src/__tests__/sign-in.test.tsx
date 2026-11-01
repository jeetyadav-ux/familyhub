import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SignInScreen from '@/app/(auth)/sign-in';
import { ThemeProvider } from '@/providers/ThemeProvider';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockSignInWithOtp = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithOtp: (...a: unknown[]) => mockSignInWithOtp(...a) } } }));

const renderScreen = () =>
  render(
    <ThemeProvider>
      <SignInScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  mockPush.mockReset();
  mockSignInWithOtp.mockReset();
});

describe('Sign-in screen', () => {
  it('validates the number before contacting the server', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('send-otp'));
    expect(await screen.findByText('Enter your mobile number')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('phone-input'), '12345');
    await fireEvent.press(screen.getByTestId('send-otp'));
    expect(await screen.findByText('Enter a valid mobile number')).toBeTruthy();
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('sends an OTP to the E.164 number and opens verification', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('phone-input'), '98765 43210');
    await fireEvent.press(screen.getByTestId('send-otp'));
    await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: '+919876543210' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/verify', params: { phone: '+919876543210' } });
  });

  it('explains rate limiting in plain words', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'For security purposes, you can only request this after 30 seconds (rate limit)' } });
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('phone-input'), '9876543210');
    await fireEvent.press(screen.getByTestId('send-otp'));
    expect(await screen.findByText('Please wait a minute before requesting another code.')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
