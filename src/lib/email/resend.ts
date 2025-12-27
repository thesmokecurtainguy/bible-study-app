import { Resend } from "resend";
import { renderStudyReminderEmail } from "./templates/study-reminder";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendStudyReminderParams {
  to: string;
  userName: string;
  studyTitle: string;
  progress: number;
  currentWeek: number;
  currentDay: number;
  studyUrl: string;
  unsubscribeUrl: string;
}

export async function sendStudyReminder({
  to,
  userName,
  studyTitle,
  progress,
  currentWeek,
  currentDay,
  studyUrl,
  unsubscribeUrl,
}: SendStudyReminderParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "Bible Study App";

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: "📖 Time for your Bible study!",
      html: renderStudyReminderEmail({
        userName,
        studyTitle,
        progress,
        currentWeek,
        currentDay,
        studyUrl,
        unsubscribeUrl,
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Error sending study reminder email:", error);
    throw error;
  }
}

