
import { cloudFunctions } from '../services/cloudMock';

/**
 * PLATFORM ADAPTER
 * ----------------
 * This file acts as a bridge between the game logic and the runtime environment.
 * 
 * CURRENT ENVIRONMENT: Web Browser
 * TARGET ENVIRONMENT: WeChat Mini Program
 */

// 1. Vibration / Haptics
export const platformVibrate = (type: 'heavy' | 'light' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (type === 'heavy') navigator.vibrate(20); 
    else navigator.vibrate(5);
  }
};

// 2. System Modal / Alert
export const platformAlert = (title: string, content: string) => {
  alert(`${title}\n\n${content}`);
};

// 3. Mock Cloud Function Call
// This simulates wx.cloud.callFunction({ name, data })
export const callCloudFunction = async (name: keyof typeof cloudFunctions, data: any): Promise<any> => {
  console.log(`[☁️ Cloud] Calling '${name}'...`, data);
  
  // Simulate Network Latency (Crucial for UX pacing)
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const fn = cloudFunctions[name];
  if (!fn) {
    console.error(`Cloud function '${name}' not found.`);
    throw new Error(`Cloud function '${name}' not found.`);
  }

  // Execute Mock Logic
  const result = await fn(data);
  console.log(`[☁️ Cloud] Result from '${name}':`, result);
  return result;
};
