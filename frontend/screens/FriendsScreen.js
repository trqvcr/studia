import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import FriendCard from '../components/FriendCard';
import FriendProfile from '../components/FriendProfile';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_AVATAR = require('../assets/default-avatar.png');

//while on friends screen, update friends list every five seconds
//and display their profile
export default function FriendsScreen({ user, token }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
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
      setSearching(false);
      return;
    }

    setSearching(true);

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
      } finally {
        setSearching(false);
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
        searchQuery.trim().length > 0 && (
          searchResults.length > 0 ? (
            <View>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => String(item.id)}
                renderItem={({item}) => (
                  <TouchableOpacity onPress={() => openProfile(item)}>
                    <View style={styles.card}>
                      <View style={styles.buffer}>
                        <Image
                          source={item.avatar_url ? { uri: item.avatar_url } : DEFAULT_AVATAR}
                          style={styles.avatar}
                        />
                      </View>
                      <View style={styles.columnText}>
                        <Text style={styles.name}>
                          {item.name} | @{item.username}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : (
            !searching && <Text style={styles.noResults}>No users found</Text>
          )
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
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      marginHorizontal: 10,
      marginTop: 10,
      borderRadius: 15,
    },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 80/2,
    borderWidth: 1.5,
    borderColor: 'dimgray',
  },
  buffer: {
    padding: 8
  },
  columnText: {
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  noResults: {
    textAlign: 'center',
    color: '#8892B0',
    fontSize: 15,
    marginTop: 24,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18
  },
  subtitle: {
    color: 'dimgray',
    fontSize: 14
  }
});
