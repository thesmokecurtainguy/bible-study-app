import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  // Fetch groups directly from database since we're server-side
  const { prisma } = await import("@/lib/prisma");

  // Get groups where user is member or owner
  const memberships = await prisma.groupMembership.findMany({
    where: {
      userId: session.user.id,
      leftAt: null,
    },
    include: {
      group: {
        include: {
          study: {
            select: {
              id: true,
              title: true,
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
          posts: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              createdAt: true,
            },
          },
        },
      },
    },
  });

  // Filter to only active groups
  const activeMemberships = memberships.filter((m) => m.group && m.group.isActive);

  // Also get groups where user is owner
  const ownedGroups = await prisma.group.findMany({
    where: {
      ownerId: session.user.id,
      isActive: true,
    },
    include: {
      study: {
        select: {
          id: true,
          title: true,
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
      posts: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      },
    },
  });

  // Combine and deduplicate
  const groupMap = new Map();

  activeMemberships.forEach((m) => {
    if (m.group) {
      groupMap.set(m.group.id, {
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        studyId: m.group.studyId,
        studyTitle: m.group.study.title,
        memberCount: m.group._count.memberships,
        isOwner: false,
        lastActivity: m.group.posts[0]?.createdAt || m.group.createdAt,
        createdAt: m.group.createdAt,
      });
    }
  });

  ownedGroups.forEach((group) => {
    groupMap.set(group.id, {
      id: group.id,
      name: group.name,
      description: group.description,
      studyId: group.studyId,
      studyTitle: group.study.title,
      memberCount: group._count.memberships,
      isOwner: true,
      lastActivity: group.posts[0]?.createdAt || group.createdAt,
      createdAt: group.createdAt,
    });
  });

  const groups = Array.from(groupMap.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study Groups</h1>
          <p className="mt-2 text-gray-600">
            Connect with others studying the same Bible study.
          </p>
        </div>
        <Link href="/groups/create">
          <Button>Create Group</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">You haven't joined any groups yet.</p>
            <Link href="/groups/create">
              <Button>Create Your First Group</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group: any) => {
            const lastActivityDate = new Date(group.lastActivity);
            const now = new Date();
            const daysDiff = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
            let lastActivityText = "";
            if (daysDiff === 0) {
              lastActivityText = "Today";
            } else if (daysDiff === 1) {
              lastActivityText = "Yesterday";
            } else if (daysDiff < 7) {
              lastActivityText = `${daysDiff} days ago`;
            } else {
              lastActivityText = lastActivityDate.toLocaleDateString();
            }

            return (
              <Card key={group.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2">{group.name}</CardTitle>
                    {group.isOwner && (
                      <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        Owner
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {group.studyTitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <CardDescription className="line-clamp-2 mb-4 flex-1">
                    {group.description || "No description."}
                  </CardDescription>
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</span>
                      <span className="text-gray-400">Last activity: {lastActivityText}</span>
                    </div>
                    <Link href={`/groups/${group.id}`}>
                      <Button className="w-full" variant={group.isOwner ? "default" : "outline"}>
                        View Group
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

