import { router, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ScrollView, View, type ImageStyle } from 'react-native';
import { Text } from '@/components/ui/text';

import { Button } from '@/components/ui/button';
import { MoonIcon, Smartphone, SunIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export default function Screen() {
  const { colorScheme, toggleColorScheme, setColorScheme } = useColorScheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />

      <ScrollView className="mx-2 pt-4">
        <View className="flex w-full px-2">
          <Text variant="h4" className="mb-2">
            Toggle Theme
          </Text>
          <View className="m-auto mt-2 flex h-28 w-fit flex-row flex-nowrap gap-2">
            <Button
              onPress={() => setColorScheme('light')}
              variant={colorScheme === 'light' ? 'default' : 'secondary'}
              className="flex h-full w-[31%] flex-col items-center justify-center gap-1">
              <SunIcon color={colorScheme === 'light' ? 'white' : 'white'} />
              <Text className="text-center">Light</Text>
            </Button>
            <Button
              onPress={() => setColorScheme('dark')}
              variant={colorScheme === 'dark' ? 'default' : 'secondary'}
              className="flex h-full w-[31%] flex-col items-center justify-center gap-1">
              <MoonIcon color={colorScheme === 'dark' ? 'black' : 'black'} />
              <Text className="text-center">Dark</Text>
            </Button>
            <Button
              onPress={() => setColorScheme('system')}
              variant={colorScheme === 'dark' ? 'default' : 'secondary'}
              className="flex h-full w-[31%] flex-col items-center justify-center gap-1">
              <Smartphone color={'black'} />
              <Text className="text-center">System</Text>
            </Button>
          </View>

          <Button
            variant="secondary"
            className="m-auto my-1 mt-5 w-full"
            onPress={() => {
              router.push('/settings/category-mng');
            }}>
            <Text>Category Management</Text>
          </Button>
          <Button
            variant="secondary"
            className="m-auto my-1 mt-5 w-full"
            onPress={() => {
              router.push('/settings/user-mng');
            }}>
            <Text>User Management</Text>
          </Button>
          <Button
            className="mt-4 w-full"
            onPress={() => {
              supabase.auth.signOut();
              router.push('/');
            }}>
            <Text>Logout</Text>
          </Button>
        </View>
      </ScrollView>
    </>
  );
}
