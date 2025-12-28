"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatePostModal } from "./create-post-modal";
import { PostCard } from "./post-card";
import { PostDetail } from "./post-detail";

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
  replies?: Reply[];
  _count: {
    replies: number;
  };
}

interface DiscussionBoardProps {
  groupId: string;
  currentUserId: string;
  isOwner: boolean;
  isModerator: boolean;
}

export function DiscussionBoard({
  groupId,
  currentUserId,
  isOwner,
  isModerator,
}: DiscussionBoardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/posts`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [groupId]);

  const handlePostClick = async (post: Post) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/posts/${post.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPost(data.post);
        setIsDetailModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch post details:", error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/posts/${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPosts();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete post");
      }
    } catch (error) {
      alert("Failed to delete post");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discussion Board</CardTitle>
              <CardDescription>
                Start conversations and share insights with your group.
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Post
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 mb-4">No discussions yet.</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Create First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  isModerator={isModerator}
                  onView={() => handlePostClick(post)}
                  onDelete={() => handleDeletePost(post.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        groupId={groupId}
        onSuccess={fetchPosts}
      />

      <PostDetail
        post={selectedPost}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPost(null);
        }}
        groupId={groupId}
        currentUserId={currentUserId}
        isOwner={isOwner}
        isModerator={isModerator}
        onRefresh={() => {
          fetchPosts();
          if (selectedPost) {
            handlePostClick(selectedPost);
          }
        }}
      />
    </>
  );
}

