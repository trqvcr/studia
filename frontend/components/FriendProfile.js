import { useState, useEffect } from 'react';
import {View, Text, Image, Alert, TouchableOpacity, StyleSheet} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_AVATAR = require('../assets/default-avatar.png');

export default function FriendProfile({ user, friend, token, exitProfile}){
    const [friendProfile, setFriendProfile] = useState({ user: friend, status: null, friendCount: null });
    const [sendingRequest, setSendingRequest] = useState(false);

    useEffect(() => {
        const loadFriends = async () => {
            try{
                const data = await fetch(`${API_URL}/friends/profile/${friend.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                });
                const profile = await data.json();
                setFriendProfile(profile);
            }
            catch (err){
                console.error('ERROR: could not fetch user;', err);
            }
        };
        loadFriends();
    }, []);

    async function sendFriendRequest(){
        setSendingRequest(true);
        try{
            const data = await fetch(`${API_URL}/friends/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({friendId: friend.id})
            });
            if(!data.ok) throw new Error('/friends/add request error');
            setFriendProfile((prev) => ({
                ...prev, 
                status: 'pending',
                isRequester: true,
            }));
        }
        catch(err){
            Alert.alert('Friend request error', 'Could not send friend request');
        }
        finally{
            setSendingRequest(false);
        }
    }

    async function acceptFriendRequest(){
        setSendingRequest(true);
        try{
            const data = await fetch(`${API_URL}/friends/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({friendId: friend.id})
            });
            if(!data.ok) throw new Error('/friends/add request error');
            setFriendProfile((prev) => ({
                ...prev, 
                status: 'accepted',
            }));
        }
        catch(err){
            Alert.alert('Friend request error', 'Could not accept friend request');
        }
        finally{
            setSendingRequest(false);
        }
    }

    let buttonText = 'Request Friend';
    let disableButton = false;
    const buttonHandler = (friendProfile.status === 'pending' && !friendProfile.isRequester) ? acceptFriendRequest : sendFriendRequest;
    if(friendProfile.status === 'accepted'){
        buttonText = 'Friends';
        disableButton = true;
    }
    else if(friendProfile.status === 'pending' && friendProfile.isRequester){
        buttonText = 'Requested';
        disableButton = true;
    }
    else if(friendProfile.status === 'pending' && !friendProfile.isRequester){
        buttonText = 'Accept Request';
        disableButton = false;
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={exitProfile}
                style={styles.exitButton}
            >
                <Text style={styles.exitButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.profileCard}>
                <Image 
                    style={styles.profileAvatar}
                    source={friendProfile.user.avatar_url ? {uri: friendProfile.user.avatar_url} : DEFAULT_AVATAR}
                />

                <View style={styles.profileInfo}>
                
                    <Text style={styles.profileName}>{friendProfile.user.name}</Text>
                    <Text style={styles.profileUsername}>@{friendProfile.user.username}</Text>
                    <Text style={styles.profileStat}>{friendProfile.friendCount} Friends</Text>
                
                </View>
            </View>

            <TouchableOpacity
                onPress={buttonHandler}
                disabled={disableButton || sendingRequest}
                style={[styles.reqButton, (disableButton || sendingRequest) && styles.reqButtonDisabled]}
            >
                <Text style={styles.reqButtonText}>{buttonText}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },

    exitButton:{
        alignSelf: 'flex-start',
        margin: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F2F4F8',
        alignItems: 'center',
        justifyContent: 'center',
    },

    exitButtonText: {
        fontSize: 16,
        color: '#1A1F36',
        fontWeight: '600',
    },

    profileCard: {
        backgroundColor: '#1A1F36',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
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

    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 80/2,
        borderWidth: 1.5,
        borderColor: 'dimgray',
    },

    profileStat:{
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 8,
        fontSize: 14,
        color: '#8892B0'
    },

    reqButton: {
        backgroundColor: '#4A90D9',
        borderRadius: 12,
        paddingVertical: 14,
        marginHorizontal: 16,
        marginTop: 12,
        alignItems: 'center',
    },

    reqButtonDisabled: {
        backgroundColor: '#8892B0',
    },

    reqButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});