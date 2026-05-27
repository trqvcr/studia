import {View, Text, StyleSheet, Image} from 'react-native';

const DEFAULT_AVATAR = require('../assets/default-avatar.png');

export default function FriendCard({ username, name, hoursStudied, avatarURL}){
  const imageSource = avatarURL ? {uri: avatarURL} : DEFAULT_AVATAR;
  const hours = hoursStudied ? hoursStudied : 'Has not studied yet this week...';

  return (
    <View style={styles.buffer}>
      <View style={styles.card}>
        <View style={styles.buffer}>
          <Image
            source={imageSource}
            style={styles.avatar}
          />
        </View>
        
        <View style={styles.columnText}>

          <Text style={styles.name}>
            {name} | @{username}
          </Text>
          
          <Text style={styles.subtitle}>
            {hours}
          </Text>
        </View>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 5,
    marginBottom: 10,
    borderRadius: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 50/2,
    borderWidth: 1.5,
    borderColor: 'dimgray',
  },
  buffer: {
    padding: 10
  },
  columnText: {
    justifyContent: 'center',
    alignItems: 'flex-start'
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