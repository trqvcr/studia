import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_BAR_HEIGHT = 100;

function WeeklyBarChart({ weeklyCounts }) {
  const values = DAYS.map(d => weeklyCounts[d] || 0);
  const maxVal = Math.max(...values, 1);
  const todayIndex = new Date().getDay();

  return (
    <View style={chartStyles.container}>
      {DAYS.map((day, i) => {
        const val = values[i];
        const barHeight = Math.max((val / maxVal) * MAX_BAR_HEIGHT, 2);
        const isToday = i === todayIndex;
        return (
          <View key={day} style={chartStyles.barWrapper}>
            <Text style={chartStyles.durationLabel}>
              {val > 0 ? formatDuration(val) : ''}
            </Text>
            <View style={chartStyles.barTrack}>
              <View style={[
                chartStyles.bar,
                { height: barHeight },
                isToday ? chartStyles.barToday : chartStyles.barDefault,
              ]} />
            </View>
            <Text style={[chartStyles.dayLabel, isToday && chartStyles.dayLabelToday]}>
              {SHORT_DAYS[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingBottom: 4,
    height: 160,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '60%',
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: '#EEF1F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barDefault: { backgroundColor: '#4A90D9' },
  barToday:   { backgroundColor: '#1A1F36' },
  durationLabel: {
    fontSize: 8,
    color: '#8892B0',
    marginBottom: 2,
    textAlign: 'center',
  },
  dayLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#8892B0',
  },
  dayLabelToday: { color: '#4A90D9' },
});

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
  const [newAcceptances, setNewAcceptances] = useState([]);
  const [acceptancesVisible, setAcceptancesVisible] = useState(false);
  const seenAcceptances = useRef(new Set());

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

  async function loadAcceptances() {
    try {
      const data = await fetch(`${API_URL}/friends/acceptances`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await data.json();
      if (!data.ok) return;
      const unseen = (result.acceptances || []).filter(u => !seenAcceptances.current.has(u.id));
      setNewAcceptances(unseen);
    } catch (err) {
      console.error('ERROR: could not load acceptances', err);
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
    loadAcceptances();
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

  async function removeAvatar() {
    setIsUpdating(true);
    try {
      const data = await fetch(`${API_URL}/auth/avatar`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await data.json();
      if (!data.ok) throw new Error('Remove avatar failed');
      onUpdateUser(result.user);
      setPreviewURI(null);
    } catch(err) {
      console.error('Remove avatar error:', err);
      Alert.alert('Error', 'Could not remove photo');
    } finally {
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
  <ScrollView>

    <TouchableOpacity style={styles.notificationCard} onPress={() => setFriendRequestsVisible(true)}>
      <Text style={styles.notificationText}>🔔 Friend Requests</Text>
      {friendRequests.length > 0
        ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{friendRequests.length}</Text></View>
        : <Text style={styles.notificationTextMuted}>None</Text>
      }
    </TouchableOpacity>

    {newAcceptances.length > 0 && (
      <TouchableOpacity style={[styles.notificationCard, styles.notificationCardGreen]} onPress={() => setAcceptancesVisible(true)}>
        <Text style={styles.notificationText}>✅ Accepted Your Request</Text>
        <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{newAcceptances.length}</Text></View>
      </TouchableOpacity>
    )}

    <View style={styles.profileCard}>

      <Image style={styles.avatar} source={getAvatarSource()} />

      <View style={styles.profileInfo}>

        <Text style={styles.profileName} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.profileUsername} numberOfLines={1}>@{user.username}</Text>

        <View style={styles.stats}>
          <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
            <Text style={styles.stat}>{friendCount} {friendCount === 1 ? "Friend" : "Friends"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={startEdit}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

      </View>
      
      
    </View>

    <View style={styles.weekCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.weekTitle}>This Week ({weekLabel})</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadWeeklySessions}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <WeeklyBarChart weeklyCounts={weeklyCounts} />

      <View style={{ borderTopWidth: 1, borderTopColor: '#EEF1F6', marginTop: 8 }}>
        {DAYS.map((day) => {
          const isToday = day === DAYS[new Date().getDay()];
          return (
            <View key={day} style={[styles.dayRow, isToday && styles.dayRowToday]}>
              <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{day}</Text>
              <Text style={styles.countText}>
                {formatDuration(weeklyCounts[day]) || '0s'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>

    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
      <Text style={styles.logoutBtnText}>Log out</Text>
    </TouchableOpacity>

  </ScrollView>

    <Modal
      animationType='slide'
      onRequestClose={cancelEdit}
      transparent
      visible={editProfileVisible}
    >
      <View style={styles.modalBackground}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalCard}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.modalHeader}>Update Profile</Text>

          <View style={styles.modalAvatarCard}>
            <Image source={getAvatarSource()} style={styles.modalAvatar}/>
            <TouchableOpacity
              style={styles.modalAvatarButton}
              onPress={uploadAvatarImage}
              disabled={isUpdating}
            >
              <Text style={styles.modalAvatarButtonText}>{isUpdating ? 'Uploading...' : 'Update Image'}</Text>
            </TouchableOpacity>
            {(user.avatar_url || previewURI) && (
              <TouchableOpacity
                style={styles.removeAvatarButton}
                onPress={removeAvatar}
                disabled={isUpdating}
              >
                <Text style={styles.removeAvatarButtonText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
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
              style={styles.cancelButton}
              onPress={cancelEdit}
              disabled={isUpdating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveEdit}
              disabled={isUpdating}
            >
              {isUpdating ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>

          </ScrollView>
        </KeyboardAvoidingView>
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
                  <View style={{ paddingHorizontal: 12, flex: 1 }}>
                    <Text style={styles.friendRequestName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.profileUsername} numberOfLines={1}>@{item.username}</Text>
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

    <Modal
      animationType='slide'
      transparent
      visible={acceptancesVisible}
      onRequestClose={() => setAcceptancesVisible(false)}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalCard}>
          <Text style={styles.modalHeader}>New Friends</Text>
          <FlatList
            data={newAcceptances}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.profileCardFriend}>
                <Text style={styles.friendRequestName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.profileUsername} numberOfLines={1}>@{item.username}</Text>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              newAcceptances.forEach(u => seenAcceptances.current.add(u.id));
              setNewAcceptances([]);
              setAcceptancesVisible(false);
            }}
          >
            <Text style={styles.closeButtonText}>Done</Text>
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
    paddingTop: 16,
  },

  notificationCard: {
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationCardGreen: {
    backgroundColor: '#EAFAF1',
    marginTop: 0,
    marginBottom: 16,
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
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    flexShrink: 1,
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
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#E0E4EF',
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
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-end',
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 20,
  },

  modalAvatarCard:{
    alignItems: 'center',
    margin: 32,
  },

  modalAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#E0E4EF',
  },

  modalAvatarButton: {
    marginTop: 10,
    backgroundColor: '#F2F4F8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E4EF',
  },

  modalAvatarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
  },

  removeAvatarButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },

  removeAvatarButtonText: {
    fontSize: 13,
    color: '#E05252',
    fontWeight: '600',
  },

  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F36',
    marginTop: 16,
    marginBottom: 6,
  },

  modalInput: {
    borderColor: '#E0E4EF',
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 15,
    color: '#1A1F36',
    backgroundColor: '#F8F9FC',
    padding: 10,
    marginBottom: 4,
  },

  modalButton: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: '#F2F4F8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#1A1F36',
    fontSize: 15,
    fontWeight: '600',
  },

  saveButton: {
    flex: 1,
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
