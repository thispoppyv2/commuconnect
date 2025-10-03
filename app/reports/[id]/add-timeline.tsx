import {
  Alert,
  ActivityIndicator,
  ScrollView,
  View,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { Input } from '@/components/ui/input';

const STATUS_OPTIONS = [
  { label: 'Submitted', value: 'submitted' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
  { label: 'Rejected', value: 'rejected' },
];

export default function AddTimelineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<string>('in_progress');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!id) return;

      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id ?? null);

      if (userData.user?.id) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('auth_user_id', userData.user.id)
          .single();

        setUserRole(profileData?.role ?? null);

        // Only allow admins to add timeline entries
        if (profileData?.role !== 'admin') {
          Alert.alert('Access Denied', 'Only administrators can add timeline entries.');
          router.back();
        }
      }

      setLoading(false);
    };

    checkPermissions();
  }, [id]);

  const handleSubmit = async () => {
    if (!status) {
      Alert.alert('Validation', 'Please select a status.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Validation', 'Description is required.');
      return;
    }

    setSubmitting(true);

    try {
      // Insert timeline entry
      const { error: timelineError } = await supabase.from('report_timelines').insert({
        report_id: id,
        status,
        description: description.trim(),
        changed_by: currentUserId,
      });

      if (timelineError) {
        console.error('Timeline insert error:', timelineError);
        throw timelineError;
      }

      // Update report status
      const { error: reportError } = await supabase
        .from('reports')
        .update({
          status,
          updated_at: new Date(),
        })
        .eq('id', id);

      if (reportError) {
        console.error('Report update error:', reportError);
        throw reportError;
      }

      Alert.alert('Success', 'Timeline entry added successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error adding timeline entry:', error);
      Alert.alert('Error', 'Unable to add timeline entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: 'Add Timeline Entry', headerShadowVisible: false }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          className="mx-2 mb-8 h-full"
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled">
          <View className="gap-4">
            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Status</Text>
              <View
                className="rounded-lg border border-border bg-background"
                style={
                  Platform.OS === 'android' && {
                    paddingVertical: 0,
                    height: 50,
                    overflow: 'hidden',
                  }
                }>
                <Picker
                  selectedValue={status}
                  onValueChange={(itemValue) => setStatus(itemValue)}
                  style={Platform.select({
                    ios: { height: 200, color: 'hsl(var(--foreground))' },
                    android: { color: 'hsl(var(--foreground))' },
                  })}>
                  {STATUS_OPTIONS.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Description</Text>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the status update"
                multiline
                textAlignVertical="top"
                className="h-32 max-h-fit min-h-32"
              />
            </View>
          </View>
        </ScrollView>
        <Button
          className="fixed bottom-12 mx-2 flex-row items-center justify-center gap-2"
          disabled={submitting}
          onPress={handleSubmit}>
          {submitting && <ActivityIndicator color="#ffffff" />}
          <Text className="text-base text-primary-foreground">
            {submitting ? 'Adding...' : 'Add Timeline Entry'}
          </Text>
        </Button>
      </KeyboardAvoidingView>
    </>
  );
}
