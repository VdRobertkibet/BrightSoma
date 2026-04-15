import { db, auth } from '../src/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { TransitEventType, Notification } from '../types';
import { sendRealSMS } from './smsService';

export const sendTransitNotification = async (
  schoolId: string,
  studentId: string,
  studentName: string,
  eventType: TransitEventType
) => {
  try {
    // 1. Fetch student data to get parent contact
    const studentDocRef = doc(db, 'students', studentId);
    const studentSnap = await getDoc(studentDocRef);
    
    if (!studentSnap.exists()) return;
    const studentData = studentSnap.data();
    // Try multiple possible phone fields
    const parentPhone = 
      studentData.parentInfo?.emergencyContact || 
      studentData.parentInfo?.fatherPhone || 
      studentData.parentInfo?.motherPhone || 
      studentData.parentInfo?.guardianPhone;
    
    let title = '';
    let message = '';

    switch (eventType) {
      case 'boarded_morning':
        title = '🚌 Morning Pickup';
        message = `${studentName} has boarded the school bus for the morning commute.`;
        break;
      case 'arrived_school':
        title = '🏫 Arrived at School';
        message = `${studentName} has safely arrived at school.`;
        break;
      case 'marked_present':
        title = '📚 Class Attendance';
        message = `${studentName} has been marked PRESENT in class roll call.`;
        break;
      case 'boarded_evening':
        title = '🌆 Evening Departure';
        message = `${studentName} has boarded the school bus heading home.`;
        break;
      case 'arrived_home':
        title = '🏠 Arrived Home';
        message = `${studentName} has reached home safely.`;
        break;
    }

    // 2. Local In-App Notification record
    await addDoc(collection(db, 'notifications'), {
      schoolId,
      userId: studentId, 
      title,
      message,
      type: 'Transit',
      status: 'Unread',
      timestamp: serverTimestamp()
    });

    // Send real SMS to the parent
    if (parentPhone) {
      try {
        await sendRealSMS(parentPhone, message);
        console.log(`Transit SMS sent to ${parentPhone} for ${studentName}`);
      } catch (smsError) {
        console.error('Failed to send Transit SMS:', smsError);
        // We still consider the main notification "sent" even if SMS fails
      }
    }

    console.log(`Notification sent: ${title} for ${studentName}`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
