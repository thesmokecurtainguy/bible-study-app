"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
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

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
  user: User;
  replies: Reply[];
  _count: {
    replies: number;
  };
}

interface PostDetailProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserId: string;
  isOwner: boolean;
  isModerator: boolean;
  onRefresh: () => void;
}

export function PostDetail({
  post,
  isOpen,
  onClose,
  groupId,
  currentUserId,
  isOwner,
  isModerator,
  onRefresh,
}: PostDetailProps) {
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!post) return null;

  const canDeletePost = post.user.id === currentUserId || isOwner || isModerator;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!replyContent.trim()) {
      setError("Reply content is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/groups/${groupId}/posts/${post.id}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: replyContent.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create reply");
      }

      setReplyContent("");
      setError(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to create reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete post");
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to delete post");
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const response = await fetch(
        `/api/groups/${groupId}/posts/${post.id}/replies/${replyId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete reply");
      }

      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete reply");
    }
  };

  const authorName = post.user.name || post.user.email;
  const postDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {post.isPinned && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    Pinned
                  </Badge>
                )}
                <DialogTitle className="text-xl">{post.title}</DialogTitle>
              </div>
              <div className="text-sm text-gray-500">
                by {authorName} · {postDate}
              </div>
            </div>
            {canDeletePost && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? All replies will also be deleted. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletePost}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Post Content */}
          <div className="prose max-w-none">
            <RichTextDisplay content={post.content} />
          </div>

          {/* Replies Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {post.replies.length} {post.replies.length === 1 ? "Reply" : "Replies"}
            </h3>

            {post.replies.length === 0 ? (
              <p className="text-gray-500 text-sm">No replies yet. Be the first to reply!</p>
            ) : (
              <div className="space-y-4">
                {post.replies.map((reply) => {
                  const replyAuthorName = reply.user.name || reply.user.email;
                  const replyDate = new Date(reply.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const canDeleteReply =
                    reply.user.id === currentUserId || isOwner || isModerator;

                  return (
                    <div key={reply.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{replyAuthorName}</span>
                            <span className="text-xs text-gray-500">·</span>
                            <span className="text-xs text-gray-500">{replyDate}</span>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <RichTextDisplay content={reply.content} />
                          </div>
                        </div>
                        {canDeleteReply && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Reply?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this reply? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteReply(reply.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reply Form */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">Add a Reply</h3>
            <form onSubmit={handleReply} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <RichTextEditor
                content={replyContent}
                onChange={setReplyContent}
                placeholder="Write your reply..."
                minHeight="150px"
              />
              <Button type="submit" disabled={isSubmitting || !replyContent.trim()}>
                {isSubmitting ? "Posting..." : "Post Reply"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

