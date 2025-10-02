import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Circle, CornerDownRight, X, Send, Reply } from 'lucide-react-native';
import { colorScheme } from 'nativewind';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  View,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  Animated,
} from 'react-native';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
type Report = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  images: string[] | null;
  created_at: string;
  category: string | null;
  categories: {
    name: string | null;
  };
  user_profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type TimelineEntry = {
  id: string;
  status: string;
  description: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  report_id: string;
  parent_comment_id: string | null;
  author_id: string | null;
  body: string;
  created_at: string;
  user_profiles: {
    first_name: string | null;
    last_name: string | null;
    profile_image: string | null;
  } | null;
};

export default function ReportPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const commentsRef = useRef<View>(null);
  const commentInputRef = useRef<TextInput>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      setLoading(true);
      const [
        { data: reportData, error: reportError },
        { data: timelineData, error: timelineError },
        { data: commentsData, error: commentsError },
      ] = await Promise.all([
        supabase
          .from('reports')
          .select('*, user_profiles(first_name, last_name), categories(name), images')
          .eq('id', id)
          .single(),
        supabase
          .from('report_timelines')
          .select('id, status, description, created_at')
          .eq('report_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('comments')
          .select('id, report_id, parent_comment_id, author_id, body, created_at')
          .eq('report_id', id)
          .order('created_at', { ascending: true }),
      ]);

      let timelineEntries: TimelineEntry[] = [];

      if (timelineError) {
        console.error('Error fetching timeline:', timelineError);
      } else {
        timelineEntries = (timelineData as TimelineEntry[]) ?? [];
      }

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
      } else {
        const rawComments = (commentsData as Omit<Comment, 'user_profiles'>[]) ?? [];

        // Fetch user profiles for all comment authors
        const authorIds = Array.from(
          new Set(rawComments.map((c) => c.author_id).filter(Boolean) as string[])
        );

        if (authorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, profile_image')
            .in('id', authorIds);

          const profilesMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

          const commentsWithProfiles = rawComments.map((comment) => ({
            ...comment,
            user_profiles: comment.author_id ? (profilesMap.get(comment.author_id) ?? null) : null,
          }));

          setComments(commentsWithProfiles as Comment[]);
        } else {
          setComments(rawComments.map((c) => ({ ...c, user_profiles: null })) as Comment[]);
        }
      }

      if (reportError) {
        console.error('Error fetching report:', reportError);
      } else {
        const typedReport = reportData as Report;
        const hasSubmittedEntry = timelineEntries.some((entry) => entry.status === 'submitted');

        if (!hasSubmittedEntry) {
          timelineEntries = [
            ...timelineEntries,
            {
              id: `submitted-${typedReport.id}`,
              status: 'submitted',
              description: 'Report submitted.',
              created_at: typedReport.created_at,
            },
          ];
        }
        timelineEntries.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReport(typedReport);
      }

      setTimeline(timelineEntries);
      setLoading(false);
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!report) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Report {id} not found.</Text>
      </View>
    );
  }

  const reporterName =
    report.user_profiles?.first_name || report.user_profiles?.last_name
      ? `${report.user_profiles.first_name || ''} ${report.user_profiles.last_name || ''}`.trim()
      : 'Anonymous';

  const organizeComments = () => {
    const topLevelComments = comments.filter((c) => !c.parent_comment_id);
    const commentMap = new Map<string, Comment[]>();

    comments.forEach((comment) => {
      if (comment.parent_comment_id) {
        if (!commentMap.has(comment.parent_comment_id)) {
          commentMap.set(comment.parent_comment_id, []);
        }
        commentMap.get(comment.parent_comment_id)!.push(comment);
      }
    });

    return { topLevelComments, commentMap };
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !id) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({
        report_id: id,
        body: newComment.trim(),
        parent_comment_id: replyingTo,
      })
      .select('id, report_id, parent_comment_id, author_id, body, created_at')
      .single();

    if (error) {
      console.error('Error submitting comment:', error);
    } else {
      // Fetch the user profile for the new comment
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, profile_image')
        .eq('id', data.author_id)
        .single();

      const newCommentWithProfile = {
        ...data,
        user_profiles: profileData ?? null,
      } as Comment;

      setComments([...comments, newCommentWithProfile]);
      setNewComment('');
      setReplyingTo(null);

      // Scroll to comments section after a brief delay
      setTimeout(() => {
        commentsRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 100);
    }
    setSubmitting(false);
  };

  const getReplyingToName = () => {
    if (!replyingTo) return '';
    const comment = comments.find((c) => c.id === replyingTo);
    if (!comment) return '';
    const authorName =
      comment.user_profiles?.first_name || comment.user_profiles?.last_name
        ? `${comment.user_profiles.first_name || ''} ${comment.user_profiles.last_name || ''}`.trim()
        : 'Anonymous';
    return authorName;
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const authorName =
      comment.user_profiles?.first_name || comment.user_profiles?.last_name
        ? `${comment.user_profiles.first_name || ''} ${comment.user_profiles.last_name || ''}`.trim()
        : 'Anonymous';

    const { commentMap } = organizeComments();
    const replies = commentMap.get(comment.id) ?? [];

    return (
      <View key={comment.id}>
        <View className={`flex flex-row gap-3 ${isReply ? 'ml-8' : ''}`}>
          {isReply && (
            <View className="absolute -left-6 top-4">
              <CornerDownRight size={20} color={colorScheme.get() === 'light' ? '#666' : '#999'} />
            </View>
          )}
          <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            {comment.user_profiles?.profile_image ? (
              <Image
                source={{ uri: comment.user_profiles.profile_image }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <Text className="text-lg font-semibold">{authorName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View className="flex-1">
            <View className="flex flex-row items-center gap-2">
              <Text className="font-semibold">{authorName}</Text>
              <Text className="text-xs text-foreground/50">
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Text className="mt-1 text-foreground/90">{comment.body}</Text>
            <Pressable
              onPress={() => {
                setReplyingTo(comment.id);
                setShouldFocusInput(true);
                setTimeout(() => {
                  commentInputRef.current?.focus();
                }, 150);
              }}
              className="mt-2 flex flex-row items-center gap-1">
              <Reply size={14} color={colorScheme.get() === 'light' ? '#666' : '#999'} />
              <Text className="text-xs text-foreground/70">Reply</Text>
            </Pressable>
          </View>
        </View>
        {replies.length > 0 && (
          <View className="mt-3">{replies.map((reply) => renderComment(reply, true))}</View>
        )}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: report.title || 'Report Details',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}>
        <ScrollView ref={scrollViewRef} className="mx-2">
          <View className="flex-1">
            <View className="mt-2 flex w-full flex-row flex-wrap items-center justify-between">
              <CardTitle className="w-3/4 text-3xl">{report.title}</CardTitle>
              <View className="my-2 flex flex-row gap-1">
                <Badge className="h-8">
                  <Text className="px-0.5 capitalize">{timeline[0]?.status || 'N/A'}</Text>
                </Badge>
                <Badge className="h-8" variant={'secondary'}>
                  <Text className="px-0.5 capitalize">{report?.categories?.name || 'N/A'}</Text>
                </Badge>
              </View>
            </View>
            <Text className="text-sm text-foreground/70">
              Reported by: {reporterName} on {new Date(report.created_at).toLocaleDateString()}
            </Text>

            <Card className="my-2 p-2">
              <Text>{report.description || 'No description provided.'}</Text>
            </Card>

            {report.images && report.images.length > 0 && (
              <View className="flex flex-col gap-1">
                <Text variant="h3" className="mt-2">
                  Image {report.images.length === 1 ? '' : 's'}
                </Text>
                <View className="flex flex-row gap-1">
                  {report.images.map((uri, index) => (
                    <Pressable key={index} onPress={() => setSelectedImage(uri)}>
                      <Image
                        source={{ uri }}
                        style={{
                          width: 100,
                          height: 100,
                          backgroundColor: '#f0f0f0',
                          borderRadius: 8,
                          borderColor: '#ccc',
                          borderWidth: 1,
                        }}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View ref={commentsRef}>
              <Text variant="h3" className="mt-2">
                Comments
              </Text>
              <View className="mt-4 flex flex-col gap-4">
                {comments.length === 0 ? (
                  <Card className="p-4">
                    <Text className="text-center text-foreground/70">No comments yet.</Text>
                  </Card>
                ) : (
                  organizeComments().topLevelComments.map((comment) => (
                    <View key={comment.id}>{renderComment(comment)}</View>
                  ))
                )}
              </View>
            </View>
          </View>
          <View className="mt-4 flex flex-col gap-4">
            <Text variant="h3" className="">
              Report Timeline
            </Text>
            {timeline.length === 0 ? (
              <Card className="p-5">
                <Text>No timeline entries yet.</Text>
              </Card>
            ) : (
              timeline.map((entry, index) => {
                const isLast = index === timeline.length - 1;

                return (
                  <View key={entry.id} className="flex flex-row gap-3">
                    <Text className="w-1/3">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <View className="flex items-center gap-0">
                      <Circle
                        className="animate"
                        fill={colorScheme.get() === 'light' ? 'black' : 'white'}
                        color={colorScheme.get() === 'light' ? 'black' : 'white'}
                      />
                      {!isLast && (
                        <View className="absolute my-1 h-28 w-1 rounded-2xl bg-foreground" />
                      )}
                    </View>
                    <Card className="flex-1 gap-2 p-4">
                      <Badge className="w-fit">
                        <Text className="capitalize">{entry.status.replace(/_/g, ' ')}</Text>
                      </Badge>
                      <Text>{entry.description || 'No details provided.'}</Text>
                    </Card>
                  </View>
                );
              })
            )}
          </View>
          <Text className="top relative mt-2 text-justify text-sm text-foreground/10">{id}</Text>
        </ScrollView>

        <View className="border-t border-border bg-background">
          {replyingTo && (
            <View className="mx-2 mt-2 flex flex-row items-center justify-between rounded-lg bg-muted p-2">
              <Text className="text-sm text-foreground/70">Replying to {getReplyingToName()}</Text>
              <Pressable
                onPress={() => {
                  setReplyingTo(null);
                  setShouldFocusInput(false);
                  Keyboard.dismiss();
                }}>
                <X size={16} color={colorScheme.get() === 'light' ? '#666' : '#999'} />
              </Pressable>
            </View>
          )}
          <View className="mx-2 flex flex-row items-center gap-2 pb-12 pt-2">
            <TextInput
              ref={commentInputRef}
              className="flex-1 rounded-lg border border-border bg-background p-3 text-foreground"
              placeholder="Write a comment..."
              placeholderTextColor={colorScheme.get() === 'light' ? '#999' : '#666'}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              autoFocus={shouldFocusInput}
              focusable
              onFocus={() => setShouldFocusInput(false)}
            />
            <Pressable
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className={`rounded-lg p-3 ${
                !newComment.trim() || submitting ? 'bg-muted' : 'bg-primary'
              }`}>
              {submitting ? (
                <ActivityIndicator size="small" />
              ) : (
                <Send size={20} color={'#ffffff'} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <View className="flex-1 bg-black">
          <Pressable
            className="absolute right-4 top-12 z-10 rounded-full border border-black/50 bg-white/50 p-3 shadow shadow-black"
            onPress={() => setSelectedImage(null)}>
            <X size={24} color="black" />
          </Pressable>
          {selectedImage && (
            <ImageZoom
              source={{ uri: selectedImage }}
              style={{ width: '100%', height: '90%', padding: 50 }}
              contentFit="contain"
              transition={300}
            />
          )}
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}
