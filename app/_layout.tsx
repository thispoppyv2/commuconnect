import 'react-native-gesture-handler';
import '@/global.css';
import '@/reanimatedConfig';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BellIcon, PlusCircle, Settings } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Badge } from '@/components/ui/badge';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import Constants from 'expo-constants';
export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';
export default function Layout() {
  const { colorScheme } = useColorScheme();
  const pathname = usePathname();
  const unreadNotifications = 3; // Example unread notifications count
  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colorScheme === 'dark' ? 'white' : 'black',
          contentStyle: {
            backgroundColor: colorScheme === 'dark' ? '#000000' : '#ffffff',
          },
        }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            title: 'Home',
            headerBlurEffect: 'systemMaterial',
            headerShown: true,
            headerBackVisible: false,
            headerShadowVisible: false,

            headerTitle: () => (
              <View className="-ml-1 w-full justify-start">
                <Text variant="h3" className="mt-2 w-full border-0">
                  {Constants.expoConfig.name}
                </Text>
              </View>
            ),
            headerRight: () => (
              <View className="flex w-fit flex-row gap-4 px-2">
                <View className="w-fit flex-row items-center justify-between gap-x-2">
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
                {pathname == '/reports' && (
                  <Pressable onPress={() => router.push('/reports/add')} className="my-auto">
                    <PlusCircle color={colorScheme === 'light' ? 'black' : 'white'} />
                  </Pressable>
                )}
                {pathname == '/settings' && (
                  <Pressable
                    onPress={() => router.push('/settings/settings-main')}
                    className="my-auto">
                    <Settings color={colorScheme === 'light' ? 'black' : 'white'} />
                  </Pressable>
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
        <Stack.Screen
          name="reports/[id]/index"
          options={{
            headerShown: true,
            title: '',

            headerBackButtonDisplayMode: 'minimal',
          }}
        />

        <Stack.Screen
          name="announcements/[id]/index"
          options={{
            headerShown: true,
            title: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="settings/profile"
          options={{
            headerShown: true,
            title: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="reports/[id]/edit"
          options={{
            headerShown: true,
            title: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="reports/[id]/add-timeline"
          options={{
            headerShown: true,
            title: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="settings/category-mng"
          options={{
            headerShown: true,
            title: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack>

      <PortalHost />
    </ThemeProvider>
  );
}
