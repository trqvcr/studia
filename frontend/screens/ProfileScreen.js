import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';

const CURRENT_USER = { id: '1', username: 'alice', name: 'Alice' };
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday'];

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
    const sessionDate = new Date(session.start_time);

    if(sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
      const sessionDay = DAYS[sessionDate.getDay()];
      counts[sessionDay] +=1;
    }

  });

  return counts

}

export default function ProfileScreen() {
  const [weeklyCounts, setWeeklyCounts] = useState({});
  const [weekLabel, setWeekLabel] = useState('');
  const [loading, setLoading] = useState('true');

  useEffect( () => {
    loadWeeklySessions();
  }, []);

  async function loadWeeklySessions() {
    try {
      const { startOfWeek, endOfWeek } = getWeekRange();
      setWeekLabel(`${formatShortDate(startOfWeek)} - ${formatShortDate(endOfWeek)}`);
      //get sessions of current user
      const response = await fetch(`${API_URL}/sessions/${CURRENT_USER.id}`);
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
  
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color="#4A90D9" />
      </SafeAreaView>
    );
  }
return (
  <View style={styles.container}>
    <View style={styles.profileCard}>
      <Text style={styles.profileTitle}>{CURRENT_USER.name}'s Profile</Text>
      <Text style={styles.profileSubtitle}>Weekly Study Sessions</Text>
    </View>

    <View style={styles.weekCard}>
      <Text style={styles.weekTitle}>This Week</Text>
      <TouchableOpacity
      style={styles.refreshBtn}
      onPress={loadWeeklySessions}
    >
      <Text style={styles.refreshBtnText}>Refresh</Text>
    </TouchableOpacity>

      {DAYS.map((day) => (
        <View key={day} style={styles.dayRow}>
          <Text style={styles.dayText}>{day}</Text>
          <Text style={styles.countText}>
            {weeklyCounts[day] || 0} sessions
          </Text>
        </View>
      ))}
    </View>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F8',
    padding: 16,
  },

  profileCard: {
    backgroundColor: '#1A1F36',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  profileTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },

  profileSubtitle: {
    color: '#8892B0',
    fontSize: 14,
    marginTop: 6,
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
});
