import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import FriendCard from '../components/FriendCard';
import FriendProfile from '../components/FriendProfile';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_AVATAR = require('../assets/default-avatar.png');

export default function FriendsScreen({ user, token }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userSelected, setUserSelected] = useState(null);
  const debounceRef = useRef(null); 

  useFocusEffect(useCallback(() => {
    loadFriends();
  }, []));

  async function loadFriends(){
    try{
      const data = await fetch(`${API_URL}/friends/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const friendsList = await data.json();
      setFriends(friendsList.friends || []);
    }
    catch (err){
      console.error('ERROR: could not fetch list of friends;', err);
    }
  }

  function duringSearch(text){
    setSearchQuery(text);
    if(!text.trim()){
      setSearchResults([]);
      return;
    }

    if(debounceRef.current){ 
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try{
        const data = await fetch(`${API_URL}/friends/search?username=${encodeURIComponent(text)}`, {
          headers: {'Authorization': `Bearer ${token}`}
        });
        const searchResult = await data.json();
        setSearchResults((searchResult.users || []).filter(u => u.id !== user.id));
      }
      catch(err){
        console.error('ERROR: search users error', err);
      }
    }, 500);
  }

  function openProfile(friend){
    setUserSelected(friend);
    setSearchQuery('');
    setSearchResults([]);
  }

  if(userSelected){
    return (
      <FriendProfile 
        user={user}
        friend={userSelected}
        token={token}
        exitProfile={() => setUserSelected(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}> 
        <TextInput 
          style={styles.headerTitle}
          placeholder='⌕ Find Friends by Username'
          value={searchQuery}
          onChangeText={duringSearch}
        />
      </View>

      {
        searchResults.length > 0 && (
          <View>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={({item}) => (
                <TouchableOpacity onPress={() => openProfile(item)}>
                  <Image source={item.avatar_url ? { uri: item.avatar_url } : DEFAULT_AVATAR} style={styles.avatar}/>
                  <View>
                    <Text>{item.name}</Text>
                    <Text>@{item.username}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )
      }

      <FlatList
        data={friends}
        keyExtractor={(item) => String(item.id)}
        renderItem={({item}) => (
          <FriendCard
            username={item.username}
            name={item.name}
            hoursStudied={item.hoursStudied}
            avatarURL={item.avatar_url}
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
      fontSize: 16,
      fontWeight: '500',
      color: 'dimgray',
      borderColor: 'dimgray',
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    list: { paddingVertical: 8 },
    avatar: {
    width: 80,
    height: 80,
    borderRadius: 80/2,
    borderWidth: 1.5,
    borderColor: 'dimgray',
  },
});
