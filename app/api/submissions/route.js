// app/api/submissions/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseSubmission } from '@/lib/parser';
import { clusterSubmission } from '@/lib/clustering';
import { checkRateLimit, sanitizeInput } from '@/lib/security';

export async function POST(request) {
  try {
    // 1. Rate Limiting verification
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many suggestions submitted. Rate limit exceeded (20 req max). Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { 
      user_name, 
      raw_text, 
      audio_url, 
      image_url, 
      channel, 
      gps_lat, 
      gps_lng 
    } = body;

    // 2. Input Sanitization against XSS / Script injection
    const cleanUserName = sanitizeInput(user_name);
    const cleanRawText = sanitizeInput(raw_text);

    // Validate request
    if (!cleanUserName || (!cleanRawText && !audio_url && !image_url)) {
      return NextResponse.json(
        { error: "Submission must contain a user name and at least text, audio, or image evidence." }, 
        { status: 400 }
      );
    }

    // Generate unique ID
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const submission = {
      id: submissionId,
      user_name: cleanUserName,
      raw_text: cleanRawText,
      audio_url: audio_url || null,
      image_url: image_url || null,
      language: 'English', // default, to be corrected by the parser
      channel: channel || 'Web Form',
      gps_lat: gps_lat ? parseFloat(gps_lat) : null,
      gps_lng: gps_lng ? parseFloat(gps_lng) : null
    };

    // 1. Insert raw citizen submission metadata
    const { error: insertErr } = await supabase
      .from('submissions')
      .insert(submission);

    if (insertErr) {
      console.error("Database insert submission error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 2. Parse language, categories, ward location, and trust score
    const parsed = await parseSubmission(submission);

    // Update language back to submission row
    if (parsed.original_language && parsed.original_language !== 'English') {
      await supabase
        .from('submissions')
        .update({ language: parsed.original_language })
        .eq('id', submissionId);
    }

    // 3. semantic clustering, duplicate campaign evaluation, and project mapping
    const clusteringResult = await clusterSubmission(submission, parsed);

    return NextResponse.json({
      success: true,
      submission_id: submissionId,
      parsed: {
        category: parsed.category,
        issue_details: parsed.issue_details,
        ward_id: parsed.ward_id,
        trust_score: parsed.trust_score,
        confidence_score: parsed.confidence_score,
        status: parsed.status,
        is_campaign: parsed.is_campaign,
        original_language: parsed.original_language
      },
      clustering: clusteringResult
    });

  } catch (error) {
    console.error("Submission intake endpoint crash:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
