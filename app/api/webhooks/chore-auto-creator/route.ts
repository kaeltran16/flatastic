import { autoCreateChoreFromTemplate } from '@/lib/actions/chore-webhooks';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const webhookSecret = request.headers.get('x-webhook-secret');

    if (!webhookSecret || !process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    const { formData } = body;

    const templateId = formData.template_id;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'template_id is required' },
        { status: 400 }
      );
    }

    if (!formData) {
      return Response.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: template, error: templateError } = await supabase
      .from('chore_templates')
      .select('name, id')
      .eq('id', templateId)
      .single();

    if (templateError) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 400 }
      );
    }

    // Call the server action
    const result = await autoCreateChoreFromTemplate({
      ...formData,
      name: template.name,
    });

    return Response.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
