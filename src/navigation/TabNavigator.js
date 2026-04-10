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
  if (focused) {
    return (
      <LinearGradient colors={gradients.primary} style={styles.activeTab}>
        <Ionicons name={icon} size={18} color={colors.textPrimary} />
        <Text style={styles.activeLabel}>{label}</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.inactiveTab}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.inactiveLabel}>{label}</Text>
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
            height: Math.max(72, 64 + insets.bottom),
            paddingBottom: Math.max(12, insets.bottom),
            paddingTop: Platform.OS === 'web' ? 10 : 8,
          },
        ],
      }}
    >
      <Tab.Screen
        name="GroupsTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="home" label="Groups" />,
        }}
      />
      <Tab.Screen
        name="VasuliTab"
        component={VasuliDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="wallet" label="Vasuli" />,
        }}
      />
      <Tab.Screen
        name="PersonalTab"
        component={PersonalLoansScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="person" label="Personal" />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="settings" label="Settings" />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 84,
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: 'rgba(11,14,30,0.92)',
    borderTopWidth: 0,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
  },
  activeTab: {
    minWidth: 98,
    height: 44,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  activeLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: 8,
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },
});
