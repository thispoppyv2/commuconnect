import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Circle } from 'lucide-react-native';
import { colorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

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

export default function ReportPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      setLoading(true);
      const [
        { data: reportData, error: reportError },
        { data: timelineData, error: timelineError },
      ] = await Promise.all([
        supabase
          .from('reports')
          .select('*, user_profiles(first_name, last_name), categories(name)')
          .eq('id', id)
          .single(),
        supabase
          .from('report_timelines')
          .select('id, status, description, created_at')
          .eq('report_id', id)
          .order('created_at', { ascending: true }),
      ]);

      let timelineEntries: TimelineEntry[] = [];

      if (timelineError) {
        console.error('Error fetching timeline:', timelineError);
      } else {
        timelineEntries = (timelineData as TimelineEntry[]) ?? [];
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

  return (
    <View>
      <Stack.Screen
        options={{
          headerShown: true,
          title: report.title || 'Report Details',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView className="h-full">
        <View className="flex-1 p-4">
          <View className="flex w-full flex-row flex-wrap items-center justify-between">
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

          <Card className="mt-2 p-2">
            <Text>{report.description || 'No description provided.'}</Text>
          </Card>

          <Text variant="h3" className="mt-2">
            Report Timeline
          </Text>

          <View className="mt-4 flex flex-col gap-4">
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

          <Text className="top relative mt-2 text-justify text-sm text-foreground/70">
            Report ID: {id}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
