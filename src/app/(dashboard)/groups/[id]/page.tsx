import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareInviteButton } from "@/components/groups/share-invite-button";
import { DiscussionBoard } from "@/components/groups/discussion-board";

interface GroupDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch group details directly from database
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      study: {
        select: {
          id: true,
          title: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      memberships: {
        where: {
          leftAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
      moderators: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          memberships: {
            where: {
              leftAt: null,
            },
          },
        },
      },
    },
  });

  if (!group || !group.isActive) {
    notFound();
  }

  // Check if user is a member
  const isMember = group.memberships.some((m) => m.userId === session.user.id);
  const isOwner = group.ownerId === session.user.id;
  const isModerator = group.moderators.some((m) => m.userId === session.user.id);

  if (!isMember && !isOwner && !isModerator) {
    redirect("/groups");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/groups"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to Groups
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{group.name}</h1>
          <p className="mt-1 text-gray-600">{group.study.title}</p>
          {group.description && (
            <p className="mt-2 text-gray-700">{group.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {(isOwner || isModerator) && (
            <Link href={`/groups/${id}/settings`}>
              <Button variant="outline">Settings</Button>
            </Link>
          )}
          <ShareInviteButton inviteCode={group.inviteCode} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content - Discussion Board */}
        <div className="lg:col-span-2 space-y-6">
          <DiscussionBoard
            groupId={id}
            currentUserId={session.user.id}
            isOwner={isOwner}
            isModerator={isModerator}
          />
        </div>

        {/* Sidebar - Members */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {group._count.memberships} {group._count.memberships === 1 ? "member" : "members"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.memberships.map((membership) => {
                  const isPostOwner = membership.userId === group.ownerId;
                  const isPostModerator = group.moderators.some((m) => m.userId === membership.userId);
                  
                  return (
                    <div key={membership.id} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        {membership.user.image ? (
                          <img
                            src={membership.user.image}
                            alt={membership.user.name || "User"}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium text-blue-700">
                            {(membership.user.name || membership.user.email)[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {membership.user.name || membership.user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isPostOwner && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Owner</Badge>
                          )}
                          {isPostModerator && !isPostOwner && (
                            <Badge className="bg-gray-100 text-gray-800 text-xs">Moderator</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Group Info */}
          <Card>
            <CardHeader>
              <CardTitle>Group Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Study:</span>
                <Link href={`/studies/${group.studyId}`} className="ml-2 text-blue-600 hover:underline">
                  {group.study.title}
                </Link>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(group.createdAt).toLocaleDateString()}
                </span>
              </div>
              {group.inviteEnabled ? (
                <div>
                  <span className="font-medium text-gray-700">Invite Code:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-gray-900 font-mono">
                    {group.inviteCode}
                  </code>
                </div>
              ) : (
                <div>
                  <span className="text-gray-500">Invites are disabled</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

