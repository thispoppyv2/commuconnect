import { useColorScheme } from 'nativewind';
import { type ImageStyle } from 'react-native';
import { Stack } from 'expo-router';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const IMAGE_STYLE: ImageStyle = {
  height: 120,
  width: 120,
  borderRadius: 8,
};

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const unreadNotifications = 3; // Example unread notifications count

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Announcements',
          headerBlurEffect: 'systemMaterial',
          headerShown: true,
        }}
      />
    </>
  );
}
