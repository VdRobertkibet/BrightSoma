const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ─── Set Custom Claims on User Creation ───────────────────────────────────────

exports.assignUserRoleClaim = functions.firestore
  .document('staff/{userId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const userId = context.params.userId;
    const role = data.role;
    if (role) {
      try {
        await admin.auth().setCustomUserClaims(userId, { role });
        console.log(`Set custom claim role: ${role} for user: ${userId}`);
      } catch (error) {
        console.error(`Error setting custom claim for user ${userId}:`, error);
      }
    }
  });

exports.assignAdminRoleClaim = functions.firestore
  .document('schools/{userId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    try {
      await admin.auth().setCustomUserClaims(userId, { role: 'ADMIN' });
      console.log(`Set custom claim role: ADMIN for user: ${userId}`);
    } catch (error) {
      console.error(`Error setting Admin custom claim for user ${userId}:`, error);
    }
  });

exports.assignPlatformAdminRoleClaim = functions.auth.user().onCreate(async (user) => {
  if (user.email === 'BrightSoma@gmail.com') {
    try {
      await admin.auth().setCustomUserClaims(user.uid, { role: 'PLATFORM_ADMIN' });
    } catch (error) {
      console.error(`Error setting Platform Admin custom claim:`, error);
    }
  } else if (user.email === 'ckirobert7@gmail.com') {
    try {
      await admin.auth().setCustomUserClaims(user.uid, { role: 'ADMIN' });
    } catch (error) {
      console.error(`Error setting Admin custom claim:`, error);
    }
  }
});

// ─── Real SMS via Africa's Talking REST API ───────────────────────────────────
// Uses Node.js built-in fetch (available in Node 18+). No extra package needed.

exports.sendSMS = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to send SMS.');
  }

  const { phone, message } = data; // phone can be "num1,num2" or ["num1", "num2"]

  if (!phone || !message) {
    throw new functions.https.HttpsError('invalid-argument', 'phone/recipients and message are required.');
  }

  const AT_API_KEY = functions.config().at?.apikey || process.env.AT_API_KEY || '';
  const AT_USERNAME = functions.config().at?.username || process.env.AT_USERNAME || 'sandbox';

  if (!AT_API_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'SMS service not configured.');
  }

  try {
    // Handle array or comma-string
    const phoneArray = Array.isArray(phone) ? phone : phone.split(',');
    
    // Normalize and filter
    const recipients = phoneArray.map(p => {
      let n = p.trim().replace(/\s+/g, '');
      if (n.startsWith('0')) n = '+254' + n.slice(1);
      else if (n.startsWith('254') && !n.startsWith('+')) n = '+' + n;
      return n;
    }).filter(n => n.length >= 10);

    if (recipients.length === 0) {
      throw new Error('No valid phone numbers provided.');
    }

    const params = new URLSearchParams({
      username: AT_USERNAME,
      to: recipients.join(','),
      message: message,
    });

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY,
      },
      body: params.toString(),
    });

    const result = await response.json();
    console.log('AT SMS Response:', JSON.stringify(result));

    const recipientList = result?.SMSMessageData?.Recipients || [];
    const successes = recipientList.filter(r => r.status === 'Success' || r.statusCode === 101);
    
    if (successes.length > 0) {
      return { 
        success: true, 
        sentCount: successes.length, 
        totalCount: recipients.length,
        messageId: successes[0].messageId,
        cost: successes.reduce((acc, curr) => acc + (parseFloat(curr.cost.split(' ')[1]) || 0), 0)
      };
    } else {
      const firstError = recipientList[0]?.status || 'Unknown error';
      throw new functions.https.HttpsError('internal', `SMS failed: ${firstError}`);
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('Error calling AT API:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to send SMS.');
  }
});
