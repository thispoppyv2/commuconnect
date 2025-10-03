import { useColorScheme } from 'nativewind';
import {
  type ImageStyle,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import { File } from 'expo-file-system';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');
        setUserId(user.id);

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setPhone(data.phone || '');
          setLocation(data.location || '');
          setProfileImage(data.profile_image);
        }
      } catch (error) {
        if (error instanceof Error) {
          Alert.alert('Error fetching profile', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setNewAvatar(result.assets[0].uri);
    }
  };

  const decode = (base64: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let bufferLength = base64.length * 0.75;
    if (base64[base64.length - 1] === '=') {
      bufferLength--;
      if (base64[base64.length - 2] === '=') {
        bufferLength--;
      }
    }

    const bytes = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < base64.length; i += 4) {
      const encoded1 = chars.indexOf(base64[i]);
      const encoded2 = chars.indexOf(base64[i + 1]);
      const encoded3 = chars.indexOf(base64[i + 2]);
      const encoded4 = chars.indexOf(base64[i + 3]);

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return bytes;
  };

  const uploadAvatar = async (userId: string, avatarUri: string) => {
    try {
      const file = new File(avatarUri);
      const base64Content = await file.base64();
      if (!base64Content) {
        throw new Error('Could not get base64 content from image');
      }

      const fileExt = avatarUri.split('.').pop();
      const filePath = `${userId}/${uuid.v4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('avatar')
        .upload(filePath, decode(base64Content), {
          contentType: 'image/jpeg', // Assuming jpeg, you might want to make this dynamic
          upsert: false,
        });

      if (error) {
        throw error;
      }

      return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${data.path}`;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (error instanceof Error) {
        Alert.alert('Upload Error', error.message);
      }
      return null;
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSubmitting(true);
      if (!userId) throw new Error('User ID not found');

      let avatarUrl = profileImage;
      if (newAvatar) {
        const uploadedUrl = await uploadAvatar(userId, newAvatar);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          Alert.alert(
            'Avatar Upload Failed',
            'Could not upload the new avatar, proceeding with profile update without it.'
          );
        }
      }

      const updates = {
        first_name: firstName,
        last_name: lastName,
        phone,
        location,
        profile_image: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('auth_user_id', userId);

      if (error) throw error;

      setProfileImage(avatarUrl);
      setNewAvatar(null);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error updating profile', error.message);
      }
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
    <KeyboardAvoidingView behavior="padding" className="flex-1" keyboardVerticalOffset={100}>
      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled">
        <View className="items-center">
          <Image
            source={
              newAvatar
                ? { uri: newAvatar }
                : profileImage
                  ? { uri: profileImage }
                  : colorScheme === 'light'
                    ? LOGO.light
                    : LOGO.dark
            }
            style={[IMAGE_STYLE, { borderRadius: 40, marginBottom: 16 }]}
          />
          <Button onPress={pickImage}>
            <Text>Change Avatar</Text>
          </Button>
        </View>

        <View className="gap-4 py-4">
          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">First Name</Text>
            <Input value={firstName} onChangeText={setFirstName} placeholder="First Name" />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Last Name</Text>
            <Input value={lastName} onChangeText={setLastName} placeholder="Last Name" />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Phone</Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Location</Text>
            <Input value={location} onChangeText={setLocation} placeholder="Location" />
          </View>
        </View>

        <Button onPress={handleUpdateProfile} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-primary-foreground">Update Profile</Text>
          )}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
