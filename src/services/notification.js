import {
  getMessaging,
  getToken,
  requestPermission,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const messaging = getMessaging();

import { PermissionsAndroid, Platform } from 'react-native';

export async function requestUserPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Android 13+ Notification Permission Granted');
    } else {
      console.log('Android 13+ Notification Permission Denied');
    }
  }

  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    getFcmToken();
  }
}

export async function getFcmToken() {
  let fcmToken = await AsyncStorage.getItem('fcmToken');
  console.log('Old FCM Token:', fcmToken);
  if (!fcmToken) {
    try {
      const token = await getToken(messaging);
      if (token) {
        console.log('New FCM Token:', token);
        await AsyncStorage.setItem('fcmToken', token);
        fcmToken = token;
      }
    } catch (error) {
      console.log('Error fetching FCM Token:', error);
    }
  }
  return fcmToken;
}

export async function updateVendorFcmToken(vendorId) {
    const token = await getFcmToken();
    if (token && vendorId) {
        try {
            await api.put(`/vendors/fcm-token/${vendorId}`, { fcmToken: token });
            console.log('FCM Token updated on backend');
        } catch (error) {
            console.error('Failed to update FCM token on backend:', error);
        }
    }
}

export const notificationListener = () => {
  onNotificationOpenedApp(messaging, remoteMessage => {
    console.log(
      'Notification caused app to open from background state:',
      remoteMessage.notification,
    );
     // Navigate to order details if needed via navigation ref
  });

  getInitialNotification(messaging)
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log(
          'Notification caused app to open from quit state:',
          remoteMessage.notification,
        );
        // Navigate to order details if needed via navigation ref
      }
    });

  onMessage(messaging, async remoteMessage => {
    console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
  });
};
