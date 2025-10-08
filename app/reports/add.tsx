import { Alert, ActivityIndicator, ScrollView, View, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import PickerModal from 'react-native-picker-modal-view';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import { File } from 'expo-file-system';
import { useColorScheme } from 'nativewind';

// Assuming you have an 'Input' component defined, likely a re-export
// or a file copied from the react-native-reusables project.
// The original code was using:
// import { TextInput } from 'react-native';
// Let's assume you've configured your alias or component file for:
import { Input } from '@/components/ui/input';

type Category = {
  Id: number;
  id: number;
  name: string | null;
  Name: string | null; // For picker modal
  Value: string; // For picker modal
};

export default function AddReportScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reporterId, setReporterId] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Choose a category');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      const [{ data: userData }, { data: categoryData, error: categoryError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (!alive) return;
      if (userData.user?.id) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', userData.user.id)
          .single();
        setReporterId(profileData?.id ?? null);
      }

      if (categoryError) {
        console.error('Error fetching categories:', categoryError);
        setCategories([]);
      } else {
        // Transform categories for picker modal
        const transformedCategories = (categoryData as any[]).map((cat) => ({
          Id: cat.id,
          id: cat.id,
          name: cat.name,
          Name: cat.name ?? 'Uncategorized',
          Value: String(cat.id),
        }));
        setCategories(transformedCategories);
      }

      setLoadingCategories(false);
    };

    bootstrap();

    return () => {
      alive = false;
    };
  }, []);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const uploadImage = async (reportId: string, imageUri: string) => {
    try {
      console.log('Starting image upload for:', imageUri);

      // Use the new File API
      const file = new File(imageUri);
      const base64Content = await file.base64();
      console.log('Base64 content length:', base64Content.length);

      const fileExt = imageUri.split('.').pop();
      const filePath = `${reportId}/${uuid.v4()}.${fileExt}`;
      console.log('Upload path:', filePath);

      // Upload directly using base64 with decode option
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(filePath, decode(base64Content), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage error:', error);
        Alert.alert(
          'Image Upload Failed',
          error.message || 'There was an error uploading the image.'
        );
        return null;
      }

      console.log('Upload successful:', data);
      return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reports/${data.path}`;
    } catch (e) {
      console.error('Upload exception:', e);
      console.error('Error details:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
      Alert.alert('Upload Error', e instanceof Error ? e.message : 'Unknown error occurred');
      return null;
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Validation', 'Please choose a category.');
      return;
    }

    setSubmitting(true);

    try {
      const reportId = uuid.v4().toString();
      let imageUrls: string[] = [];

      if (images.length > 0) {
        for (const imageUri of images) {
          const uploadedImageUrl = await uploadImage(reportId, imageUri);
          if (uploadedImageUrl) {
            imageUrls.push(uploadedImageUrl);
          }
        }

        if (imageUrls.length === 0 && images.length > 0) {
          Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from('reports').insert({
        id: reportId,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        reporter_id: reporterId,
        category: Number(selectedCategory),
        images: imageUrls,
      });

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      Alert.alert('Success', 'Report submitted successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/reports'),
        },
      ]);

      setTitle('');
      setDescription('');
      setSelectedCategory(null);
      setImages([]);
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Unable to submit the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: 'Add Report', headerShadowVisible: false }}
      />

      <ScrollView className="mx-2 mb-8 h-full">
        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Title</Text>
            {/* Replaced TextInput with Input from Reusables pattern */}
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Enter report title"
              // The Input component from reusables usually handles styling automatically
              // so custom className and props like placeholderTextColor can often be removed or simplified.
              autoComplete="off"
              autoCorrect
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Description</Text>
            {/* Replaced TextInput with Input from Reusables pattern */}
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue"
              // The Input component should have a multiline/text-area variant or a specific prop
              // The `inputClassName` allows for custom styling to increase height and use textAlignVertical
              multiline
              textAlignVertical="top"
              className="h-24 max-h-fit min-h-24"
            />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Location</Text>
            {/* Replaced TextInput with Input from Reusables pattern */}
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="Where is the issue located?"
              // The Input component should have a multiline/text-area variant or a specific prop
              // The `inputClassName` allows for custom styling to increase height and use textAlignVertical
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Category</Text>
            {loadingCategories ? (
              <ActivityIndicator />
            ) : categories.length === 0 ? (
              <Text className="text-sm text-foreground/60">No categories available.</Text>
            ) : (
              <PickerModal
                items={categories}
                selected={
                  selectedCategory
                    ? categories.find((cat) => cat.Value === selectedCategory)
                    : undefined
                }
                onSelected={(item) => {
                  setSelectedCategory(String(item.Value));
                  setSelectedCategoryName(String(item.Name));
                  return item;
                }}
                onClosed={() => {}}
                onBackButtonPressed={() => {}}
                onEndReached={() => {}}
                showAlphabeticalIndex={false}
                autoGenerateAlphabeticalIndex={false}
                selectPlaceholderText="Choose a category"
                searchPlaceholderText="Search categories..."
                requireSelection={true}
                autoSort={false}
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
                    <Text className={selected ? 'text-foreground' : 'text-muted-foreground'}>
                      {selectedCategoryName}
                    </Text>
                  </Button>
                )}
              />
            )}
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-foreground/80">Images (Optional)</Text>
            <Button onPress={pickImage} className="mb-2">
              <Text>Pick images from camera roll</Text>
            </Button>
            {images.length > 0 && (
              <View className="mb-2 flex flex-row flex-wrap gap-2">
                {images.map((imageUri, index) => (
                  <View key={index} className="relative">
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                    />
                    <Button
                      size="sm"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 p-0"
                      onPress={() => setImages(images.filter((_, i) => i !== index))}>
                      <Text className="text-xs text-white">×</Text>
                    </Button>
                  </View>
                ))}
              </View>
            )}
            <Text className="text-xs text-foreground/60">
              {reporterId ? 'Submitting as your current account.' : 'Submitting anonymously.'}
            </Text>
          </View>
        </View>
      </ScrollView>
      <Button
        className="fixed bottom-12 mx-2 flex-row items-center justify-center gap-2"
        disabled={submitting}
        onPress={handleSubmit}>
        {submitting && <ActivityIndicator color="#ffffff" />}
        <Text className="text-base text-primary-foreground">
          {submitting ? 'Submitting...' : 'Submit Report'}
        </Text>
      </Button>
    </>
  );
}
