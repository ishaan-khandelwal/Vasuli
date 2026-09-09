import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

/**
 * Generates a UPI deep link in the format:
 * upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 *
 * NOTE: isValidUpiId is intentionally loose. Real VPAs like 9876543210@ybl
 * and john.doe@okaxis pass, but so does a@b. This is acceptable — the UPI
 * app itself is the authoritative validator at payment time.
 */
export const isValidUpiId = (vpa) => {
  if (!vpa || typeof vpa !== 'string') return false;
  return /^[a-zA-Z0-9._\-]+@[a-zA-Z]+$/.test(vpa.trim());
};

export const generateUpiDeepLink = ({ payeeVpa, payeeName = '', amount, note = '' }) => {
  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: 'INR',
    ...(note ? { tn: note.slice(0, 50) } : {}),
  });
  return `upi://pay?${params.toString()}`;
};

/**
 * Returns platform support level for upi:// deep links.
 * 'full'    — Android: standard upi:// intent works across all UPI apps
 * 'partial' — iOS: upi:// is unreliable; need app-specific schemes
 * 'none'    — Web: upi:// not supported; show copy/QR fallback
 */
export const getUpiPlatformSupport = () => {
  if (Platform.OS === 'android') return 'full';
  if (Platform.OS === 'ios') return 'partial';
  return 'none';
};

/**
 * Attempts to open a UPI payment using the most reliable method for the
 * current platform.
 *
 * Android  → direct upi:// intent (works on GPay, PhonePe, Paytm, etc.)
 * iOS      → tries upi:// first; on failure shows an action sheet with
 *             app-specific schemes (gpay://, phonepe://) + copy fallback.
 *             ⚠️  Test on a real iOS device before shipping — simulator
 *             behaviour is unreliable for custom URL schemes.
 * Web      → cannot open upi://; caller should render <UpiPayButton> which
 *             provides a copy + QR fallback for web.
 *
 * @param {string} deepLink  - A upi://pay?... URL
 * @param {string} upiId     - Raw VPA string, used for copy fallback
 */
export const openUpiPayment = async (deepLink, upiId) => {
  const support = getUpiPlatformSupport();

  if (support === 'none') {
    // Web — caller is responsible for rendering copy/QR UI.
    throw new Error('UPI deep links are not supported in the browser. Use the copy button instead.');
  }

  if (support === 'full') {
    // Android — direct intent
    const canOpen = await Linking.canOpenURL(deepLink);
    if (!canOpen) {
      throw new Error('No UPI app found. Please install GPay, PhonePe, or Paytm.');
    }
    await Linking.openURL(deepLink);
    return;
  }

  // iOS — try upi:// first, then show app picker if it fails
  try {
    const canOpen = await Linking.canOpenURL(deepLink);
    if (canOpen) {
      await Linking.openURL(deepLink);
      return;
    }
  } catch (_) {
    // upi:// not supported on this iOS device — fall through to picker
  }

  // Build app-specific alternatives
  const queryString = deepLink.replace('upi://pay?', '');
  const gpayLink = `gpay://upi/pay?${queryString}`;
  const phonepeLink = `phonepe://pay?${queryString}`;

  const options = [];
  if (await Linking.canOpenURL(gpayLink).catch(() => false)) {
    options.push({ label: 'Open GPay', link: gpayLink });
  }
  if (await Linking.canOpenURL(phonepeLink).catch(() => false)) {
    options.push({ label: 'Open PhonePe', link: phonepeLink });
  }

  if (options.length === 0) {
    // No UPI app available — copy the UPI ID as last resort
    try {
      await Clipboard.setStringAsync(upiId || '');
    } catch (_) {}
    throw new Error('No UPI app found on this device. UPI ID copied to clipboard.');
  }

  return new Promise((resolve, reject) => {
    const buttons = [
      ...options.map((opt) => ({
        text: opt.label,
        onPress: () => Linking.openURL(opt.link).then(resolve).catch(reject),
      })),
      {
        text: 'Copy UPI ID',
        onPress: () => {
          try {
            Clipboard.setStringAsync(upiId || '');
          } catch (_) {}
          resolve();
        },
      },
      { text: 'Cancel', style: 'cancel', onPress: resolve },
    ];

    Alert.alert('Pay with UPI', 'Choose your payment app:', buttons);
  });
};
