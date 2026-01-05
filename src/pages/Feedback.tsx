import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/Layout";
import { useFeedbackList, FeedbackItem } from "@/hooks/useFeedbackList";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Bug, Lightbulb, Sparkles, MessageCircle, ExternalLink, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FEEDBACK_TYPES = [
  { value: "all", label: "All", icon: MessageSquare },
  { value: "bug", label: "Bugs", icon: Bug, emoji: "🐛" },
  { value: "feature", label: "Features", icon: Sparkles, emoji: "✨" },
  { value: "improvement", label: "Improvements", icon: Lightbulb, emoji: "💡" },
  { value: "other", label: "Other", icon: MessageCircle, emoji: "💬" },
];

const getTypeInfo = (type: string) => {
  const typeMap: Record<string, { emoji: string; color: string; label: string }> = {
    bug: { emoji: "🐛", color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Bug Report" },
    feature: { emoji: "✨", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", label: "Feature Request" },
    improvement: { emoji: "💡", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Improvement" },
    other: { emoji: "💬", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Other" },
  };
  return typeMap[type] || typeMap.other;
};

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const typeInfo = getTypeInfo(item.feedback_type);
  const [imageOpen, setImageOpen] = useState(false);

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={typeInfo.color}>
            <span className="mr-1">{typeInfo.emoji}</span>
            {typeInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm leading-relaxed">{item.message}</p>

        {item.screenshot_url && (
          <Dialog open={imageOpen} onOpenChange={setImageOpen}>
            <DialogTrigger asChild>
              <button className="relative group w-full">
                <img
                  src={item.screenshot_url}
                  alt="Feedback screenshot"
                  className="w-full h-32 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-2">
              <img
                src={item.screenshot_url}
                alt="Feedback screenshot"
                className="w-full h-auto rounded-md"
              />
            </DialogContent>
          </Dialog>
        )}

        {item.page_url && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <span>From: {item.page_url}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

export default function Feedback() {
  const [filter, setFilter] = useState("all");
  const { data: feedback, isLoading, error } = useFeedbackList(filter);

  return (
    <>
      <Helmet>
        <title>Community Feedback | xLama</title>
        <meta
          name="description"
          content="View community feedback, bug reports, and feature requests for xLama. A transparent feedback system for continuous improvement."
        />
      </Helmet>

      <Layout>
        <div className="container max-w-4xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Community Feedback</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Transparent feedback from our community. Bug reports, feature requests, and suggestions — all public.
            </p>
          </div>

          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={setFilter} className="mb-6">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
              {FEEDBACK_TYPES.map((type) => (
                <TabsTrigger
                  key={type.value}
                  value={type.value}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {type.emoji && <span className="mr-1">{type.emoji}</span>}
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Feedback List */}
          {isLoading ? (
            <div className="grid gap-4">
              {[...Array(5)].map((_, i) => (
                <FeedbackSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Failed to load feedback. Please try again.</p>
              </CardContent>
            </Card>
          ) : feedback && feedback.length > 0 ? (
            <div className="grid gap-4">
              {feedback.map((item) => (
                <FeedbackCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No feedback yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to share your thoughts!
                </p>
                <p className="text-sm text-muted-foreground">
                  Use the feedback button in the bottom right corner.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {feedback && feedback.length > 0 && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Showing {feedback.length} feedback {feedback.length === 1 ? "entry" : "entries"}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
