import { TabLayout } from '@/components/tabs';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  return <TabLayout />;
}
