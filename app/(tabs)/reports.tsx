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
import PickerModal from 'react-native-picker-modal-view';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Filter } from 'lucide-react-native';

type UserProfile = {
  Id: string;
  id: string;
  first_name: string | null;
  last_name: string | null;
  Name: string;
  Value: string;
};

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const { isDefaultMine } = useLocalSearchParams<{ isDefaultMine?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [showMyReports, setShowMyReports] = useState(isDefaultMine === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedUserName, setSelectedUserName] = useState<string>('All Users');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

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

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        const transformedUsers = [
          {
            Id: 'all',
            id: 'all',
            first_name: null,
            last_name: null,
            Name: 'All Users',
            Value: 'all',
          },
          ...(data || []).map((user: any) => {
            const displayName =
              user.first_name || user.last_name
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : 'Unknown User';
            return {
              Id: user.id,
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              Name: displayName,
              Value: user.id,
            };
          }),
        ];
        setUsers(transformedUsers);
      }
    };

    fetchUser();
    fetchUsers();
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
      <View className="border-b border-border bg-background p-4">
        <View className="flex-row gap-2">
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search reports..."
            className="flex-1"
          />

          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter
                  color={colorScheme === 'dark' ? '#fafafa' : '#0a0a0a'}
                  className="h-4 w-4 text-foreground"
                />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-screen">
              <DialogHeader>
                <DialogTitle>Filter Reports</DialogTitle>
                <DialogDescription>Customize your report view with filters</DialogDescription>
              </DialogHeader>

              <View className="gap-4 py-4">
                <View>
                  <Label className="mb-2">Filter by User</Label>
                  <PickerModal
                    items={users}
                    selected={users.find((u) => u.Value === selectedUserId)}
                    onSelected={(item) => {
                      setSelectedUserId(String(item.Value));
                      setSelectedUserName(String(item.Name));
                      return item;
                    }}
                    onClosed={() => {}}
                    onBackButtonPressed={() => {}}
                    onEndReached={() => {}}
                    showAlphabeticalIndex={false}
                    autoGenerateAlphabeticalIndex={false}
                    selectPlaceholderText="Select a user"
                    searchPlaceholderText="Search users..."
                    requireSelection={false}
                    autoSort={false}
                    ModalProps={{
                      transparent: true,
                      animationType: 'slide',
                    }}
                    SearchInputProps={{
                      style: {
                        backgroundColor: colorScheme === 'dark' ? '#262626' : '#f5f5f5',
                        color: colorScheme === 'dark' ? '#fafafa' : '#0a0a0a',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      },
                      placeholderTextColor: colorScheme === 'dark' ? '#a3a3a3' : '#737373',
                    }}
                    FlatListProps={
                      {
                        style: {
                          backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#ffffff',
                        },
                      } as any
                    }
                    renderListItem={(selected, item) => (
                      <View
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#ffffff',
                          borderBottomWidth: 1,
                          borderBottomColor: colorScheme === 'dark' ? '#262626' : '#e5e5e5',
                        }}>
                        <Text
                          style={{
                            fontSize: 16,
                            color: colorScheme === 'dark' ? '#fafafa' : '#0a0a0a',
                          }}>
                          {item.Name}
                        </Text>
                      </View>
                    )}
                    renderSelectView={(disabled, selected, showModal) => (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onPress={() => !disabled && showModal()}>
                        <Text
                          className={
                            selectedUserId !== 'all' ? 'text-foreground' : 'text-muted-foreground'
                          }>
                          {selectedUserName}
                        </Text>
                      </Button>
                    )}
                  />
                </View>

                <Pressable
                  onPress={() => {
                    const newValue = !showMyReports;
                    setShowMyReports(newValue);
                    if (newValue) {
                      setSelectedUserId('all');
                      setSelectedUserName('All Users');
                    }
                  }}
                  className="flex flex-row items-center gap-2">
                  <Checkbox
                    className="h-6 w-6"
                    checked={showMyReports}
                    onCheckedChange={(checked) => {
                      setShowMyReports(checked);
                      if (checked) {
                        setSelectedUserId('all');
                        setSelectedUserName('All Users');
                      }
                    }}
                  />
                  <Text className="text-sm">Show only my reports</Text>
                </Pressable>
              </View>

              <DialogFooter>
                <Button
                  variant="outline"
                  onPress={() => {
                    setShowMyReports(false);
                    setSelectedUserId('all');
                    setSelectedUserName('All Users');
                    setFilterDialogOpen(false);
                  }}>
                  <Text>Clear Filters</Text>
                </Button>
                <Button onPress={() => setFilterDialogOpen(false)}>
                  <Text>Apply</Text>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </View>
      </View>

      <ReportList
        searchQuery={searchQuery}
        showMyReports={showMyReports}
        currentUserProfileId={userProfileId}
        filterUserId={selectedUserId !== 'all' ? selectedUserId : undefined}
      />
    </View>
  );
}
