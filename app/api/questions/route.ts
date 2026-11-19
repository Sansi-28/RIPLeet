import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return Number(session.user.id);
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyName = searchParams.get('company')?.toLowerCase() || 'google';
  const timeframe = searchParams.get('timeframe') || 'thirty-days';
  const difficulty = searchParams.get('difficulty');
  const search = searchParams.get('search')?.trim().toLowerCase() || '';

  try {
    const whereClause: any = {
      timeframe,
      company: { name: companyName },
    };

    if (difficulty && difficulty !== 'All') {
      whereClause.question = { difficulty };
    }

    if (search) {
      const searchNum = parseInt(search, 10);
      whereClause.question = {
        ...(whereClause.question || {}),
        OR: [
          { title: { contains: search } },
          ...(!isNaN(searchNum) ? [{ id: searchNum }] : []),
        ],
      };
    }

    const data = await prisma.companyQuestion.findMany({
      where: whereClause,
      include: {
        question: {
          include: {
            userProgress: { where: { user_id: userId } },
          },
        },
      },
      orderBy: { frequency: 'desc' },
      take: 200,
    });

    const questions = data.map((cq) => {
      const progress = cq.question.userProgress?.[0];
      return {
        id: cq.question.id,
        title: cq.question.title,
        url: cq.question.url,
        difficulty: cq.question.difficulty,
        acceptance: cq.question.acceptance,
        frequency: cq.frequency,
        status: progress?.status || 'TODO',
        notes: progress?.notes || '',
      };
    });

    const availableTimeframes = await prisma.companyQuestion.findMany({
      where: { company: { name: companyName } },
      select: { timeframe: true },
      distinct: ['timeframe'],
    });

    return NextResponse.json({
      company: companyName,
      timeframe,
      total: questions.length,
      availableTimeframes: availableTimeframes.map((t) => t.timeframe),
      questions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
