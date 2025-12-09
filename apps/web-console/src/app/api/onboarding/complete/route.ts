import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Here you would update the user's onboarding status in your database
    // For now, we'll just return success
    // TODO: Add database update for onboarding completion

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed',
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
