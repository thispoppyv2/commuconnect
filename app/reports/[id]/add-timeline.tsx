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
import PickerModal from 'react-native-picker-modal-view';
import { Input } from '@/components/ui/input';
import { useColorScheme } from 'nativewind';

type StatusOption = {
  Id: string;
  Name: string;
  Value: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { Id: 'submitted', Name: 'Submitted', Value: 'submitted' },
  { Id: 'open', Name: 'Open', Value: 'open' },
  { Id: 'in_progress', Name: 'In Progress', Value: 'in_progress' },
  { Id: 'under_review', Name: 'Under Review', Value: 'under_review' },
  { Id: 'resolved', Name: 'Resolved', Value: 'resolved' },
  { Id: 'closed', Name: 'Closed', Value: 'closed' },
  { Id: 'rejected', Name: 'Rejected', Value: 'rejected' },
];

export default function AddTimelineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<string>('in_progress');
  const [statusName, setStatusName] = useState<string>('In Progress');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { colorScheme } = useColorScheme();
  useEffect(() => {
    const checkPermissions = async () => {
      if (!id) return;

      const { data: userData } = await supabase.auth.getUser();

      if (userData.user?.id) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role, id')
          .eq('auth_user_id', userData.user.id)
          .single();
        setCurrentUserId(profileData?.id ?? null);
        setUserRole(profileData?.role ?? null);

        // Only allow admins to add timeline entries
        if (profileData?.role !== 'admin' && profileData?.role !== 'staff') {
          Alert.alert('Access Denied', 'Only administrators or staff can add timeline entries.');
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
              <PickerModal
                items={STATUS_OPTIONS}
                selected={STATUS_OPTIONS.find((s) => s.Value === status)}
                onSelected={(item) => {
                  setStatus(String(item.Value));
                  setStatusName(String(item.Name));
                  return item;
                }}
                autoSort={true}
                onClosed={() => {}}
                onBackButtonPressed={() => {}}
                onEndReached={() => {}}
                renderSelectView={(disabled, selected, showModal) => (
                  <Button
                    variant="outline"
                    onPress={() => !disabled && showModal()}
                    className="justify-start">
                    <Text>{statusName}</Text>
                  </Button>
                )}
              />
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
