import React, { useEffect } from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Radius } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

SplashScreen.preventAutoHideAsync();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Active tab: the icon sits on a sun-yellow pill, the app's "this is live" color. */
function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: ColorValue }) {
  const { colors } = usePalette();
  return (
    <View style={[styles.iconPill, focused && { backgroundColor: colors.highlight }]}>
      <Ionicons name={name} size={22} color={focused ? colors.onHighlight : color} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = usePalette();
  // Room for the icon pill plus a full label line, then the home-indicator inset,
  // so labels are never clipped and nothing sits under the indicator.
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const tab =
    (focusedIcon: IconName, icon: IconName) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <TabIcon name={focused ? focusedIcon : icon} focused={focused} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.cardBorder,
          height: 64 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Translate', tabBarIcon: tab('hand-left', 'hand-left-outline') }}
      />
      <Tabs.Screen
        name="converse"
        options={{ title: 'Talk', tabBarIcon: tab('chatbubbles', 'chatbubbles-outline') }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{ title: 'Dictionary', tabBarIcon: tab('book', 'book-outline') }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: 'Practice', tabBarIcon: tab('school', 'school-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 52,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
