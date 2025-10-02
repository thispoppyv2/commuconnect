import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned_until: string | null;
  created_at: string;
  user_profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchAnnouncement = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*, user_profiles(first_name, last_name)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching announcement:', error);
        setAnnouncement(null);
      } else {
        setAnnouncement(data as Announcement);
      }
      setLoading(false);
    };

    fetchAnnouncement();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!announcement) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text>Announcement not found.</Text>
      </View>
    );
  }

  const isPinned = announcement.pinned_until && new Date(announcement.pinned_until) > new Date();
  const authorName =
    announcement.user_profiles?.first_name || announcement.user_profiles?.last_name
      ? `${announcement.user_profiles.first_name || ''} ${announcement.user_profiles.last_name || ''}`.trim()
      : 'Admin';

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: announcement.title,
          headerBlurEffect: 'systemMaterial',
          headerShown: true,
        }}
      />
      <ScrollView className="flex-1 p-4">
        <Card className="w-full">
          <CardHeader>
            <View className="flex flex-row items-start justify-between">
              <CardTitle className="flex-1 text-2xl">{announcement.title}</CardTitle>
              {isPinned && (
                <Badge variant="default" className="ml-2">
                  <Text className="text-xs">Pinned</Text>
                </Badge>
              )}
            </View>
            <Text className="pt-1 text-sm text-muted-foreground">
              {new Date(announcement.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              • {authorName}
            </Text>
          </CardHeader>
          <CardContent>
            <Text className="text-base leading-6">{announcement.body || 'No content.'}</Text>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
