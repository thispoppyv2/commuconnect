import { Stack } from 'expo-router';

export default function NotificationsPage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </>
  );
}
