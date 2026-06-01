import { useState } from 'react';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import FriendsScreen from './screens/FriendsScreen';
import ProfileScreen from './screens/ProfileScreen';

enableScreens(false);

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  if (!user) {
    return <LoginScreen onLogin={(u, t) => { setUser(u); setToken(t); }} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home' || route.name == "Friends" || route.name == "Profile") {
            iconName = focused
              ? 'information-circle'
              : 'information-circle-outline';
          }

          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      })}
    >
        <Tab.Screen name="Home">{props => <HomeScreen {...props} user={user} token={token} />}</Tab.Screen>
        <Tab.Screen name="Friends">{props => <FriendsScreen {...props} user={user} token={token} />}</Tab.Screen>
        <Tab.Screen name="Profile">{props => <ProfileScreen {...props} user={user} token={token} onLogout={() => { setUser(null); setToken(null); }} />}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
