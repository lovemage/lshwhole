import { Resend } from 'resend';
import { supabaseAdmin } from './supabase';
import { EmailTemplatePayload } from '../types/email';

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;

function getResendClient() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is missing in environment variables');
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    console.log('Initializing Resend with API Key:', apiKey.slice(0, 5) + '...');
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export async function sendEmail(
  to: string,
  templateKey: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: unknown; data?: unknown }> {
  try {
    const admin = supabaseAdmin();

    // 1. Fetch template
    console.log(`Fetching email template: ${templateKey}`);
    const { data: template, error } = await admin
      .from('email_templates')
      .select('*')
      .eq('key', templateKey)
      .single();

    if (error || !template) {
      console.error(`Email template '${templateKey}' not found. Error:`, error);
      return { success: false, error: 'Template not found' };
    }
    console.log(`Template '${templateKey}' found.`);

    // 2. Replace variables
    let subject = template.subject;
    let body = template.body;

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g'); // Simple replacement {variable}
      const val = data[key] !== undefined ? String(data[key]) : '';
      subject = subject.replace(regex, val);
      body = body.replace(regex, val);
    });

    // 3. Send email
    // Note: Resend requires a verified domain. Using 'onboarding@resend.dev' for testing if no domain is set.
    // The user should configure this.
    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    
    console.log(`Sending email from: ${fromEmail} to: ${to}`);

    const resend = getResendClient();
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: body,
    });

    if (emailError) {
      console.error('Resend email failed:', emailError);
      return { success: false, error: emailError };
    }

    return { success: true, data: emailData as unknown };
  } catch (err) {
    console.error('sendEmail exception:', err);
    return { success: false, error: err };
  }
}
