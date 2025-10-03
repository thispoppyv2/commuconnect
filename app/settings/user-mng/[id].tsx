import {
  Alert,
  ActivityIndicator,
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';

type UserProfile = {
  id: string;
  auth_user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  location: string | null;
  role: string | null;
  profile_image: string | null;
  created_at: string;
};

const ROLE_OPTIONS = [
  { label: 'User', value: 'user' },
  { label: 'Staff', value: 'staff' },
  { label: 'Admin', value: 'admin' },
];

export default function EditUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState<string>('user');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const checkPermissionsAndFetch = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user?.id) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('auth_user_id', userData.user.id)
          .single();

        // Only allow admins to access this page
        if (profileData?.role !== 'admin') {
          Alert.alert('Access Denied', 'Only administrators can edit users.');
          router.back();
          return;
        }
      }

      await fetchUser();
      setLoading(false);
    };

    checkPermissionsAndFetch();
  }, [id]);

  const fetchUser = async () => {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Failed to load user.');
      router.back();
    } else {
      setUser(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setPhone(data.phone || '');
      setLocation(data.location || '');
      setRole(data.role || 'user');

      // Fetch email from auth
      const { data: authData } = await supabase.auth.admin.getUserById(data.auth_user_id);
      setEmail(authData?.user?.email || 'N/A');
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation', 'First name and last name are required.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          location: location.trim() || null,
          role: role,
          updated_at: new Date(),
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'User profile updated successfully.');
      router.back();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Unable to update user. Please try again.');
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
        options={{
          headerShown: true,
          title: 'Edit User',
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="gap-4">
            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">
                Email (Read-only)
              </Text>
              <View className="rounded-lg border border-border bg-muted px-3 py-3">
                <Text className="text-foreground/60">{email}</Text>
              </View>
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">First Name</Text>
              <Input value={firstName} onChangeText={setFirstName} placeholder="Enter first name" />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Last Name</Text>
              <Input value={lastName} onChangeText={setLastName} placeholder="Enter last name" />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Phone</Text>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Location</Text>
              <Input value={location} onChangeText={setLocation} placeholder="Enter location" />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Role</Text>
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
                  selectedValue={role}
                  onValueChange={(itemValue) => setRole(itemValue)}
                  style={Platform.select({
                    ios: { height: 150, color: 'hsl(var(--foreground))' },
                    android: { color: 'hsl(var(--foreground))' },
                  })}>
                  {ROLE_OPTIONS.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <Button onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-primary-foreground">Update User</Text>
              )}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
