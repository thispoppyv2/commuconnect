import { useState } from 'react';
import { Alert, View, AppState, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { router, Stack } from 'expo-router';

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Email and password are required.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert(error.message);
      setLoading(false);
      return;
    }

    Alert.alert('Success! You are now signed in.');
    router.push('/');
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Email and password are required.');
      return;
    }

    if (!firstName || !lastName) {
      Alert.alert('Validation Error', 'First name and last name are required.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Sign up the user
      const {
        data: { session, user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (signUpError) {
        setLoading(false);
        Alert.alert('Sign Up Error', signUpError.message);
        return;
      }

      // Step 2: Create user profile
      if (user) {
        const { error: profileError } = await supabase.from('user_profiles').upsert({
          id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          location: location.trim() || null,
          phone: phone.trim() || null,
          email: email,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          Alert.alert(
            'Profile Error',
            'Account created but profile setup failed. You can update your profile later.'
          );
        }
      }

      if (!session) {
        Alert.alert('Verification Required', 'Please check your inbox for email verification!');
      } else {
        Alert.alert('Success', 'Account created successfully!');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sign Up',
          headerBackTitle: 'Back',

          headerBackVisible: true,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="mx-4 mt-8 pb-8">
            <View>
              <Text className="mb-2 text-2xl font-bold">Welcome Bitch!</Text>
            </View>
            <View className="gap-3">
              <View>
                <Label>First Name *</Label>
                <Input
                  onChangeText={(text) => setFirstName(text)}
                  value={firstName}
                  placeholder="Juan"
                  autoCapitalize={'words'}
                />
              </View>

              <View>
                <Label>Last Name *</Label>
                <Input
                  onChangeText={(text) => setLastName(text)}
                  value={lastName}
                  placeholder="Dela Cruz"
                  autoCapitalize={'words'}
                />
              </View>

              <View>
                <Label>Email *</Label>
                <Input
                  onChangeText={(text) => setEmail(text)}
                  value={email}
                  placeholder="email@address.com"
                  autoCapitalize={'none'}
                  keyboardType="email-address"
                />
              </View>

              <View>
                <Label>Phone</Label>
                <Input
                  onChangeText={(text) => setPhone(text)}
                  value={phone}
                  placeholder="+63 912 345 6789"
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <Label>Location</Label>
                <Input
                  onChangeText={(text) => setLocation(text)}
                  value={location}
                  placeholder="Barangay, City"
                  autoCapitalize={'words'}
                />
              </View>

              <View>
                <Label>Password *</Label>
                <Input
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                  secureTextEntry={true}
                  placeholder="Password"
                  autoCapitalize={'none'}
                />
              </View>

              <Button disabled={loading} onPress={() => signUpWithEmail()}>
                <Text>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
