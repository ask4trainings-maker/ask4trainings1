/**
 * Google Apps Script Backend Webhook
 * Set Deployment Access to: "Anyone, even anonymous"
 */
function doPost(e) {
  // Use a lock to prevent concurrent writing issues from simultaneous submissions
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
    // Wait up to 30 seconds for lock release
    lock.waitLock(30000);
    
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No post data received in request body");
    }
    
    const data = JSON.parse(e.postData.contents);
    const SPREADSHEET_ID = 'YOUR_GOOGLE_SPREADSHEET_ID_HERE'; // Replace with Ask4Trainings Spreadsheet ID
    const NOTIFICATION_EMAIL = 'admin@ask4trainings.com'; // Replace with destination alert email
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    let sheetName = 'Website-Enquiry';
    let headers = [];
    let rowData = [];
    let emailSubject = '';
    let emailBody = '';
    
    const timestamp = new Date();
    
    // Route based on payload 'type'
    if (data.type === 'trainer') {
      sheetName = 'Trainer-Applications';
      headers = ['Timestamp', 'Name', 'Phone', 'Email', 'Expertise'];
      rowData = [
        timestamp,
        sanitizeInput(data.name || ''),
        sanitizeInput(data.phone || ''),
        sanitizeInput(data.email || ''),
        sanitizeInput(data.expertise || '')
      ];
      emailSubject = `New Trainer Application: ${sanitizeInput(data.name || 'Anonymous')} — ${sanitizeInput(data.expertise || 'General')}`;
      emailBody = `A new trainer application has been submitted on Ask4Trainings:\n\n` +
                  `Name: ${sanitizeInput(data.name)}\n` +
                  `Phone: ${sanitizeInput(data.phone)}\n` +
                  `Email: ${sanitizeInput(data.email || 'N/A')}\n` +
                  `Expertise: ${sanitizeInput(data.expertise)}\n` +
                  `Submitted on: ${sanitizeInput(data.date || '')} at ${sanitizeInput(data.time || '')}`;
    } else {
      // Default to student enquiry
      sheetName = 'Website-Enquiry';
      headers = ['Timestamp', 'Name', 'Phone', 'Email', 'Course', 'Source URL'];
      rowData = [
        timestamp,
        sanitizeInput(data.name || ''),
        sanitizeInput(data.phone || ''),
        sanitizeInput(data.email || ''),
        sanitizeInput(data.course || 'General Enquiry'),
        sanitizeInput(data.sourceUrl || data.sourcePage || '')
      ];
      emailSubject = `New Lead: ${sanitizeInput(data.name || 'Anonymous')} — ${sanitizeInput(data.course || 'General')}`;
      emailBody = `A new student lead has been captured on Ask4Trainings:\n\n` +
                  `Name: ${sanitizeInput(data.name)}\n` +
                  `Phone: ${sanitizeInput(data.phone)}\n` +
                  `Email: ${sanitizeInput(data.email || 'N/A')}\n` +
                  `Course: ${sanitizeInput(data.course || 'General Enquiry')}\n` +
                  `Source URL: ${sanitizeInput(data.sourceUrl || data.sourcePage || 'N/A')}\n` +
                  `Submitted on: ${sanitizeInput(data.date || '')} at ${sanitizeInput(data.time || '')}`;
    }
    
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    // Auto-create sheet and styled headers if missing
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#F1F5F9')
        .setBorder(true, true, true, true, true, true);
    }
    
    sheet.appendRow(rowData);
    
    // Send email alert (wrapped in try-catch so mail quota limits don't block spreadsheet saves)
    try {
      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: emailSubject,
        body: emailBody,
      });
    } catch (emailErr) {
      console.warn("Failed to send notification email", emailErr);
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
