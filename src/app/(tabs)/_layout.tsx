import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useColors } from '../../ui/theme';

type IconName = ComponentProps<typeof Feather>['name'];

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Feather name={name} color={color} size={size - 2} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sun') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('bar-chart-2') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
