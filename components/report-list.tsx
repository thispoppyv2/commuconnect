import { Link } from 'expo-router';
import {
  ActivityIndicator,
  View,
  type ImageStyle,
  FlatList,
  RefreshControl,
  Image,
} from 'react-native';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type TimelineEntry = {
  id: string;
  status: string;
  description: string | null;
  created_at: string;
};

export type Report = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  images: string[] | null;
  created_at: string;
  reporter_id: string | null;
  report_timelines?: TimelineEntry[] | null;
  timeline?: TimelineEntry[];
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
  borderRadius: 8,
  borderColor: '#ccc',
  borderWidth: 1,
};

export function ReportList({
  limit,
  isScrollable = true,
  searchQuery = '',
  showMyReports = false,
  currentUserProfileId,
}: {
  limit?: number;
  isScrollable?: boolean;
  searchQuery?: string;
  showMyReports?: boolean;
  currentUserProfileId?: string | null;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    let query = supabase
      .from('reports')
      .select(
        'id, title, description, status, images, created_at, reporter_id, report_timelines(id, status, description, created_at)'
      )
      .order('created_at', { ascending: false });
    if (limit) {
      query = supabase
        .from('reports')
        .select(
          'id, title, description, status, images, created_at, reporter_id, report_timelines(id, status, description, created_at)'
        )
        .order('created_at', { ascending: false })
        .limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      const normalizedReports = (data as Report[]).map((report) => {
        const timelineEntries = [...(report.report_timelines ?? [])];
        const hasSubmittedEntry = timelineEntries.some((entry) => entry.status === 'submitted');

        if (!hasSubmittedEntry) {
          timelineEntries.push({
            id: `submitted-${report.id}`,
            status: 'submitted',
            description: 'Report submitted.',
            created_at: report.created_at,
          });
        }

        timelineEntries.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return { ...report, timeline: timelineEntries };
      });

      setReports(normalizedReports);
    }
  };

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      await fetchReports();
      setLoading(false);
    };
    loadReports();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  // Client-side filtering
  const filteredReports = reports.filter((report) => {
    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const titleMatch = report.title.toLowerCase().includes(searchLower);
      const descriptionMatch = report.description?.toLowerCase().includes(searchLower) || false;
      if (!titleMatch && !descriptionMatch) {
        return false;
      }
    }

    // Filter by current user's reports
    if (showMyReports && currentUserProfileId) {
      if (report.reporter_id !== currentUserProfileId) {
        return false;
      }
    }

    return true;
  });

  const renderReport = (report: Report) => {
    const statusLabel = (report.timeline?.[0]?.status ?? report.status).replace(/_/g, ' ');

    return (
      <Link key={report.id} href={`/reports/${report.id}`} asChild>
        <Card className="flex w-full flex-col gap-1 p-2 transition active:scale-95">
          <View className="flex flex-row justify-between">
            <Text className="h-6 w-1/2 truncate font-semibold">{report.title}</Text>
            <Badge variant={'secondary'} className="w-maxS text-sm text-foreground/70">
              <Text className="capitalize">{statusLabel}</Text>
            </Badge>
          </View>
          <Text className="text-sm text-foreground/70">
            {new Date(report.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {report.description && (
            <Text className="h-6 w-full truncate text-sm text-foreground/70">
              {report.description}
            </Text>
          )}
          {report.images && report.images.length > 0 && (
            <View className="flex flex-row gap-1">
              {report.images.map((uri, index) => (
                <Image key={index} source={{ uri }} style={IMAGE_STYLE} className="rounded-lg" />
              ))}
            </View>
          )}
        </Card>
      </Link>
    );
  };

  if (!isScrollable) {
    return <View className="flex w-full flex-col gap-1">{filteredReports.map(renderReport)}</View>;
  }

  return (
    <FlatList
      data={filteredReports}
      renderItem={({ item }) => renderReport(item)}
      keyExtractor={(item) => item.id}
      contentContainerClassName={`flex w-full flex-col gap-1 ${isScrollable ? 'px-2' : ''}`}
      contentContainerStyle={{ paddingBottom: 200 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View className="p-4">
          <Text className="text-center text-foreground/70">
            {searchQuery || showMyReports
              ? 'No reports found matching your filters.'
              : 'No reports yet.'}
          </Text>
        </View>
      }
    />
  );
}
