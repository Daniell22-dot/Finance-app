import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { notificationAPI } from '../services/api';

const colors = {
  primary: '#1a1a1a',
  accent: '#FFD700',
  white: '#FFFFFF',
  lightBg: '#f8f8f8',
  gray: '#666',
  success: '#4CAF50',
  warning: '#FF9800',
};

export default function NotificationScreen({ route, navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = route.params || {};

  useEffect(() => {
    if (token) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications(token);
      if (response.notifications) {
        setNotifications(response.notifications.map(n => ({
          id: n.id.toString(),
          type: n.type,
          title: n.title,
          message: n.message,
          time: formatTime(n.created_at),
          read: n.is_read
        })));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markRead(token);
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'deposit': return { name: 'cash-outline', color: colors.success };
      case 'loan': return { name: 'arrow-up-circle-outline', color: colors.accent };
      case 'security': return { name: 'shield-checkmark-outline', color: colors.warning };
      default: return { name: 'information-circle-outline', color: colors.primary };
    }
  };

  const renderItem = ({ item }) => {
    const icon = getIcon(item.type);
    return (
      <TouchableOpacity style={[styles.notiCard, !item.read && styles.unreadCard]}>
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.row}>
            <Text style={styles.notiTitle}>{item.title}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notiMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notiTime}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markReadText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={80} color={colors.gray} />
              <Text style={styles.emptyText}>No new notifications</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  markReadText: { color: colors.gray, fontSize: 13 },
  listPadding: { paddingBottom: 20 },
  notiCard: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    alignItems: 'center'
  },
  unreadCard: { backgroundColor: '#fffdf0' }, // Slight gold tint for unread
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  textContainer: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notiTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  notiMessage: { fontSize: 14, color: colors.gray, lineHeight: 20 },
  notiTime: { fontSize: 11, color: '#bbb', marginTop: 8 },
  emptyState: { marginTop: 100, alignItems: 'center' },
  emptyText: { marginTop: 10, color: colors.gray, fontSize: 16 }
});