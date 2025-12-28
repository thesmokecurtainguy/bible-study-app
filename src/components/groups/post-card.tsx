"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  _count: {
    replies: number;
  };
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  isOwner: boolean;
  isModerator: boolean;
  onView: () => void;
  onDelete: () => void;
}

export function PostCard({
  post,
  currentUserId,
  isOwner,
  isModerator,
  onView,
  onDelete,
}: PostCardProps) {
  const canDelete = post.user.id === currentUserId || isOwner || isModerator;
  const authorName = post.user.name || post.user.email;
  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Strip HTML tags and truncate content for preview
  const stripHtml = (html: string) => {
    // Remove HTML tags using regex (safe for client-side rendering)
    return html
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
      .replace(/&amp;/g, "&") // Replace &amp; with &
      .replace(/&lt;/g, "<") // Replace &lt; with <
      .replace(/&gt;/g, ">") // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .trim();
  };
  
  const plainText = stripHtml(post.content);
  const contentPreview = plainText.length > 200
    ? plainText.substring(0, 200) + "..."
    : plainText;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {post.isPinned && (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  Pinned
                </Badge>
              )}
              <h3 className="font-semibold text-gray-900 line-clamp-2">{post.title}</h3>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3 mb-3">{contentPreview}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                by {authorName}
              </span>
              <span>·</span>
              <span>{date}</span>
              <span>·</span>
              <span>
                {post._count.replies} {post._count.replies === 1 ? "reply" : "replies"}
              </span>
            </div>
          </div>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this post? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

