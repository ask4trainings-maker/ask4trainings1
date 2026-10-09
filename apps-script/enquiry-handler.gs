/**
 * Google Apps Script Backend Webhook — Ask4Trainings
 * Deployment Settings:
 *   - Execute as: Me
 *   - Who has access: Anyone
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  // Helper to prevent CSV formula injection
  const sanitizeInput = (val) => {
    if (typeof val !== 'string') return val;
    const str = val.trim();
    if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
      return "'" + str;
    }
    return str;
  };

  try {
    lock.waitLock(30000);

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No post data received in request body");
    }

    const data = JSON.parse(e.postData.contents);

    // ================= CONFIGURATION =================
    const SPREADSHEET_ID = '1nuoZD-NWd53WMrCSGmOT8d6o9EuG8-qKimuo2_x7pCg'; // Replace with your Sheet ID
    const NOTIFICATION_EMAIL = 'admin@ask4trainings.com';       // Destination email (can be comma-separated: 'admin@..., info@...')
    const WEBSITE_NAME = 'Ask4Trainings';
    const WEBSITE_DOMAIN = 'ask4trainings.com';
    // =================================================

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const timestamp = new Date();
    const formattedTimestamp = Utilities.formatDate(timestamp, "Asia/Kolkata", "dd MMM yyyy, hh:mm a") + " IST";

    const name = sanitizeInput(data.name || 'Anonymous');
    const phone = sanitizeInput(data.phone || 'N/A');
    const email = sanitizeInput(data.email || 'N/A');
    const course = sanitizeInput(data.course || data.expertise || 'General Enquiry');
    const sourceUrl = sanitizeInput(data.sourceUrl || data.sourcePage || 'https://ask4trainings.com/');
    const isTrainer = data.type === 'trainer';

    // Normalize phone for WhatsApp API (digits only)
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi ${name}! Thanks for messaging ${WEBSITE_NAME} about${course}.\nHow can we help you today? Feel free to ask about our batches, Timings, or course curriculum!`)}`;

    let sheetName = isTrainer ? 'Trainer-Applications' : 'Website-Enquiry';
    let headers = isTrainer
      ? ['Timestamp', 'Website', 'Name', 'Phone', 'Email', 'Expertise', 'Source URL']
      : ['Timestamp', 'Website', 'Name', 'Phone', 'Email', 'Course', 'Source URL'];

    let rowData = isTrainer
      ? [timestamp, WEBSITE_NAME, name, phone, email, course, sourceUrl]
      : [timestamp, WEBSITE_NAME, name, phone, email, course, sourceUrl];

    // Subject lines
    const emailSubject = isTrainer
      ? `👨‍🏫 [${WEBSITE_NAME}] Trainer Application: ${name} — ${course}`
      : `🔥 [${WEBSITE_NAME}] New Student Lead: ${name} — ${course} (${phone})`;

    // Plain text fallback
    const plainTextBody = `
New Submission from ${WEBSITE_NAME} (${WEBSITE_DOMAIN})
--------------------------------------------------
Lead Type: ${isTrainer ? 'Trainer Application' : 'Student Course Enquiry'}
Name: ${name}
Phone: ${phone}
Email: ${email}
Program/Course: ${course}
Source Page: ${sourceUrl}
Submitted At: ${formattedTimestamp}
WhatsApp Link: ${waLink}
    `.trim();

    // Responsive HTML Email Template with Emerald Branding
    const htmlEmailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="background-color: #047857; padding: 24px 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #065f46; color: #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px;">
                      Website Lead Alert
                    </span>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">
                      ${WEBSITE_NAME}
                    </h1>
                    <p style="color: #d1fae5; font-size: 13px; margin: 4px 0 0 0;">
                      New ${isTrainer ? 'trainer application' : 'student enquiry'} captured on <strong style="color: #ffffff;">${WEBSITE_DOMAIN}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- QUICK ACTION BAR -->
          <tr>
            <td style="padding: 16px 28px; background-color: #ecfdf5; border-bottom: 1px solid #d1fae5;">
              <table role="presentation" width="100%">
                <tr>
                  <td align="left">
                    <span style="font-size: 12px; color: #065f46; font-weight: 600;">Immediate Follow-Up:</span>
                  </td>
                  <td align="right">
                    <a href="tel:${cleanPhone}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 8px; margin-right: 6px;">
                      📞 Call Lead
                    </a>
                    <a href="${waLink}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 8px;">
                      💬 WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- LEAD DETAILS TABLE -->
          <tr>
            <td style="padding: 24px 28px;">
              <table role="presentation" width="100%" style="border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 35%;">Student Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Phone Number</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
                    <a href="tel:${cleanPhone}" style="color: #047857; text-decoration: none;">${phone}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Email Address</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">
                    ${email !== 'N/A' ? `<a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a>` : '<span style="color: #94a3b8;">Not provided</span>'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Course Selected</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
                    <span style="background-color: #f1f5f9; padding: 3px 8px; border-radius: 6px; display: inline-block;">${course}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Registered From Page</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 12px; word-break: break-all;">
                    <a href="${sourceUrl}" target="_blank" style="color: #047857; text-decoration: underline;">${sourceUrl}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Submission Time</td>
                  <td style="padding: 10px 0; color: #475569; font-size: 13px;">${formattedTimestamp}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This automated alert was generated by <strong>${WEBSITE_NAME}</strong> lead capture system.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Save to Google Spreadsheet
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#E2E8F0')
        .setBorder(true, true, true, true, true, true);
    }
    sheet.appendRow(rowData);

    // Send the Branded Email Notification
    try {
      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: emailSubject,
        body: plainTextBody,
        htmlBody: htmlEmailBody
      });
    } catch (emailErr) {
      console.warn("Email dispatch failed", emailErr);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data synced successfully' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}