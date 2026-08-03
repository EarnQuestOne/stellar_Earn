import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const metric = await request.json();

    // Log or forward metric to monitoring backend (e.g., Datadog, Prometheus, OpenTelemetry)
    if (process.env.NODE_ENV === 'production') {
      // Example: Forwarding to log aggregator or monitoring service
      console.log('[Core Web Vital Metric]:', metric);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process metric' },
      { status: 400 },
    );
  }
}