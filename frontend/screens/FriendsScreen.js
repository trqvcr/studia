import { View, Text, StyleSheet, FlatList } from 'react-native';
import React, {useEffect, useState} from 'react';
import FriendCard from '../components/FriendCard';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const CURRENT_USER_ID = 1;

export default function FriendsScreen() {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const loadFriends = async () => {
      try{
        const data = await fetch(`${API_URL}/friends/${CURRENT_USER_ID}`);
        const friendsList = await data.json();
        setFriends(friendsList.friends);
      }
      catch (err){
        console.error('ERROR: could not fetch list of friends;', err);
      }
    };

    loadFriends();

  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}> 
        <Text style={styles.headerTitle}>My Friends</Text>
      </View>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <FriendCard
            username={item.username}
            name={item.name}
            hoursStudied={item.hoursStudied}
            avatarURL={item.avatarURL}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1},
  header: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
      borderTopColor: '#e5e5e5',
      backgroundColor: '#fff',
      textAlign: 'center'
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#111',
    },
    list: { paddingVertical: 8 },
});
