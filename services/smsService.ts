import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../src/firebase';

const functions = getFunctions(app);
const sendSMSCallable = httpsCallable(functions, 'sendSMS');

/**
 * Sends a real SMS via Africa's Talking (through Firebase Cloud Function).
 * @param phone - Recipient phone number (Kenyan format: 07XX, +254XX, or 254XX)
 * @param message - The SMS message body
 * @returns { success: boolean, messageId?: string, cost?: number, sentCount?: number, totalCount?: number }
 */
export const sendRealSMS = async (
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; cost?: number; sentCount?: number; totalCount?: number }> => {
  try {
    const result = await sendSMSCallable({ phone, message });
    return result.data as { success: boolean; messageId?: string; cost?: number; sentCount?: number; totalCount?: number };
  } catch (error: any) {
    console.error('sendRealSMS error:', error);
    throw new Error(error?.message || 'Failed to send SMS. Please try again.');
  }
};
