import {
  Alert,
  ActivityIndicator,
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function AddAnnouncementScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedDays, setPinnedDays] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      if (!alive) return;

      const authUserId = userData.user?.id ?? null;

      // Fetch user profile to check role and get the correct author_id
      if (authUserId) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, role')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        } else if (profileData) {
          setAuthorId(profileData.id); // Use the ID from user_profiles
          setUserRole(profileData.role ?? null);

          // Check if user is admin or staff
          if (profileData.role !== 'admin' && profileData.role !== 'staff') {
            Alert.alert('Access Denied', 'Only administrators and staff can post announcements.', [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]);
          }
        }
      }

      setLoading(false);
    };

    bootstrap();

    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async () => {
    // Check role again before submission
    if (userRole !== 'admin' && userRole !== 'staff') {
      Alert.alert('Access Denied', 'Only administrators and staff can post announcements.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Validation', 'Announcement body is required.');
      return;
    }

    setSubmitting(true);

    try {
      let pinnedUntil = null;

      if (isPinned) {
        const days = parseInt(pinnedDays) || 7;
        const date = new Date();
        date.setDate(date.getDate() + days);
        pinnedUntil = date.toISOString();
      }

      const { error } = await supabase.from('announcements').insert({
        title: title.trim(),
        body: body.trim(),
        author_id: authorId,
        pinned_until: pinnedUntil,
      });

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      Alert.alert('Success', 'Announcement posted successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace('/announcements'),
        },
      ]);

      setTitle('');
      setBody('');
      setIsPinned(false);
      setPinnedDays('7');
    } catch (error) {
      console.error('Error submitting announcement:', error);
      Alert.alert('Error', 'Unable to post the announcement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'New Announcement',
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="mt-4 text-foreground/60">Checking permissions...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
          <ScrollView className="mx-4 mb-8 h-full" showsVerticalScrollIndicator={false}>
            <View className="gap-4 pb-24">
              <View>
                <Label className="mb-2 text-sm font-semibold text-foreground/80">Title *</Label>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter announcement title"
                  autoComplete="off"
                  autoCorrect
                />
              </View>

              <View>
                <Label className="mb-2 text-sm font-semibold text-foreground/80">Body *</Label>
                <Input
                  value={body}
                  onChangeText={setBody}
                  placeholder="Write your announcement..."
                  multiline
                  textAlignVertical="top"
                  className="h-48 max-h-fit min-h-48"
                />
              </View>

              <View>
                <View className="mb-2 flex flex-row items-center gap-3">
                  <Checkbox checked={isPinned} onCheckedChange={setIsPinned} />
                  <View className="flex-1">
                    <Label className="text-sm font-semibold text-foreground/80">
                      Pin Announcement
                    </Label>
                    <Text className="text-xs text-foreground/60">
                      Pinned announcements appear at the top
                    </Text>
                  </View>
                </View>

                {isPinned && (
                  <View className="mt-2">
                    <Label className="mb-2 text-sm text-foreground/80">Pin for (days)</Label>
                    <Input
                      value={pinnedDays}
                      onChangeText={setPinnedDays}
                      placeholder="7"
                      keyboardType="number-pad"
                    />
                  </View>
                )}
              </View>

              <View>
                <Text className="text-xs text-foreground/60">
                  {authorId && userRole
                    ? `Posting as ${userRole === 'admin' ? 'Administrator' : 'Staff'}`
                    : 'You must be signed in as admin or staff to post announcements.'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View className="absolute bottom-16 left-0 right-0 border-t border-border bg-background p-4">
            <Button
              className="flex-row items-center justify-center gap-2"
              disabled={submitting || !authorId || (userRole !== 'admin' && userRole !== 'staff')}
              onPress={handleSubmit}>
              {submitting && <ActivityIndicator color="#ffffff" />}
              <Text className="text-base text-primary-foreground">
                {submitting ? 'Posting...' : 'Post Announcement'}
              </Text>
            </Button>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}
