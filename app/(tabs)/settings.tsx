'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';

import { useFocusEffect, useRouter } from 'expo-router';
import { AtSignIcon, Building, PhoneCall } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { ActivityIndicator, type ImageStyle, ScrollView, View } from 'react-native';
import { User } from '@supabase/supabase-js';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  location: string | null;
  role: string | null;
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  useFocusEffect(() => {
    const fetchUserAndProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, phone, location, role')
          .eq('auth_user_id', user.id)
          .limit(1)
          .single();

        if (error) {
          router.replace('/');
        } else {
          setProfile(profileData);
        }
      } else {
        setProfile(null);
        router.replace('/');
      }
    };
    fetchUserAndProfile();
  });

  const fullName =
    profile?.first_name || profile?.last_name
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : 'Username';
  if (user === null || profile === null) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <>
      <ScrollView className="mx-2">
        <View>
          <Avatar
            alt={user?.user_metadata?.username || 'User Avatar'}
            className="m-auto mb-2 flex size-36 scale-100 border-2 border-background web:border-0 web:ring-2 web:ring-background">
            <AvatarImage source={{ uri: user?.user_metadata?.avatar_url }} />
            <AvatarFallback>
              <Text className="text-2xl font-bold">{user?.email?.charAt(0).toUpperCase()}</Text>
            </AvatarFallback>
          </Avatar>
          <Card className="flex gap-1">
            <View>
              <Text variant="h3" className="m-0 p-0 text-center">
                {fullName}
              </Text>
              <Text className="text-center text-sm capitalize text-foreground/70">
                {profile?.role || 'No Role'}
              </Text>
            </View>

            <View>
              <View className="flex-row items-center justify-center gap-2">
                <AtSignIcon
                  color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                  className="text-foreground"
                  size={16}
                />
                <Text className="text-sm text-foreground/70">{user?.email || 'Email'}</Text>
              </View>
              <View className="flex-row items-center justify-center gap-2">
                <PhoneCall
                  color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                  className="text-foreground"
                  size={16}
                />
                <Text className="text-sm text-foreground/70">{profile?.phone || 'Phone'}</Text>
              </View>
              <View className="flex-row items-center justify-center gap-2">
                <Building color={colorScheme === 'dark' ? '#ffffff' : '#000000'} size={16} />
                <Text className="pr-1 text-sm capitalize text-foreground/70">
                  {profile?.location || 'Location'}
                </Text>
              </View>
            </View>
          </Card>
        </View>
        <Text variant="h3" className="mt-5">
          Menu
        </Text>
        <View>
          <Button
            className="m-auto my-1 w-full"
            disabled={!user}
            onPress={() => {
              supabase.auth.signOut();
              router.push('/');
            }}>
            <Text>Logout</Text>
          </Button>
          <Button
            className="m-auto my-1 w-full"
            onPress={() => {
              router.push('/settings/profile');
            }}>
            <Text>Edit Profile</Text>
          </Button>
          <Button
            className="m-auto my-1 w-full"
            onPress={() => {
              router.push('/settings/settings-main');
            }}>
            <Text>Settings</Text>
          </Button>
        </View>
      </ScrollView>
    </>
  );
}
