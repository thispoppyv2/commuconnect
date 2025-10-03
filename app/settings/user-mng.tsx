import { Alert, ActivityIndicator, ScrollView, View, Pressable, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Href, Stack, useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Pencil, Trash2, UserCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

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
  auth: {
    users: {
      email: string;
    };
  };
};

export default function UserManagementScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      const checkPermissionsAndFetch = async () => {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();

        if (userData.user?.id) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('auth_user_id', userData.user.id)
            .single();

          setUserRole(profileData?.role ?? null);

          // Only allow admins to access this page
          if (profileData?.role !== 'admin') {
            Alert.alert('Access Denied', 'Only administrators can manage users.');
            router.back();
            return;
          }
        }

        await fetchUsers();
        setLoading(false);
      };

      checkPermissionsAndFetch();
    }, [])
  );

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users.');
    } else {
      // Fetch emails from auth.users for each user

      setUsers(data as UserProfile[]);
    }
  };

  const handleDelete = (user: UserProfile) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${user.first_name} ${user.last_name}"? This will also delete their authentication account and cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // First delete the user profile
              const { error: profileError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', user.id);

              if (profileError) {
                if (profileError.code === '23503') {
                  Alert.alert(
                    'Cannot Delete',
                    'This user has associated data (reports, comments, etc.). Please reassign or delete their data before removing this user.'
                  );
                } else {
                  throw profileError;
                }
              } else {
                // Note: Deleting from auth.users requires server-side admin access
                // This would typically be done via a Supabase Edge Function
                Alert.alert(
                  'Profile Deleted',
                  'User profile deleted. Note: The authentication account may need to be removed separately via admin dashboard.'
                );
                await fetchUsers();
              }
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Unable to delete user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.auth?.users?.email?.toLowerCase() || '';
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

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
          title: 'Manage Users',
          headerShadowVisible: false,
        }}
      />

      <View className="flex-1">
        {/* Search Bar */}
        <View className="border-b border-border bg-background p-4">
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or email..."
            className="w-full"
          />
          <Text className="mt-2 text-xs text-foreground/60">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="flex flex-col gap-2">
            {filteredUsers.length === 0 ? (
              <Card className="p-4">
                <Text className="text-center text-foreground/70">
                  {searchQuery ? 'No users found matching your search.' : 'No users yet.'}
                </Text>
              </Card>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="flex flex-row items-center gap-3 p-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-muted">
                    {user.profile_image ? (
                      <Image
                        source={{ uri: user.profile_image }}
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                      />
                    ) : (
                      <UserCircle size={32} color={colorScheme === 'light' ? 'black' : 'white'} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold">
                      {user.first_name} {user.last_name}
                    </Text>

                    <View className="mt-1 flex flex-row items-center gap-2">
                      <View className="rounded bg-muted px-2 py-0.5">
                        <Text className="text-xs capitalize">{user.role || 'user'}</Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex flex-row items-start gap-2">
                    <Pressable
                      onPress={() => router.push(`/settings/user-mng/${user.id}` as Href)}
                      className="rounded-lg bg-muted p-2">
                      <Pencil size={18} color={colorScheme === 'light' ? 'black' : 'white'} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(user)}
                      className="rounded-lg bg-destructive p-2">
                      <Trash2 size={18} color="white" />
                    </Pressable>
                  </View>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
