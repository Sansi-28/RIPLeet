import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase()?.trim() || '';

  try {
    const companies = await prisma.company.findMany({
      where: query
        ? {
            name: {
              contains: query,
            },
          }
        : undefined,
      select: {
        id: true,
        name: true,
        _count: {
          select: { companyQuestions: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(
      companies.map((c) => ({
        id: c.id,
        name: c.name,
        questionCount: c._count.companyQuestions,
      }))
    );
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
