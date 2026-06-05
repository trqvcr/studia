import { useState } from 'react';
import { Image } from 'react-native';
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
          if (route.name === 'Home') {
            return (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={color}
              />
            );
          }

          if (route.name === 'Friends') {
            return (
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={size}
                color={color}
              />
            );
          }

          if (route.name === 'Profile') {
            if (user?.avatar_url) {
              return (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: focused ? 2.2 : 1.5,
                    borderColor: focused ? '#dcae0a' : '#124e9c',
                  }}
                />
              );
            }

            return (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={size}
                color={color}
              />
            );
          }
        },
          tabBarActiveTintColor: '#124e9c',
          tabBarInactiveTintColor: '#8892B0',
        })}
      >
        <Tab.Screen name="Home">
          {props => <HomeScreen {...props} user={user} token={token} />}
        </Tab.Screen>

        <Tab.Screen name="Friends">
          {props => <FriendsScreen {...props} user={user} token={token} />}
        </Tab.Screen>

        <Tab.Screen name="Profile">
          {props => (
            <ProfileScreen
              {...props}
              user={user}
              token={token}
              onLogout={() => {
                setUser(null);
                setToken(null);
              }}
              onUpdateUser={setUser}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
