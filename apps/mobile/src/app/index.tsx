import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useFamily } from '@/providers/FamilyProvider';

/** App entry ("/"): sends people to the right place for their sign-in and setup state. */
export default function Entry() {
  const { session, profile } = useAuth();
  const { families } = useFamily();
  if (!session) return <Redirect href="/sign-in" />;
  if (!profile?.display_name) return <Redirect href="/profile-setup" />;
  if (families.length === 0) return <Redirect href="/family-setup" />;
  return <Redirect href="/home" />;
}
