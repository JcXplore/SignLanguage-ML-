import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  // Room for a 22pt icon plus a full label line, then the home-indicator inset
  // on top, so labels are never clipped and nothing sits under the indicator.
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, 8);

  return (
    <>
      <AnimatedSplashOverlay />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle: {
            backgroundColor: colors.backgroundElement,
            borderTopColor: colors.cardBorder,
            height: 60 + tabBarBottomPadding,
            paddingTop: 6,
            paddingBottom: tabBarBottomPadding,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            lineHeight: 14,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Translator',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'camera' : 'camera-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="dictionary"
          options={{
            title: 'Dictionary',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'book' : 'book-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="converse"
          options={{
            title: 'Converse',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="practice"
          options={{
            title: 'Practice',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'trophy' : 'trophy-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null, // Hide template default screen
          }}
        />
      </Tabs>
    </>
  );
}
