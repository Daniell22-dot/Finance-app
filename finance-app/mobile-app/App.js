import 'react-native-gesture-handler';
import React, { useState } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import FundsScreen from './screens/FundsScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotificationScreen from './screens/NotificationScreen';

// 2. WEB FONT LOADING
if (Platform.OS === 'web') {
  const iconFontStyles = `@font-face {
    src: url(${require('react-native-vector-icons/Fonts/Ionicons.ttf')});
    font-family: 'Ionicons';
  }`;
  const style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet) style.styleSheet.cssText = iconFontStyles;
  else style.appendChild(document.createTextNode(iconFontStyles));
  document.head.appendChild(style);
}

// 3. COLOR SCHEME
const colors = {
  primary: '#1a1a1a',
  accent: '#FFD700',
  secondary: '#4CAF50',
  white: '#FFFFFF',
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// 4. MAIN TAB NAVIGATION
function MainTabs({ route, navigation }) {
  const userData = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Portfolio') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Projects') iconName = focused ? 'business' : 'business-outline';
          else if (route.name === 'Funds') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { height: 65, paddingBottom: 10, paddingTop: 5, backgroundColor: colors.primary },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => (
          <TouchableOpacity
            style={{ marginLeft: 15 }}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons name="menu" size={28} color={colors.accent} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 15 }}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle" size={28} color={colors.accent} />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} initialParams={userData} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} initialParams={userData} />
      <Tab.Screen name="Projects" component={ProjectsScreen} initialParams={userData} />
      <Tab.Screen name="Funds" component={FundsScreen} initialParams={userData} />
      <Tab.Screen name="Profile" component={ProfileScreen} initialParams={userData} />
    </Tab.Navigator>
  );
}

// 4.5 DRAWER NAVIGATION
function DrawerNavigator({ route }) {
  const userData = route.params || {};
  return (
    <Drawer.Navigator
      useLegacyImplementation={false}
      screenOptions={{
        drawerStyle: { backgroundColor: colors.primary, width: 250 },
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.white,
        headerShown: false,
      }}
    >
      <Drawer.Screen
        name="MainTabsMenu"
        component={MainTabs}
        initialParams={userData}
        options={{ title: 'Home', drawerIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="ProfileMenu"
        component={ProfileScreen}
        initialParams={userData}
        options={{ title: 'My Profile', drawerIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="SettingsMenu"
        component={ProfileScreen} // Use Profile for now as it has settings placeholders
        initialParams={userData}
        options={{ title: 'Settings', drawerIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }}
      />
    </Drawer.Navigator>
  );
}

// 5. ROOT STACK
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          // Auth Flow
          <>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} setUserData={setUserData} />}
            </Stack.Screen>
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: true,
                title: 'Create Account',
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: colors.white
              }}
            />
            <Stack.Screen
              name="VerifyEmail"
              component={VerifyEmailScreen}
              options={{
                headerShown: true,
                title: 'Verify Account',
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: colors.white
              }}
            />
          </>
        ) : (
          // Authenticated App Flow
          <>
            <Stack.Screen
              name="MainDrawer"
              component={DrawerNavigator}
              initialParams={userData} // Pass the whole object (user + access_token)
            />
            {/* Notifications is here so it can slide in from the right over any tab */}
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{
                headerShown: true,
                title: 'Notifications',
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: colors.accent
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}