import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

function formatDate(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(isoString) {
  if (!isoString) return '';

  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLiveTime(ms) {

  const validMs = Math.max(0, ms || 0);

  //get total seconds from ms
  const totalSeconds = Math.floor(validMs/1000);
  //get hours (3600 sec in 1 hour)
  const hours = Math.floor(totalSeconds/3600);
  //get leftover seconds after getting hours, then use to get minutes
  const minutes = Math.floor((totalSeconds%3600) / 60);
  //get total seconds from calculating values after all minutes are extracted
  const seconds = Math.floor(totalSeconds%60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


function SessionCard({ session, editMode, onDelete }) {
  const isActive = session.active;

  return (
    <View style={[styles.sessionCard, isActive && styles.sessionCardActive]}>
      <View style={styles.sessionCardRow}>
        <Text style={styles.sessionSubject}>{session.subject}</Text>

        {editMode && !isActive ? (
          <TouchableOpacity style={styles.pillRemove} onPress={() => onDelete(session.id)}>
            <Text style={styles.pillRemoveText}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.sessionDuration, isActive && styles.sessionDurationActive]}>
            {isActive ? '🟢 Live' : `Duration: ${formatDuration(session.duration)}`}
          </Text>
        )}
      </View>

      <Text style={styles.sessionDate}>
        Started {formatDate(session.startTime)}
      </Text>

      {!isActive && session.endTime && (
        <Text style={styles.sessionDate}>
          Ended {formatDate(session.endTime)}
        </Text>
      )}

      {!isActive && session.notes ? (
        <View style={styles.sessionNotesBox}>
          <Text style={styles.sessionNotesLabel}>Notes</Text>
          <Text style={styles.sessionNotesText}>{session.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function HomeScreen({ user, token }) {
  //session states
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);

  //edit mode for deleting sessions
  const [editMode, setEditMode] = useState(false);

  //session ending/note adding states
  const [showEndNotes, setShowEndNotes] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [pendingNoteInputTime, setPendingNoteInputTime] = useState(null);

  //when user wants to discard a session
  const [discardSession, setDiscardSession] = useState(false);

  //paused time(when in notes state)
  const [totalPausedMs, setTotalPausedMs] = useState(0);

  //subject states
  const [showClassPicker, setShowClassPicker] = useState(false);

  //class states
  const [classes, setClasses] = useState([]);
  const [classInput, setClassInput] = useState('');
  const [editingClasses, setEditingClasses] = useState(false);

  //live timer
  const [liveElapsedTime, setLiveElapsedTime] = useState(null);

  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      const res = await fetch(`${API_URL}/profile/classes`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setClasses(data.classes || []);
    } catch (err) {
      console.error('Fetch classes error:', err);
    }
  }

  async function saveClasses(updated) {
    try {
      await fetch(`${API_URL}/profile/classes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ classes: updated }),
      });
    } catch (err) {
      console.error('Save classes error:', err);
    }
  }

  //live timer when a session is active
  useEffect(() => {
    //if no session active, set time to 0
    if(!activeSession) {
      setLiveElapsedTime(0);
      return;
    }

    if(pendingNoteInputTime) {
      setLiveElapsedTime(
      new Date(pendingNoteInputTime).getTime() -
      new Date(activeSession.startTime).getTime() -
      totalPausedMs);
      return;
    }

    //every second, update liveElapsedTime
    console.log('activeSession:', JSON.stringify(activeSession));
    const intervalId = setInterval(() => {
    const elapsed = Date.now() - new Date(activeSession.startTime).getTime() - totalPausedMs;
      setLiveElapsedTime(elapsed);
    }, 1000);

    // when time stops, clear our interval
    return () => clearInterval(intervalId);

  }, [activeSession, pendingNoteInputTime]);

  async function fetchSessions() {
    try {
      const response = await fetch(`${API_URL}/sessions/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Could not fetch sessions');
        return;
      }

      const sortedSessions = (data.sessions || []).sort((a, b) => {
        return new Date(b.startTime) - new Date(a.startTime);
      });

      setSessions(sortedSessions);
      setActiveSession(sortedSessions.find(session => session.active) || null);
    } catch (err) {
      console.error('Fetch sessions error:', err);
      Alert.alert(
        'Connection error',
        'Could not reach the server. Make sure your backend is running and API_URL is correct.'
      );
    } finally {
      setLoading(false);
    }
  }

  //when user starts a session, send notice to backend and prepare for 
  //entering new phase 
  async function handleStartSession(subject) {
    setShowClassPicker(false);
    setSessionLoading(true);

    try {
      const response = await fetch(`${API_URL}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subject }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Could not start session', data.error || 'Something went wrong');
        return;
      }

      setShowEndNotes(false);
      setSessionNotes('');
      setPendingNoteInputTime(null);
      setTotalPausedMs(0);
      setLiveElapsedTime(0);

      await fetchSessions();
    } catch (err) {
      console.error('Start session error:', err);
      Alert.alert('Connection error', 'Could not reach the server.');
    } finally {
      setSessionLoading(false);
    }
  }

  //when user stops a session revert states to prepare for a new session
  async function handleStopSession() {
    setSessionLoading(true);

    console.log("sessionNotes before sav:", sessionNotes);
    console.log("notes sent to db:", sessionNotes.trim() || null);

    try {
      const response = await fetch(`${API_URL}/sessions/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: sessionNotes.trim() || null,
          endTime: pendingNoteInputTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Could not stop session', data.error || 'Something went wrong');
        return;
      }

      setShowEndNotes(false);
      setSessionNotes('');
      setPendingNoteInputTime(null);
      setTotalPausedMs(0);

      await fetchSessions();
    } catch (err) {
      console.error('Stop session error:', err);
      Alert.alert('Connection error', 'Could not reach the server.');
    } finally {
      setSessionLoading(false);
    }
  }

  //helper for when user enters "note input" phase
  function handleStartNote() {
    if (!activeSession) return;

    
    const endTime = new Date().toISOString();

    setPendingNoteInputTime(endTime);
    setLiveElapsedTime(new Date(endTime) - new Date(activeSession.startTime));
    setShowEndNotes(true);
  }

  async function handleDeleteSession(sessionId) {
    try {
      await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchSessions();
    } catch (err) {
      console.error('Delete session error:', err);
    }
  }

  function handleAddClass() {
    const trimmed = classInput.trim();

    if (!trimmed) return;

    if (classes.includes(trimmed)) {
      Alert.alert('Already added', `${trimmed} is already in your list.`);
      return;
    }

    const updated = [...classes, trimmed];
    setClasses(updated);
    setClassInput('');
    saveClasses(updated);
  }

  function handleRemoveClass(cls) {
    const updated = classes.filter(c => c !== cls);
    setClasses(updated);
    saveClasses(updated);
  }

  //helper for when a user ends session, then resumes it
  function handleCancelNotes() {
    if (pendingNoteInputTime) {
      const pausedMs = Date.now() - new Date(pendingNoteInputTime).getTime();
      setTotalPausedMs(prev => prev + Math.max(0,pausedMs));
    }

    setShowEndNotes(false);
    setSessionNotes('');
    setPendingNoteInputTime(null);
  }

  //helper for user inputting notes after ending a session
  function handleNoteInput() {
    return(
      <>
        <Text style = {styles.notesLabel}>Session Notes</Text>

        <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Recommended: What did you study?"
            placeholderTextColor="#aaa"
            value={sessionNotes}
            onChangeText={setSessionNotes}
            maxLength={150}
            multiline
            textAlignVertical="top"
        />

        <Text style = {styles.notesCounter}>
          Char count: {sessionNotes.length}/150
        </Text>
      </>

    );
  }

  //handles when a user is in input phase and has option to cancel(resume session) or save session w/ optional notes
  function handleEndSessionChoices() {
    return(
    <>
      <View style = {styles.row}>
            <TouchableOpacity
              style={[styles.sessionBtn, styles.sessionBtnStop, { flex: 1, marginRight: 8}]}
              onPress={handleStopSession}
              disabled={sessionLoading}
            >
              {sessionLoading ? 
              (<ActivityIndicator color="#fff" />)
               : 
              (<Text style={styles.sessionBtnText}>Save Session</Text>)}
            </TouchableOpacity>

            <TouchableOpacity
               style={[styles.sessionBtn, styles.sessionBtnCancel, { flex: 1 }]}
               onPress={handleCancelNotes}
               disabled={sessionLoading}
            >
              <Text style={styles.sessionBtnText}>Cancel</Text>
            </TouchableOpacity>
      </View>    
    </>
    );
  }

  async function handleCancelSession() {
    setSessionLoading(true);

    console.log("sessionNotes before sav:", sessionNotes);
    console.log("notes sent to db:", sessionNotes.trim() || null);

    try {
      const response = await fetch(`${API_URL}/sessions/${activeSession.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          canceled: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Could not stop session', data.error || 'Something went wrong');
        return;
      }

      setShowEndNotes(false);
      setSessionNotes('');
      setPendingNoteInputTime(null);
      setTotalPausedMs(0);
      setLiveElapsedTime(0);

      await fetchSessions();
    } catch (err) {
      console.error('Stop session error:', err);
      Alert.alert('Connection error', 'Could not reach the server.');
    } finally {
      setSessionLoading(false);
    }
  }

  //if user isn't in note phase, just show end button under session so that they can enter it
  function showCancelSessionButton() {
    return (
      <TouchableOpacity
        style={[styles.sessionBtn, styles.sessionBtnCancel]}
        onPress={handleCancelSession}
        disabled={sessionLoading}
      >
        <Text style={styles.sessionBtnText}>Discard Session</Text>
      </TouchableOpacity>
    );
  }



  function showEndSessionButton() {
    return (
      <TouchableOpacity
        style={[styles.sessionBtn, styles.sessionBtnStop]}
        onPress={handleStartNote}
        disabled={sessionLoading}
      >
        <Text style={styles.sessionBtnText}>End Session</Text>
      </TouchableOpacity>
    );
  }

  function handleEndSessionWithNotes() {
    if(!showEndNotes) {
    return(
      <View style = {styles.endSessionStack}>
        {showEndSessionButton()}
        {showCancelSessionButton()}
      </View>
    );
    }

    return (
      <View style = {styles.endSessionNotesBox}>
        {handleNoteInput()}
        {handleEndSessionChoices()}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.greeting}>Hey, {user.name} 👋</Text>
              <Text style={styles.subGreeting}>Ready to study?</Text>
            </View>

            <View style={styles.section}>
              {activeSession ? (
                <>
                  <View style={styles.activeSessionBanner}>
                    <Text style={styles.activeSessionText}>
                      📖 Studying:{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {activeSession.subject}
                      </Text>
                    </Text>

                    <Text style={styles.activeSessionSince}>
                      Since {formatTime(activeSession.startTime)}
                    </Text>
                    <Text>
                      Elapsed: {formatLiveTime(liveElapsedTime)}
                    </Text>
                  </View>
                  {handleEndSessionWithNotes()}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.sessionBtn}
                    onPress={() => {
                      if (classes.length === 0) {
                        Alert.alert('No classes', 'Add a class below before starting a session.');
                        return;
                      }
                      setShowClassPicker(true);
                    }}
                    disabled={sessionLoading}
                  >
                    {sessionLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.sessionBtnText}>▶ Start Study Session</Text>
                    }
                  </TouchableOpacity>

                  <Modal
                    visible={showClassPicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowClassPicker(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>What are you studying?</Text>
                        <FlatList
                          data={classes}
                          keyExtractor={(item) => item}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.modalItem}
                              onPress={() => handleStartSession(item)}
                            >
                              <Text style={styles.modalItemText}>{item}</Text>
                            </TouchableOpacity>
                          )}
                        />
                        <TouchableOpacity
                          style={[styles.sessionBtn, styles.sessionBtnCancel, { marginTop: 12 }]}
                          onPress={() => setShowClassPicker(false)}
                        >
                          <Text style={styles.sessionBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                </>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Classes</Text>

                <TouchableOpacity onPress={() => setEditingClasses(!editingClasses)}>
                  <Text style={styles.sectionAction}>
                    {editingClasses ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.classPills}>
                {classes.map((cls) => (
                  <View key={cls} style={styles.pill}>
                    <Text style={styles.pillText}>{cls}</Text>

                    {editingClasses && (
                      <TouchableOpacity
                        onPress={() => handleRemoveClass(cls)}
                        style={styles.pillRemove}
                      >
                        <Text style={styles.pillRemoveText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {editingClasses && (
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8, marginTop: 10 }]}
                    placeholder="Add a class"
                    placeholderTextColor="#aaa"
                    value={classInput}
                    onChangeText={setClassInput}
                    onSubmitEditing={handleAddClass}
                  />

                  <TouchableOpacity style={styles.addBtn} onPress={handleAddClass}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.sectionHeader2}>
              <Text style={styles.sectionTitle}>Study Log</Text>

              {!loading && (
                <TouchableOpacity onPress={() => setEditMode(e => !e)}>
                  <Text style={styles.sectionAction}>{editMode ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading && (
              <ActivityIndicator style={{ marginTop: 20 }} color="#4A90D9" />
            )}

            {!loading && sessions.length === 0 && (
              <Text style={styles.emptyText}>
                No sessions yet. Start your first one!
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => <SessionCard session={item} editMode={editMode} onDelete={handleDeleteSession} />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },

  listContent: {
    paddingBottom: 40,
  },

  header: {
    backgroundColor: '#1A1F36',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },

  greeting: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },

  subGreeting: {
    color: '#8892B0',
    fontSize: 14,
    marginTop: 4,
  },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionHeader2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1F36',
  },

  sectionAction: {
    fontSize: 14,
    color: '#4A90D9',
    fontWeight: '600',
  },

  sessionBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  sessionBtnStop: {
    backgroundColor: '#4A90D9',
  },

  sessionBtnCancel: {
    backgroundColor: '#E05252',
  },

  sessionBtnCancel: {
    backgroundColor: '#E05252',
  },

  sessionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  sessionNotesBox: {
  backgroundColor: '#F8F9FC',
  borderRadius: 8,
  padding: 10,
  marginTop: 10,
},

  sessionNotesLabel: {
    color: '#8892B0',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  sessionNotesText: {
    color: '#1A1F36',
    fontSize: 13,
    lineHeight: 18,
  },

  activeSessionBanner: {
    backgroundColor: '#EAF4FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  activeSessionText: {
    fontSize: 15,
    color: '#1A1F36',
  },

  activeSessionSince: {
    fontSize: 12,
    color: '#8892B0',
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E0E4EF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1F36',
    backgroundColor: '#F8F9FC',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1A1F36',
  },

  classPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  pill: {
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pillText: {
    color: '#4A90D9',
    fontWeight: '600',
    fontSize: 13,
  },

  pillRemove: {
    marginLeft: 6,
  },

  pillRemoveText: {
    color: '#4A90D9',
    fontSize: 11,
    fontWeight: '700',
  },

  addBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
    justifyContent: 'center',
  },

  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  sessionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
  },

  sessionCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90D9',
  },

  sessionCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sessionSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1F36',
  },

  sessionDuration: {
    fontSize: 14,
    color: '#8892B0',
    fontWeight: '600',
  },

  sessionDurationActive: {
    color: '#4A90D9',
  },

  sessionDate: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },

  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 16,
    fontSize: 14,
  },
  endSessionNotesBox: {
    marginTop: 4,
  },

  endSessionStack: {
  marginTop: 10,
  gap: 8,
  },

  notesLabel: {
    color: '#1A1F36',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  notesInput: {
    minHeight: 90,
    marginBottom: 6,
  },

  notesCounter: {
    color: '#8892B0',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 4,
  },

  sessionNotes: {
    color: '#1A1F36',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
});