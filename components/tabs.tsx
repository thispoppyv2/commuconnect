import { NativeTabs, Label, Icon, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Platform, useColorScheme } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-js';
import { useState } from 'react';
import { useFocusEffect } from 'expo-router';
export function TabLayout() {
  const [user, setUser] = useState<User | null>(null);
  const scheme = useColorScheme();

  useFocusEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    };
    fetchUser();
  });
  const backgroundColor = scheme === 'dark' ? '#000000' : '#ffffff';
  return (
    <NativeTabs minimizeBehavior="onScrollDown" disableTransparentOnScrollEdge>
      <NativeTabs.Trigger
        name="index"
        options={{
          backgroundColor: backgroundColor,
        }}>
        <Label>Home</Label>
        {Platform.select({
          ios: <Icon sf="house" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />,
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        options={{
          backgroundColor: backgroundColor,
        }}
        name="reports">
        <Label>Reports</Label>
        {Platform.select({
          ios: <Icon sf="doc.text" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="article" />} />,
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        options={{
          backgroundColor: backgroundColor,
        }}
        hidden={!user}
        name="settings">
        <Label>Profile</Label>
        {Platform.select({
          ios: <Icon sf="person" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="person" />} />,
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
