import { NextResponse } from 'next/server';
import { ApiError, handleApiError, requireApiUser } from '@/lib/api';
import { assertDemoAiQuota, isDemoUser } from '@/lib/demo-restriction';
import { extractPrescriptionWithGemini } from '@/lib/gemini-ocr';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Ensure caller is an authenticated doctor or staff
    const user = await requireApiUser();

    // Check demo walkthrough restriction: max 1 AI scan credit
    await assertDemoAiQuota(user);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        400,
        'Gemini API key is not configured. Please add GEMINI_API_KEY="your-api-key" to your .env file to enable Prescription OCR.',
        'GEMINI_KEY_MISSING'
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (contentType.includes('application/json')) {
      const json = await request.json();
      if (!json.imageBase64 || typeof json.imageBase64 !== 'string') {
        throw new ApiError(400, 'Missing imageBase64 in request body.', 'INVALID_PAYLOAD');
      }
      base64Data = json.imageBase64.includes(',') ? json.imageBase64.split(',')[1] : json.imageBase64;
      if (json.mimeType) mimeType = json.mimeType;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        throw new ApiError(400, 'Missing prescription image file.', 'INVALID_FILE');
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Data = buffer.toString('base64');
      mimeType = file.type || 'image/jpeg';
    } else {
      throw new ApiError(400, 'Unsupported Content-Type. Send JSON or multipart/form-data.', 'UNSUPPORTED_MEDIA');
    }

    const result = await extractPrescriptionWithGemini({
      imageBase64: base64Data,
      mimeType,
      apiKey,
    });

    if (isDemoUser(user)) {
      await prisma.auditLog.create({
        data: {
          clinicId: user.clinicId,
          actorUserId: user.id,
          actorName: user.name,
          action: 'AI_OCR_SCAN',
          entityType: 'GeminiOCR',
          summary: `Demo AI Scan credit used by ${user.name}`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
