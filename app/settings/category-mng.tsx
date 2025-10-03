import {
  Alert,
  ActivityIndicator,
  ScrollView,
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

type Category = {
  id: number;
  name: string | null;
  created_at: string;
};

export default function CategoryManagementScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
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
          Alert.alert('Access Denied', 'Only administrators can manage categories.');
          router.back();
          return;
        }
      }

      await fetchCategories();
      setLoading(false);
    };

    checkPermissionsAndFetch();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories.');
    } else {
      setCategories((data as Category[]) ?? []);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Validation', 'Category name is required.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({ name: categoryName.trim() })
          .eq('id', editingCategory.id);

        if (error) throw error;

        Alert.alert('Success', 'Category updated successfully.');
      } else {
        // Add new category
        const { error } = await supabase.from('categories').insert({ name: categoryName.trim() });

        if (error) throw error;

        Alert.alert('Success', 'Category added successfully.');
      }

      await fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', 'Unable to save category. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
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
              const { error } = await supabase.from('categories').delete().eq('id', category.id);

              if (error) {
                // Check if error is due to foreign key constraint
                if (error.code === '23503') {
                  Alert.alert(
                    'Cannot Delete',
                    'This category is being used by one or more reports. Please reassign those reports before deleting this category.'
                  );
                } else {
                  throw error;
                }
              } else {
                Alert.alert('Success', 'Category deleted successfully.');
                await fetchCategories();
              }
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Unable to delete category. Please try again.');
            }
          },
        },
      ]
    );
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
        options={{
          headerShown: true,
          title: 'Manage Categories',
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable className="ml-1.5" onPress={openAddModal}>
              <Plus size={24} color={colorScheme === 'light' ? 'black' : 'white'} />
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex flex-col gap-2">
          {categories.length === 0 ? (
            <Card className="p-4">
              <Text className="text-center text-foreground/70">
                No categories yet. Add one to get started.
              </Text>
            </Card>
          ) : (
            categories.map((category) => (
              <Card key={category.id} className="flex flex-row items-center justify-between p-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold">{category.name}</Text>
                  <Text className="text-xs text-foreground/60">
                    Created {new Date(category.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className="flex flex-row gap-2">
                  <Pressable
                    onPress={() => openEditModal(category)}
                    className="rounded-lg bg-muted p-2">
                    <Pencil size={18} color={colorScheme === 'light' ? 'black' : 'white'} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(category)}
                    className="rounded-lg bg-destructive p-2">
                    <Trash2 size={18} color="white" />
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <Pressable
            className="flex-1 items-center justify-center bg-black/50"
            onPress={closeModal}>
            <Pressable
              className="w-11/12 max-w-md rounded-lg bg-background p-6"
              onPress={(e) => e.stopPropagation()}>
              <View className="mb-4 flex flex-row items-center justify-between">
                <Text className="text-xl font-semibold">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </Text>
                <Pressable onPress={closeModal}>
                  <X size={24} color={colorScheme === 'light' ? 'black' : 'white'} />
                </Pressable>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-foreground/80">Category Name</Text>
                <Input
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="Enter category name"
                  autoFocus
                  maxLength={50}
                />
              </View>

              <View className="flex flex-row gap-2">
                <Button variant="outline" onPress={closeModal} className="flex-1">
                  <Text>Cancel</Text>
                </Button>
                <Button onPress={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-primary-foreground">
                      {editingCategory ? 'Update' : 'Add'}
                    </Text>
                  )}
                </Button>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
