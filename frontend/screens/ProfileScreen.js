import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_AVATAR = require('../assets/default-avatar.png');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday', 'Saturday'];

//calculate range for current Week
function getWeekRange() {
  const today = new Date();

  const startOfWeek = new Date(today);
  //get's day of access and subtracts by numerical value to set start of week to sunday
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999)

  return { startOfWeek, endOfWeek };

}

//return the xx/xx format of month/day
function formatShortDate(date) {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
  });
}

function countSessions(sessions, startOfWeek, endOfWeek) {

  const counts = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0
  };

  //for every session within startOfWeek-endOfWeek, increase it's corresponding day by 1
  sessions.forEach( (session) => {
    const sessionDate = new Date(session.startTime);

    if(sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
      const sessionDay = DAYS[sessionDate.getDay()];
      counts[sessionDay] += session.duration;
    }

  });

  return counts

}

//helper for formatting session duration
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return 'In progress...';

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;


  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }

  return `${secs}s`;
}


export default function ProfileScreen({ user, token, onLogout, navigation, onUpdateUser }) {
  const [weeklyCounts, setWeeklyCounts] = useState({});
  const [weekLabel, setWeekLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editUsername, setEditUsername] = useState(user.username);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewURI, setPreviewURI] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendRequestsVisible, setFriendRequestsVisible] = useState(false);

  async function loadFriendRequests() {
    try{
      const data = await fetch(`${API_URL}/friends/requests`, {
        headers: {'Authorization': `Bearer ${token}`,}
      });
      const requests = await data.json();
      if(!data.ok) return;
      setFriendRequests(requests.requests || []);
    }
    catch(err){
      console.log('ERROR: unable to load friend requests');
    }
  }

  async function acceptRequest(friendId){
    try{
      const data = await fetch(`${API_URL}/friends/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({friendId})
      });
      if(!data.ok) throw new Error('Could not accepted friend request');
      setFriendRequests(prev => prev.filter(r => r.id !== friendId));
      setFriendCount(prev => prev + 1);
    }
    catch(err){
      console.log('ERROR: could not accept friend request');
      Alert.alert('server error', 'could not reach server');
    }
  }

  async function declineRequest(friendId){
    try{
      const data = await fetch(`${API_URL}/friends/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({friendId})
      });
      if(!data.ok) throw new Error('Could not decline friend request');
      setFriendRequests(prev => prev.filter(r => r.id !== friendId));
    }
    catch(err){
      console.log('ERROR: could not decline friend request');
      Alert.alert('server error', 'could not reach server');
    }
  }


  function getAvatarSource() {
    if(previewURI) 
      return {uri: previewURI};
    if(user.avatar_url) 
      return {uri: user.avatar_url};
    return DEFAULT_AVATAR;
  }

  function startEdit(){
    setEditName(user.name);
    setEditUsername(user.username);
    setEditProfileVisible(true);
  }

  function cancelEdit(){
    setEditProfileVisible(false);
  }

  async function saveEdit(){
    const name = editName.trim();
    const username = editUsername.trim();

    if(!name || !username){
      Alert.alert('Missing fields', 'Name and Username cannot be empty');
      return;
    }

    if(name === user.name && username === user.username){ // no changes made
      setEditProfileVisible(false);
      return;
    }

    setIsUpdating(true);
    try{
      const data = await fetch(`${API_URL}/auth/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({name, username})
      });
      const update = await data.json();

      if(!data.ok){
        Alert.alert('Unable to save', update.error || 'Something went wrong.');
        return;
      }

      onUpdateUser(update.user);
      setEditProfileVisible(false);
    }
    catch(err){
      console.log('ERROR: could not save name/username update');
      Alert.alert('server error', 'could not reach server');
    }
    finally {
      setIsUpdating(false);
    }
  }

  useEffect( () => {
    loadWeeklySessions();
    loadFriendCount();
    loadFriendRequests();
  }, []);

  async function loadWeeklySessions() {
    try {
      const { startOfWeek, endOfWeek } = getWeekRange();
      setWeekLabel(`${formatShortDate(startOfWeek)} - ${formatShortDate(endOfWeek)}`);
      //get sessions of current user
      const response = await fetch(`${API_URL}/sessions/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log("status:", response.status);

      const data = await response.json();
      console.log("data:", data);

      if(!response.ok) {
        Alert.alert('Error', data.error || "Can't get session counts");
        return;
      }

      //get session data for the user and pass into weeklyCounts
      const counts = countSessions(data.sessions || [], startOfWeek, endOfWeek);
      setWeeklyCounts(counts);
    } catch(err) {
      console.log("error in session count: ", err);
      Alert.alert("server error", "could not reach server");
    } finally {
      setLoading(false);
    }
  }

  async function loadFriendCount(){
    try{
      const data = await fetch(`${API_URL}/friends/${user.id}`, {
        headers: {'Authorization': `Bearer ${token}`},
      });
      const friendships = await data.json();
      if(!data.ok)
        return;
      setFriendCount((friendships.friends || []).length);
    }
    catch(err){
      console.log('ERROR: could not load friend count;', err);
      Alert.alert('friend count error', 'could not fetch friends from server');
    }
  }

  async function uploadAvatarImage(){
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permissionResult.granted){
      Alert.alert('Permission needed', 'Permission to access the photo library is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1,1],
      quality: 0.5,
    });
    if(result.canceled) return;

    const localURI = result.assets[0].uri;
    setPreviewURI(localURI);
    setIsUpdating(true);

    try{
      const formData = new FormData();
      formData.append('avatarImage', {
        uri: localURI,
        name: 'avatar.jpg',
        type: 'image/jpg',
      });

      const data = await fetch(`${API_URL}/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const imageUpload = await data.json();
      if(!data.ok) throw new Error('Image upload failed');

      onUpdateUser(imageUpload.user);
      setPreviewURI(null);
    }
    catch(err){
      console.log('ERROR: profile avatar upload error', err);
      Alert.alert('Image upload failed', 'could not upload image');
      setPreviewURI(null);
    }
    finally{
      setIsUpdating(false);
    }
  }
    
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color="#4A90D9" />
      </SafeAreaView>
    );
  }
return (
  <View style={styles.container}>

    <TouchableOpacity style={styles.notificationCard} onPress={() => setFriendRequestsVisible(true)}>
      <Text style={styles.notificationText}>🔔 Friend Requests</Text>
      {friendRequests.length > 0
        ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{friendRequests.length}</Text></View>
        : <Text style={styles.notificationTextMuted}>None</Text>
      }
    </TouchableOpacity>

    <View style={styles.profileCard}>

      <Image style={styles.avatar} source={getAvatarSource()} />

      <View style={styles.profileInfo}>

        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileUsername}>@{user.username}</Text>

        <View style={styles.stats}>
          <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
            <Text style={styles.stat}>{friendCount} {friendCount === 1 ? "Friend" : "Friends"}</Text>
          </TouchableOpacity>
        </View>

      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={startEdit}
      >
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>
      
      
    </View>

    <View style={styles.weekCard}>
      <Text style={styles.weekTitle}>This Week ({weekLabel}) </Text>
      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={loadWeeklySessions}
      >
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </TouchableOpacity>

      {DAYS.map((day) => {
        const isToday = day === DAYS[new Date().getDay()];
        return (
          <View key={day} style={[styles.dayRow, isToday && styles.dayRowToday]}>
            <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{day}</Text>
            <Text style={styles.countText}>
              Time studied: {formatDuration(weeklyCounts[day]) || 0}
            </Text>
          </View>
        );
      })}
    </View>

    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
      <Text style={styles.logoutBtnText}>Log out</Text>
    </TouchableOpacity>

    <Modal
      animationType='slide'
      onRequestClose={cancelEdit}
      transparent
      visible={editProfileVisible}
    >
      <View style={styles.modalBackground}>

        <View style={styles.modalCard}>

          <Text style={styles.modalHeader}>Update Profile</Text>

          <View style={styles.modalAvatarCard}>
            <Image source={getAvatarSource()} style={styles.modalAvatar}/>
            <TouchableOpacity 
              onPress={uploadAvatarImage} 
              disabled={isUpdating}
            >
              {isUpdating ? 
                <Text style={styles.modalAvatarButton}>Uploading...</Text> :
                <Text style={styles.modalAvatarButton}>Update Image</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput 
            style={styles.modalInput}
            value={editName}
            onChangeText={setEditName}
          />

          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.modalInput}
            value={editUsername}
            onChangeText={setEditUsername}
          />

          <View style={styles.modalButton}>
            <TouchableOpacity
              onPress={cancelEdit}
              disabled={isUpdating}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={saveEdit}
              disabled={isUpdating}
            >
              {isUpdating ? <ActivityIndicator/> : <Text style={styles.modalButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>

        </View>

      </View>
    </Modal>

    <Modal
      animationType='slide'
      onRequestClose={() => setFriendRequestsVisible(false)}
      transparent
      visible={friendRequestsVisible}
    >
      <View style={styles.modalBackground}>

        <View style={styles.modalCard}>

          <Text style={styles.modalHeader}>Friend Requests</Text>

          <FlatList
            data={friendRequests}
            keyExtractor={(item) => String(item.id)}
            renderItem={({item}) => (
              <View style={styles.profileCardFriend}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={item.avatar_url ? { uri: item.avatar_url } : DEFAULT_AVATAR} style={styles.avatar} />
                  <View style={{ paddingHorizontal: 12 }}>
                    <Text style={styles.friendRequestName}>{item.name}</Text>
                    <Text style={styles.profileUsername}>@{item.username}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => acceptRequest(item.id)}>
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineButton} onPress={() => declineRequest(item.id)}>
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No pending friend requests</Text>}
          />

          <TouchableOpacity style={styles.closeButton} onPress={() => setFriendRequestsVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>

        </View>

      </View>
    </Modal>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F8',
    padding: 16,
  },

  notificationCard: {
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  notificationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F36',
  },

  notificationTextMuted: {
    fontSize: 14,
    color: '#8892B0',
  },

  notificationBadge: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },

  notificationBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  profileCard: {
    backgroundColor: '#1A1F36',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileCardFriend: {
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E4EF',
  },

  friendRequestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
  },

  acceptButton: {
    flex: 1,
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },

  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  declineButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E05252',
  },

  declineButtonText: {
    color: '#E05252',
    fontWeight: '700',
    fontSize: 14,
  },

  emptyText: {
    textAlign: 'center',
    color: '#8892B0',
    fontSize: 15,
    marginVertical: 24,
  },

  closeButton: {
    backgroundColor: '#F2F4F8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  closeButtonText: {
    color: '#1A1F36',
    fontWeight: '600',
    fontSize: 15,
  },

  profileInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },

  profileName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
  },

  profileUsername: {
    color: '#8892B0',
    fontSize: 14,
    marginTop: 6,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 80/2,
    borderWidth: 1.5,
    borderColor: 'dimgray',
  },

  stats: {
    flexDirection: 'row',
  },

  stat: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
    fontSize: 14,
    color: '#8892B0'
  },

  button: {
    backgroundColor: '#8892B0',
    borderRadius: 6,
    alignSelf: 'flex-end',
  },

  buttonText: {
    color: 'white',
    fontSize: 12,
    padding: 5,
  },

  modalBackground: {
    backgroundColor: '#8892B095',
    flex: 1,
  },

  modalCard: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 80,
  },

  modalHeader: {
    alignSelf: 'center',
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 20,
  },

  modalAvatarCard:{
    alignItems: 'center',
    margin: 32,
  },

  modalAvatar: {
    width: 140,
    height: 140,
    borderRadius: 140/2,
    borderWidth: 2,
    borderColor: 'dimgray',
  },

  modalAvatarButton: {
    fontSize: 14, 
    padding: 4,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 8,
    margin: 8,
    backgroundColor: '#e3dfde',
  },

  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'black',
    marginTop: 16,
    marginBottom: 2,
    width: '95%',
  },

  modalInput: {
    borderColor: 'dimgray',
    borderWidth: 1.5,
    fontSize: 16,
    fontWeight: '500',
    color: 'dimgray',
    backgroundColor: 'white',
    marginBottom: 4,
    padding: 8,
  },

  modalButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 32,
  },

  modalButtonText: {
    backgroundColor: '#8892B0',
    borderRadius: 8,
    borderColor: 'dimgray',
    borderWidth: 2,
    padding: 6,
    marginHorizontal: 32,
    marginVertical: 8,
    fontSize: 14,
  },

  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },

  weekTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 10,
  },

  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },

  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F36',
  },

  dayRowToday: {
    backgroundColor: '#EAF4FF',
    borderRadius: 8,
    paddingHorizontal: 8,
  },

  dayTextToday: {
    color: '#4A90D9',
    fontWeight: '700',
  },

  countText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A90D9',
  },
  refreshBtn: {
  backgroundColor: '#4A90D9',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  },

  refreshBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  logoutBtn: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E05252',
  },

  logoutBtnText: {
    color: '#E05252',
    fontSize: 16,
    fontWeight: '700',
  },
});
