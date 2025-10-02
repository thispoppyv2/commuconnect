import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';

export default function AddReportScreen() {
  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: 'Add Report', headerShadowVisible: false }}
      />

      <View className="flex-1 items-center justify-center">
        <Text>Add Report Screen</Text>
      </View>
    </>
  );
}
