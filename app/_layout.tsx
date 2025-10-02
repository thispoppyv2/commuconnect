import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BellIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Badge } from '@/components/ui/badge';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import Constants from 'expo-constants';
export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const unreadNotifications = 3; // Example unread notifications count
  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            title: 'Home',
            headerBlurEffect: 'systemMaterial',
            headerShown: true,
            headerBackVisible: false,
            headerShadowVisible: false,
            headerTitle: () => (
              <View className="ml-1.5 w-full justify-start">
                <Text variant="h2" className="mt-2 border-0">
                  {Constants.expoConfig?.name}
                </Text>
              </View>
            ),
            headerRight: () => (
              <View className="ml-1.5">
                <BellIcon
                  color={colorScheme === 'light' ? 'black' : 'white'}
                  size={24}
                  onPress={() => router.push('/settings/notif')}
                  className="my-auto"
                />
                {unreadNotifications > 0 && (
                  <Badge variant={'destructive'} className="absolute right-4 top-1 size-2 p-0" />
                )}
              </View>
            ),
          }}
        />

        <Stack.Screen
          name="settings/notif"
          options={{
            title: 'Notifications',
            headerLargeTitle: false,
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack>

      <PortalHost />
    </ThemeProvider>
  );
}
