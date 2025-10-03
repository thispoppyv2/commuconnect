import {
  Alert,
  ActivityIndicator,
  ScrollView,
  View,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import { File } from 'expo-file-system';
import { Input } from '@/components/ui/input';

type Category = {
  id: number;
  name: string | null;
};

type Report = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  images: string[] | null;
  category: number | null;
  reporter_id: string | null;
};

export default function EditReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [reporterId, setReporterId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      if (!id) return;

      const [
        { data: userData },
        { data: categoryData, error: categoryError },
        { data: reportData, error: reportError },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('reports').select('*').eq('id', id).single(),
      ]);

      if (!alive) return;

      setCurrentUserId(userData.user?.id ?? null);

      if (categoryError) {
        console.error('Error fetching categories:', categoryError);
        setCategories([]);
      } else {
        setCategories((categoryData as Category[]) ?? []);
      }

      if (reportError) {
        console.error('Error fetching report:', reportError);
        Alert.alert('Error', 'Failed to load report data.');
        router.back();
      } else {
        const report = reportData as Report;
        setTitle(report.title);
        setDescription(report.description || '');
        setSelectedCategory(report.category?.toString() || null);
        setExistingImages(report.images || []);
        setReporterId(report.reporter_id);
      }

      setLoadingCategories(false);
      setLoading(false);
    };

    bootstrap();

    return () => {
      alive = false;
    };
  }, [id]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newImages]);
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

  const uploadImage = async (reportId: string, imageUri: string) => {
    try {
      const file = new File(imageUri);
      const base64Content = await file.base64();

      const fileExt = imageUri.split('.').pop();
      const filePath = `${reportId}/${uuid.v4()}.${fileExt}`;

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

      return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reports/${data.path}`;
    } catch (e) {
      console.error('Upload exception:', e);
      Alert.alert('Upload Error', e instanceof Error ? e.message : 'Unknown error occurred');
      return null;
    }
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
      let imageUrls: string[] = [...existingImages];

      if (images.length > 0) {
        for (const imageUri of images) {
          const uploadedImageUrl = await uploadImage(id!, imageUri);
          if (uploadedImageUrl) {
            imageUrls.push(uploadedImageUrl);
          }
        }
      }

      const { error } = await supabase
        .from('reports')
        .update({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          category: Number(selectedCategory),
          images: imageUrls,
          updated_at: new Date(),
        })
        .eq('id', id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      Alert.alert('Success', 'Report updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating report:', error);
      Alert.alert('Error', 'Unable to update the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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
        options={{ headerShown: true, title: 'Edit Report', headerShadowVisible: false }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          className="mx-2 mb-8 h-full"
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled">
          <View className="gap-4">
            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Title</Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Enter report title"
                autoComplete="off"
                autoCorrect
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Description</Text>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the issue"
                multiline
                textAlignVertical="top"
                className="h-24 max-h-fit min-h-24"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">Category</Text>
              {loadingCategories ? (
                <ActivityIndicator />
              ) : categories.length === 0 ? (
                <Text className="text-sm text-foreground/60">No categories available.</Text>
              ) : (
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
                    selectedValue={selectedCategory}
                    onValueChange={(itemValue, itemIndex) => setSelectedCategory(itemValue)}
                    style={Platform.select({
                      ios: { height: 200, color: 'hsl(var(--foreground))' },
                      android: { color: 'hsl(var(--foreground))' },
                    })}>
                    <Picker.Item label="Choose a category" value={null} enabled={false} />

                    {categories.map((category) => (
                      <Picker.Item
                        key={category.id}
                        label={category.name ?? 'Uncategorized'}
                        value={String(category.id)}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground/80">
                Images (Optional)
              </Text>
              <Button onPress={pickImage} className="mb-2">
                <Text>Add more images</Text>
              </Button>
              {(existingImages.length > 0 || images.length > 0) && (
                <View className="mb-2 flex flex-row flex-wrap gap-2">
                  {existingImages.map((imageUri, index) => (
                    <View key={`existing-${index}`} className="relative">
                      <Image
                        source={{ uri: imageUri }}
                        style={{ width: 80, height: 80, borderRadius: 8 }}
                      />
                      <Button
                        size="sm"
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 p-0"
                        onPress={() => removeExistingImage(index)}>
                        <Text className="text-xs text-white">×</Text>
                      </Button>
                    </View>
                  ))}
                  {images.map((imageUri, index) => (
                    <View key={`new-${index}`} className="relative">
                      <Image
                        source={{ uri: imageUri }}
                        style={{ width: 80, height: 80, borderRadius: 8 }}
                      />
                      <Button
                        size="sm"
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 p-0"
                        onPress={() => removeNewImage(index)}>
                        <Text className="text-xs text-white">×</Text>
                      </Button>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        <Button
          className="fixed bottom-12 mx-2 flex-row items-center justify-center gap-2"
          disabled={submitting}
          onPress={handleSubmit}>
          {submitting && <ActivityIndicator color="#ffffff" />}
          <Text className="text-base text-primary-foreground">
            {submitting ? 'Updating...' : 'Update Report'}
          </Text>
        </Button>
      </KeyboardAvoidingView>
    </>
  );
}
