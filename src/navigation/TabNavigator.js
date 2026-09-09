import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import PersonalLoansScreen from '../screens/PersonalLoansScreen';
import VasuliDashboardScreen from '../screens/VasuliDashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors, gradients } from '../constants/colors';

const Tab = createBottomTabNavigator();

function TabIcon({ icon, label, focused }) {
  return (
    <View style={styles.tabItem}>
      {focused ? (
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.22)', 'rgba(6, 182, 212, 0.12)']}
          style={styles.activePill}
        >
          <Ionicons name={icon} size={20} color={colors.primaryStart} />
          <Text style={styles.activeLabel} numberOfLines={1}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.inactivePill}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
          <Text style={styles.inactiveLabel} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: Math.max(76, 68 + insets.bottom),
            paddingBottom: Math.max(12, insets.bottom),
            paddingTop: 8,
          },
        ],
      }}
    >
      <Tab.Screen
        name="GroupsTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={focused ? "people" : "people-outline"} label="Groups" />,
        }}
      />
      <Tab.Screen
        name="VasuliTab"
        component={VasuliDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={focused ? "flash" : "flash-outline"} label="Vasuli" />,
        }}
      />
      <Tab.Screen
        name="PersonalTab"
        component={PersonalLoansScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={focused ? "wallet" : "wallet-outline"} label="Personal" />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={focused ? "settings" : "settings-outline"} label="Settings" />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    maxWidth: 680,
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 15, 25, 0.94)',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 28,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      },
    }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
  },
  inactivePill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  inactiveLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
});
