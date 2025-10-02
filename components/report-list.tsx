import { Link } from 'expo-router';
import { View, type ImageStyle } from 'react-native';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Image } from 'expo-image';
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
  report_timelines?: TimelineEntry[] | null;
  timeline?: TimelineEntry[];
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(
          'id, title, description, status, images, created_at, report_timelines(id, status, description, created_at)'
        )
        .order('created_at', { ascending: false });

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

    fetchReports();
  }, []);

  return (
    <View className="flex w-full flex-col gap-1">
      {reports.map((report) => {
        const statusLabel = (report.timeline?.[0]?.status ?? report.status).replace(/_/g, ' ');

        return (
          <Link className="" key={report.id} href={`/reports/${report.id}`} asChild>
            <Card className="flex w-full flex-col gap-1 p-2 transition active:scale-95">
              <View className="flex flex-row justify-between">
                <Text className="font-semibold">{report.title}</Text>
                <Badge variant={'secondary'} className="w-maxS text-sm text-foreground/70">
                  <Text className="capitalize">{statusLabel}</Text>
                </Badge>
              </View>
              <Text className="text-sm text-foreground/70">
                {new Date(report.created_at).toLocaleDateString()}
              </Text>
              {report.description && (
                <Text className="text-sm text-foreground/70">{report.description}</Text>
              )}
              {report.images && report.images.length > 0 && (
                <View className="flex flex-row gap-1">
                  {report.images.map((uri, index) => (
                    <Image
                      key={index}
                      source={{ uri }}
                      style={IMAGE_STYLE}
                      className="rounded-lg"
                      contentFit="cover"
                      transition={1000}
                    />
                  ))}
                </View>
              )}
            </Card>
          </Link>
        );
      })}
    </View>
  );
}
