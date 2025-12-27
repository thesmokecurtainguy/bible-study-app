import React from "react";

interface StudyReminderEmailProps {
  userName: string;
  studyTitle: string;
  progress: number;
  currentWeek: number;
  currentDay: number;
  studyUrl: string;
  unsubscribeUrl: string;
}

export function StudyReminderEmail({
  userName,
  studyTitle,
  progress,
  currentWeek,
  currentDay,
  studyUrl,
  unsubscribeUrl,
}: StudyReminderEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Time for your Bible study!</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: "#f5f5f5" }}>
        <table
          role="presentation"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#f5f5f5",
            padding: "20px",
          }}
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                style={{
                  maxWidth: "600px",
                  width: "100%",
                  borderCollapse: "collapse",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      padding: "40px 30px",
                      textAlign: "center",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                    }}
                  >
                    <h1
                      style={{
                        margin: 0,
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#ffffff",
                      }}
                    >
                      📖 Time for your Bible study!
                    </h1>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: "40px 30px" }}>
                    <p
                      style={{
                        margin: "0 0 20px 0",
                        fontSize: "16px",
                        lineHeight: "1.6",
                        color: "#333333",
                      }}
                    >
                      Hi {userName},
                    </p>
                    <p
                      style={{
                        margin: "0 0 20px 0",
                        fontSize: "16px",
                        lineHeight: "1.6",
                        color: "#333333",
                      }}
                    >
                      Don't forget your Bible study today! You're making great progress on{" "}
                      <strong>{studyTitle}</strong>.
                    </p>

                    {/* Progress Section */}
                    <div
                      style={{
                        backgroundColor: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        borderRadius: "8px",
                        padding: "20px",
                        margin: "30px 0",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#0369a1",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Your Progress
                      </p>
                      <p
                        style={{
                          margin: "0 0 15px 0",
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#0369a1",
                        }}
                      >
                        {progress}% Complete
                      </p>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          backgroundColor: "#e0f2fe",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: "100%",
                            backgroundColor: "#2563eb",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <p
                        style={{
                          margin: "15px 0 0 0",
                          fontSize: "14px",
                          color: "#64748b",
                        }}
                      >
                        Currently on Week {currentWeek}, Day {currentDay}
                      </p>
                    </div>

                    {/* Encouragement */}
                    <p
                      style={{
                        margin: "30px 0 20px 0",
                        fontSize: "16px",
                        lineHeight: "1.6",
                        color: "#333333",
                        fontStyle: "italic",
                      }}
                    >
                      "Your word is a lamp to my feet and a light to my path." - Psalm 119:105
                    </p>

                    {/* CTA Button */}
                    <table role="presentation" style={{ width: "100%", margin: "30px 0" }}>
                      <tr>
                        <td align="center">
                          <a
                            href={studyUrl}
                            style={{
                              display: "inline-block",
                              padding: "14px 32px",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              textDecoration: "none",
                              borderRadius: "6px",
                              fontSize: "16px",
                              fontWeight: "600",
                              textAlign: "center",
                            }}
                          >
                            Continue Studying →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p
                      style={{
                        margin: "30px 0 0 0",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        color: "#64748b",
                      }}
                    >
                      Keep up the great work! Your daily commitment to studying God's Word is making a difference.
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      padding: "20px 30px",
                      backgroundColor: "#f8fafc",
                      borderTop: "1px solid #e2e8f0",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      You're receiving this because you enabled study reminders in your settings.
                    </p>
                    <p style={{ margin: 0, fontSize: "12px" }}>
                      <a
                        href={unsubscribeUrl}
                        style={{
                          color: "#64748b",
                          textDecoration: "underline",
                        }}
                      >
                        Unsubscribe from reminders
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

// Helper function to render the email as HTML string
export function renderStudyReminderEmail(props: StudyReminderEmailProps): string {
  const { userName, studyTitle, progress, currentWeek, currentDay, studyUrl, unsubscribeUrl } = props;
  
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Time for your Bible study!</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
      <tr>
        <td align="center">
          <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding: 40px 30px; text-align: center; background-color: #2563eb; color: #ffffff;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">📖 Time for your Bible study!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">Hi ${userName},</p>
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">Don't forget your Bible study today! You're making great progress on <strong>${studyTitle}</strong>.</p>
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Your Progress</p>
                  <p style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold; color: #0369a1;">${progress}% Complete</p>
                  <div style="width: 100%; height: 8px; background-color: #e0f2fe; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background-color: #2563eb; transition: width 0.3s ease;"></div>
                  </div>
                  <p style="margin: 15px 0 0 0; font-size: 14px; color: #64748b;">Currently on Week ${currentWeek}, Day ${currentDay}</p>
                </div>
                <p style="margin: 30px 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333; font-style: italic;">"Your word is a lamp to my feet and a light to my path." - Psalm 119:105</p>
                <table role="presentation" style="width: 100%; margin: 30px 0;">
                  <tr>
                    <td align="center">
                      <a href="${studyUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; text-align: center;">Continue Studying →</a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">Keep up the great work! Your daily commitment to studying God's Word is making a difference.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;">You're receiving this because you enabled study reminders in your settings.</p>
                <p style="margin: 0; font-size: 12px;"><a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe from reminders</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

