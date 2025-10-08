import { useState } from 'react';
import { Alert, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { router, Stack } from 'expo-router';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendPasswordResetEmail() {
    if (!email) {
      Alert.alert('Please enter your email address.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'myapp://reset-password',
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    } else {
      Alert.alert('Success', 'Password reset email sent! Please check your inbox.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
      setLoading(false);
    }
  }

  return (
    <View className="mx-4 mt-24">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Reset Password',
          headerBackVisible: true,
        }}
      />
      <Text className="mb-6 text-center text-foreground/70">
        Enter your email address and we'll send you a link to reset your password.
      </Text>
      <View className="">
        <Label>Email</Label>
        <Input
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
          keyboardType="email-address"
        />
      </View>
      <View className="mt-5 self-stretch py-1">
        <Button disabled={loading} onPress={() => sendPasswordResetEmail()}>
          <Text>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
        </Button>
        <Button className="mt-2" variant="outline" disabled={loading} onPress={() => router.back()}>
          <Text>Back to Sign In</Text>
        </Button>
      </View>
    </View>
  );
}
