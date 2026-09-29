import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, parts, type ISODate } from '../domain/dates';
import type { Prediction } from '../domain/predictions';
import type { Settings } from '../domain/settings';

/**
 * Local reminders only: they're scheduled on the device and never go through a
 * server. The text is whatever the user chose (neutral by default), and it is
 * the only thing shown, so a notification never says what the app tracks.
 */

const CHANNEL_ID = 'reminders';
/** Upcoming-entry reminders are delivered at this hour. */
const UPCOMING_HOUR = 9;
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export function configureNotifications(): void {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      // Keep content off the lock screen.
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    }).catch(() => {});
  }
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelAllReminders(): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function atHour(date: ISODate, hour: number): Date {
  const { year, month, day } = parts(date);
  return new Date(year, month - 1, day, hour, 0, 0);
}

/** Replaces all scheduled reminders to match the current settings and prediction. */
export async function syncReminders(settings: Settings, prediction: Prediction | null): Promise<void> {
  if (!supported) return;
  await cancelAllReminders();
  const { upcoming, daily } = settings.reminders;
  if (!upcoming.enabled && !daily.enabled) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const content = (text: string): Notifications.NotificationContentInput => ({
    title: text,
    sound: false,
  });

  if (daily.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: content(daily.text),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: daily.hour,
        minute: daily.minute,
        channelId: CHANNEL_ID,
      },
    });
  }

  if (upcoming.enabled && prediction) {
    const now = Date.now();
    for (const cycle of prediction.cycles) {
      const when = atHour(addDays(cycle.start, -upcoming.daysBefore), UPCOMING_HOUR);
      if (when.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: content(upcoming.text),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    }
  }
}
