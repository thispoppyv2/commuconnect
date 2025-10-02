import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { type ImageStyle } from 'react-native';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export default function Screen() {
  const { colorScheme } = useColorScheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
    </>
  );
}
