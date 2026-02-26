import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, TextInput
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'react-native-image-picker';
import { dashboardAPI, profileAPI } from '../services/api';

// Z10 GROUP Color scheme
const colors = {
  primary: '#1a1a1a',      // Dark black
  accent: '#FFD700',       // Gold
  secondary: '#4CAF50',    // Green
  white: '#FFFFFF',
  lightBg: '#f5f5f5',
  gray: '#666666',
  warning: '#FFA726',
  error: '#FF6B6B'
};

export default function ProfileScreen({ route, navigation }) {
  const [userData, setUserData] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '',
    username: '',
    phone: '',
    location: ''
  });

  useEffect(() => {
    // Get user data from route params
    const user = route.params?.user;
    const token = route.params?.access_token || route.params?.token;

    if (user && token) {
      setUserData(user);
      loadUserData(user.id, token);
    } else {
      // For testing, use default values
      setUserData({
        id: 1,
        full_name: 'John Doe',
        username: 'johndoe',
        email: 'test@example.com',
        location: 'Nairobi, Kenya',
        phone: '+254712345678',
        is_verified: true
      });
      setPortfolioData({
        balance: 75000,
        loan_amount: 10000,
        accessible_loans: 50000
      });
      setLoading(false);
    }
  }, [route.params]);

  const loadUserData = async (userId, token) => {
    try {
      setLoading(true);
      const [dashboardResponse, profileResponse] = await Promise.all([
        dashboardAPI.getDashboard(userId, token),
        profileAPI.getProfile(userId, token)
      ]);
      setUserData(profileResponse.user);
      setPortfolioData(dashboardResponse.portfolio);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // For demo purposes, use sample data
      setPortfolioData({
        balance: 75000,
        loan_amount: 10000,
        accessible_loans: 50000
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KES ${amount?.toLocaleString() || '0'}`;
  };

  const handleLogout = () => {
    setLogoutModalVisible(false);
    // In a real app, you would clear tokens and navigation
    Alert.alert(
      'Logged Out',
      'You have been successfully logged out.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );
  };

  const handleEditProfile = () => {
    setEditData({
      full_name: userData.full_name,
      username: userData.username,
      phone: userData.phone || '',
      location: userData.location || ''
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await profileAPI.updateProfile(userData.id, editData, route.params?.token);
      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
      loadUserData(userData.id, route.params?.token);
    } catch (error) {
      Alert.alert('Error', error.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPhoto = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 500,
      maxWidth: 500,
    };

    ImagePicker.launchImageLibrary(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        try {
          setLoading(true);
          await profileAPI.updateProfile(userData.id, {
            profile_photo: `data:${asset.type};base64,${asset.base64}`
          }, route.params?.token);
          Alert.alert('Success', 'Profile photo updated!');
          loadUserData(userData.id, route.params?.token);
        } catch (error) {
          Alert.alert('Error', error.error || 'Failed to update photo');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings feature coming soon.');
  };

  const handleDocuments = () => {
    Alert.alert('Documents', 'Document management feature coming soon.');
  };

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      action: handleEditProfile
    },
    {
      icon: 'settings-outline',
      label: 'Settings',
      action: handleSettings
    },
    {
      icon: 'document-text-outline',
      label: 'Documents',
      action: handleDocuments
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy & Security',
      action: () => Alert.alert('Privacy', 'Privacy settings coming soon.')
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      action: () => Alert.alert('Help', 'Help center coming soon.')
    },
    {
      icon: 'information-circle-outline',
      label: 'About Z10 GROUP',
      action: () => Alert.alert('About', 'Z10 GROUP - Smart Finance Management Platform')
    },
  ];

  const quickActions = [
    {
      icon: 'wallet-outline',
      label: 'Wallet',
      color: colors.accent,
      bgColor: '#FFF8E1',
      action: () => navigation.navigate('Funds', { user: userData, token: route.params?.token })
    },
    {
      icon: 'business-outline',
      label: 'Projects',
      color: colors.secondary,
      bgColor: '#E8F5E9',
      action: () => navigation.navigate('Projects', { user: userData, token: route.params?.token })
    },
    {
      icon: 'trending-up-outline',
      label: 'Investments',
      color: colors.warning,
      bgColor: '#FFF3E0',
      action: () => navigation.navigate('Portfolio', { user: userData, token: route.params?.token })
    },
    {
      icon: 'card-outline',
      label: 'Cards',
      color: '#7B1FA2',
      bgColor: '#F3E5F5',
      action: () => Alert.alert('Cards', 'Card management coming soon.')
    },
  ];

  if (loading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>Z10</Text>
          <Text style={styles.loadingLogoSub}>GROUP</Text>
        </View>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>Z10</Text>
            <Text style={styles.headerLogoSub}>GROUP</Text>
          </View>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <TouchableOpacity onPress={handleSettings}>
          <Ionicons name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageWrapper}>
          <Image
            source={userData?.profile_photo ? { uri: userData.profile_photo } : { uri: 'https://via.placeholder.com/120' }}
            style={styles.profileImage}
          />
          {userData?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.editPhotoButton}
          onPress={handleEditPhoto}
        >
          <Ionicons name="camera" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.userName}>{userData?.full_name || 'User'}</Text>
      <Text style={styles.userUsername}>@{userData?.username || 'username'}</Text>

      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Ionicons name="mail" size={16} color={colors.gray} />
          <Text style={styles.contactText}>{userData?.email || 'email@example.com'}</Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="call" size={16} color={colors.gray} />
          <Text style={styles.contactText}>{userData?.phone || '+254 000 000 000'}</Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="location" size={16} color={colors.gray} />
          <Text style={styles.contactText}>{userData?.location || 'Location'}</Text>
        </View>
      </View>

      {/* Profile Stats */}
      <View style={styles.profileStats}>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={20} color={colors.accent} />
          <Text style={styles.statValue}>{formatCurrency(portfolioData?.balance || 0)}</Text>
          <Text style={styles.statLabel}>Balance</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={20} color={colors.secondary} />
          <Text style={styles.statValue}>
            {formatCurrency(portfolioData?.accessible_loans || 0)}
          </Text>
          <Text style={styles.statLabel}>Accessible</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="checkmark-done" size={20} color={colors.warning} />
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
      </View>


      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={action.action}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bgColor }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.action}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer Navigation */}
      <View style={styles.footerMenu}>
        <TouchableOpacity
          style={styles.footerMenuItem}
          onPress={() => navigation.navigate('Dashboard', {
            user: userData,
            token: route.params?.token
          })}
        >
          <Ionicons name="home" size={20} color={colors.primary} />
          <Text style={styles.footerMenuText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerMenuItem}
          onPress={() => navigation.navigate('Portfolio', {
            user: userData,
            token: route.params?.token
          })}
        >
          <Ionicons name="pie-chart" size={20} color={colors.primary} />
          <Text style={styles.footerMenuText}>Portfolio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerMenuItem}
          onPress={() => navigation.navigate('Projects', {
            user: userData,
            token: route.params?.token
          })}
        >
          <Ionicons name="folder" size={20} color={colors.primary} />
          <Text style={styles.footerMenuText}>Projects</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerMenuItem}
          onPress={() => navigation.navigate('Funds', {
            user: userData,
            token: route.params?.token
          })}
        >
          <Ionicons name="cash" size={20} color={colors.primary} />
          <Text style={styles.footerMenuText}>Funds</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => setLogoutModalVisible(true)}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.white} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalLogo}>
              <Text style={styles.modalLogoText}>Z10</Text>
              <Text style={styles.modalLogoSub}>GROUP</Text>
            </View>

            <Ionicons name="log-out" size={60} color={colors.error} />
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalText}>
              Are you sure you want to log out of your Z10 GROUP account?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.logoutConfirmButton]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 5,
  },
  input: {
    width: '100%',
    height: 45,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingLogo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  loadingLogoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loadingLogoSub: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 5,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.gray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.primary,
    paddingTop: 50,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
  },
  headerLogoSub: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    marginLeft: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 5,
  },
  profileSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.white,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.accent,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 2,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  userUsername: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 20,
  },
  contactInfo: {
    width: '100%',
    backgroundColor: colors.lightBg,
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 10,
    flex: 1,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.lightBg,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  menuList: {
    backgroundColor: colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuLabel: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  footerMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: colors.lightBg,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  footerMenuItem: {
    alignItems: 'center',
    padding: 10,
  },
  footerMenuText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 5,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.error,
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 18,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
  },
  modalLogo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  modalLogoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalLogoSub: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 15,
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: colors.lightBg,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutConfirmButton: {
    backgroundColor: colors.error,
  },
  logoutConfirmText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});