import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);

  try {
    const { questionId, status, notes } = await request.json();

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    const progress = await prisma.userProgress.upsert({
      where: {
        user_id_question_id: {
          user_id: userId,
          question_id: Number(questionId),
        },
      },
      update: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      create: {
        user_id: userId,
        question_id: Number(questionId),
        status: status || 'TODO',
        notes: notes || '',
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
