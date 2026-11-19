import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);

  try {
    const totalProgress = await prisma.userProgress.groupBy({
      by: ['status'],
      where: { user_id: userId },
      _count: true,
    });

    const solved = totalProgress.find((p) => p.status === 'SOLVED')?._count || 0;
    const attempted = totalProgress.find((p) => p.status === 'ATTEMPTED')?._count || 0;
    const todo = totalProgress.find((p) => p.status === 'TODO')?._count || 0;

    // Get streak data: count of distinct dates where user solved something
    const recentSolves = await prisma.userProgress.findMany({
      where: { user_id: userId, status: 'SOLVED' },
      select: { updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const uniqueDays = new Set(
      recentSolves.map((s) => s.updatedAt.toISOString().slice(0, 10))
    );

    return NextResponse.json({
      solved,
      attempted,
      todo,
      totalTracked: solved + attempted + todo,
      activeDays: uniqueDays.size,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
