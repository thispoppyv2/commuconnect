import { Text } from '@/components/ui/text';
import { useColorScheme } from 'nativewind';
import { type ImageStyle, Linking, ScrollView, View } from 'react-native';
import { MessageSquareIcon, Paperclip, Pencil, PhoneIcon } from 'lucide-react-native';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-js';
import { useState } from 'react';
import { ReportList } from '@/components/report-list';
import { SelectProvider } from '@mobile-reality/react-native-select-pro';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const IMAGE_STYLE: ImageStyle = {
  height: 120,
  width: 120,
  borderRadius: 8,
};

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  user_profiles:
    | {
        first_name: string | null;
        last_name: string | null;
      }[]
    | null;
};

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const unreadNotifications = 3; // Example unread notifications count
  const [user, setUser] = useState<User | null>(null);
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<Announcement | null>(null);

  useFocusEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        setUser(null);
        router.replace('/auth');
      }
    };

    const fetchPinnedAnnouncement = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, created_at, user_profiles(first_name, last_name)')
        .gt('pinned_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // Not a "no rows returned" error
          console.error('Error fetching pinned announcement:', error);
        }
        setPinnedAnnouncement(null);
      } else {
        setPinnedAnnouncement(data as Announcement);
      }
    };

    fetchUser();
    fetchPinnedAnnouncement();
  });

  return (
    <SelectProvider>
      <ScrollView className="px-2" contentContainerStyle={{ paddingBottom: 100 }}>
        {user ? (
          <Text className="my-2 mb-2 text-center text-sm text-foreground/70">Welcome back</Text>
        ) : (
          <Card className="mb-2 flex flex-col gap-1 p-2">
            <Text variant="muted">You can sign up here!</Text>
            <Button className="w-full" onPress={() => router.push('/auth')}>
              <Text className="text-sm">Sign in / Sign Up</Text>
            </Button>
          </Card>
        )}
        <Card className="p-1">
          <CardHeader className="flex flex-col gap-0 p-1">
            <CardTitle>
              <Text variant="h4">Barangay Hotline</Text>
            </CardTitle>
            <View className="flex flex-row items-center gap-2">
              <View className="flex flex-row items-center gap-1">
                <PhoneIcon color={colorScheme === 'dark' ? 'white' : 'black'} />
                <Button
                  onPress={() => Linking.openURL('tel:+1234567890')}
                  variant={'link'}
                  className="p-0">
                  <Text className="text-lg text-primary">+1 (234) 567-890</Text>
                </Button>
              </View>
            </View>
            <Text className="text-sm text-foreground/70">
              For emergencies, please call the hotline immediately.
            </Text>
          </CardHeader>
        </Card>

        <View className="m-auto mt-2 flex h-24 w-fit flex-row flex-nowrap gap-2">
          <Button
            onPress={() => router.push('/reports/add')}
            className="flex h-full w-[31%] flex-col items-center justify-center gap-1">
            <Pencil color={colorScheme === 'light' ? 'white' : 'black'} />
            <Text className="text-center text-[10px]">Submit Report</Text>
          </Button>
          <Button
            onPress={() => router.push('/announcements')}
            className="flex h-full w-[31%] flex-col items-center justify-center gap-1">
            <MessageSquareIcon color={colorScheme === 'light' ? 'white' : 'black'} />
            <Text className="text-center text-[10px]">Announcements</Text>
          </Button>
          <Button
            onPress={() =>
              router.push({ pathname: '/(tabs)/reports', params: { isDefaultMine: 'true' } })
            }
            className="flex h-full w-[31%] flex-col items-center justify-center gap-1">
            <Paperclip color={colorScheme === 'light' ? 'white' : 'black'} />
            <Text className="text-center text-[10px]">My Reports</Text>
          </Button>
        </View>

        <View className="">
          <Text className="mt-4 text-lg font-semibold">Pinned Announcement</Text>
          {pinnedAnnouncement ? (
            <Link href={`/announcements/${pinnedAnnouncement.id}`} asChild className="py-1">
              <Card className="flex w-full flex-col gap-1 p-2 transition active:scale-95">
                <Text className="font-semibold">{pinnedAnnouncement.title}</Text>
                <Text className="text-sm text-foreground/70">
                  {new Date(pinnedAnnouncement.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text className="text-sm text-foreground/70">
                  {pinnedAnnouncement.body || 'No details provided.'}
                </Text>
              </Card>
            </Link>
          ) : (
            <Card className="flex flex-col gap-1 p-2">
              <Text className="text-center text-sm text-foreground/70">
                No pinned announcements at the moment.
              </Text>
            </Card>
          )}
        </View>
        <View className="pb-4">
          <Text className="mt-4 text-lg font-semibold">Recent Reports</Text>
          <ReportList isScrollable={false} limit={2} />
          <Button
            onPress={() => {
              router.push('/(tabs)/reports');
            }}
            variant={'link'}
            className="">
            <Text>View More...</Text>
          </Button>
        </View>
      </ScrollView>
    </SelectProvider>
  );
}
