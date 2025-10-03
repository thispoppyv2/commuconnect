import { useColorScheme } from 'nativewind';
import { ReportList } from '@/components/report-list';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { View, Pressable } from 'react-native';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocalSearchParams } from 'expo-router';

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const { isDefaultMine } = useLocalSearchParams<{ isDefaultMine?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [showMyReports, setShowMyReports] = useState(isDefaultMine === 'true');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);

      // Fetch user_profile id
      if (currentUser?.id) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', currentUser.id)
          .single();

        setUserProfileId(profileData?.id || null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Update showMyReports when the param changes
    if (isDefaultMine === 'true') {
      setShowMyReports(true);
    }
  }, [isDefaultMine]);

  return (
    <View className="flex-1">
      {/* Search and Filter Bar */}
      <View className="mb-2 border-b border-border bg-background p-4">
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search reports..."
          className="w-full"
        />
        <Pressable
          onPress={() => setShowMyReports(!showMyReports)}
          className="mt-3 flex flex-row items-center gap-2">
          <Checkbox
            className="h-6 w-6"
            checked={showMyReports}
            onCheckedChange={setShowMyReports}
          />
          <Text className="text-sm">Show only my reports</Text>
        </Pressable>
      </View>

      <ReportList
        searchQuery={searchQuery}
        showMyReports={showMyReports}
        currentUserProfileId={userProfileId}
      />
    </View>
  );
}
