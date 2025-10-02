import { useColorScheme } from 'nativewind';
import { View, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned_until: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  user_profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, user_profiles(first_name, last_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements((data as Announcement[]) ?? []);
    }
  };

  useEffect(() => {
    const loadAnnouncements = async () => {
      setLoading(true);
      await fetchAnnouncements();
      setLoading(false);
    };

    loadAnnouncements();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: 'Announcements',
          headerBlurEffect: 'systemMaterial',
          headerShown: true,
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          className="mx-2 mt-2 flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View className="flex flex-col gap-2 pb-4">
            {announcements.length === 0 ? (
              <Card className="p-4">
                <Text className="text-center text-foreground/70">No announcements yet.</Text>
              </Card>
            ) : (
              announcements.map((announcement) => {
                const isPinned =
                  announcement.pinned_until && new Date(announcement.pinned_until) > new Date();
                const authorName =
                  announcement.user_profiles?.first_name || announcement.user_profiles?.last_name
                    ? `${announcement.user_profiles.first_name || ''} ${announcement.user_profiles.last_name || ''}`.trim()
                    : 'Admin';

                return (
                  <Link href={`/announcements/${announcement.id}`} key={announcement.id}>
                    <Card className="flex flex-col gap-1 p-3">
                      <View className="flex flex-row items-start justify-between">
                        <Text className="flex-1 font-semibold">{announcement.title}</Text>
                        {isPinned && (
                          <Badge variant="default" className="ml-2">
                            <Text className="text-xs">Pinned</Text>
                          </Badge>
                        )}
                      </View>
                      <Text className="text-sm text-foreground/70">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        • {authorName}
                      </Text>
                      {announcement.body && (
                        <Text className="mt-1 max-h-4 max-w-full text-sm text-foreground/70">
                          {announcement.body}
                        </Text>
                      )}
                    </Card>
                  </Link>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
