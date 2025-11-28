import { Resend } from 'resend';
import { supabaseAdmin } from './supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  templateKey: string,
  data: Record<string, any>
) {
  try {
    const admin = supabaseAdmin();
    
    // 1. Fetch template
    const { data: template, error } = await admin
      .from('email_templates')
      .select('*')
      .eq('key', templateKey)
      .single();

    if (error || !template) {
      console.error(`Email template '${templateKey}' not found.`);
      return { success: false, error: 'Template not found' };
    }

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

    return { success: true, data: emailData };
  } catch (err) {
    console.error('sendEmail exception:', err);
    return { success: false, error: err };
  }
}
