import { Button } from '@/components/ui/button';
import { useColorScheme } from 'nativewind';
import { ScrollView, View, type ImageStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import { CirclePlus } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { ReportList } from '@/components/report-list';

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
      <Stack.Screen options={{ headerShown: true, title: 'Report' }} />

      <ScrollView className="mx-2">
        <ReportList />
      </ScrollView>
      <View className="fixed bottom-24 left-0 right-0 m-2">
        <Button
          onPress={() => router.push('/reports/add')}
          className="w-full flex-row items-center justify-center gap-2">
          <CirclePlus size={16} color={colorScheme === 'light' ? 'white' : 'black'} />
          <Text>Add a Report</Text>
        </Button>
      </View>
    </>
  );
}
