import 'react-native-gesture-handler';
import '@/global.css';
import '@/reanimatedConfig';
import { usePathname } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { TabLayout } from '@/components/tabs';
export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';
export default function Layout() {
  const { colorScheme } = useColorScheme();
  const pathname = usePathname();
  const unreadNotifications = 3; // Example unread notifications count
  return <TabLayout />;
}
