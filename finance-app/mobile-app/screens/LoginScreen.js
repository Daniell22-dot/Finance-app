import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
  KeyboardAvoidingView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { authAPI } from '../services/api';

// Z10 GROUP Color scheme
const colors = {
  primary: '#1a1a1a',      // Dark black
  accent: '#FFD700',       // Gold
  secondary: '#4CAF50',    // Green
  black: '#000000',
  white: '#FFFFFF',
  lightBg: '#f5f5f5',
  darkGold: '#B8860B',
  gray: '#666666'
};

const YOUR_COMPUTER_IP = '172.16.75.42';

export default function LoginScreen({ navigation, setIsLoggedIn, setUserData }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationModal, setVerificationModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(credentials.email, credentials.password);

      if (response && response.access_token) {
        setUserData(response); // Pass the whole thing including token
        setIsLoggedIn(true);
        Alert.alert('Success', `Welcome to Z10 GROUP, ${response.user?.username || 'User'}!`);
      }

    } catch (error) {
      if (error.needs_verification) {
        setUnverifiedEmail(error.verification_email || credentials.email);
        setVerificationModal(true);
      } else {
        Alert.alert(
          'Login Failed',
          error.error || error.message || 'Cannot connect to server.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!unverifiedEmail) return;

    setResendingEmail(true);
    try {
      await authAPI.resendVerification(unverifiedEmail);
      Alert.alert(
        'Verification Email Sent',
        'Please check your email for the verification link.'
      );
      setVerificationModal(false);
    } catch (error) {
      Alert.alert('Error', error.error || 'Failed to resend verification email');
    } finally {
      setResendingEmail(false);
    }
  };

  const updateCredentials = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>Z10</Text>
            <Text style={styles.logoSubText}>GROUP</Text>
          </View>
          <Text style={styles.welcomeText}>Welcome to Z10 GROUP</Text>
          <Text style={styles.tagline}>Smart Finance Management</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.signInText}>Sign In to Your Account</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={credentials.email}
              onChangeText={(text) => updateCredentials('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={credentials.password}
              onChangeText={(text) => updateCredentials('password', text)}
              secureTextEntry={!showPassword}
              editable={!loading}
              placeholderTextColor={colors.gray}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.registerLink}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.registerButtonLink}
            >
              <Text style={styles.registerLinkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={verificationModal}
        onRequestClose={() => setVerificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLogo}>Z10</Text>
              <Text style={styles.modalLogoSub}>GROUP</Text>
            </View>
            <Ionicons name="mail-unread-outline" size={60} color={colors.accent} />
            <Text style={styles.modalTitle}>Account Verification Required</Text>
            <Text style={styles.modalText}>
              Please verify your email address to access Z10 GROUP.
            </Text>
            <Text style={styles.modalEmail}>
              {unverifiedEmail}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.resendButton]}
                onPress={resendVerificationEmail}
                disabled={resendingEmail}
              >
                {resendingEmail ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color={colors.white} style={styles.buttonIcon} />
                    <Text style={styles.modalButtonText}>Resend Email</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setVerificationModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              Check your spam folder if you don't see the email. Click the verification link to activate your account.
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 35,
    backgroundColor: colors.primary
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.white
  },
  logoText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.primary,
  },
  logoSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: -4
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5
  },
  tagline: {
    fontSize: 16,
    color: colors.accent,
    opacity: 0.9
  },
  formContainer: {
    padding: 30
  },
  signInText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 30,
    textAlign: 'center'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightBg,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  inputIcon: {
    paddingLeft: 15
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: colors.primary
  },
  passwordToggle: {
    paddingRight: 15
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  loginButtonDisabled: {
    opacity: 0.6
  },
  buttonIcon: {
    marginRight: 10
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold'
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 20
  },
  registerText: {
    color: colors.gray,
    fontSize: 15
  },
  registerButtonLink: {
    padding: 5
  },
  registerLinkText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
    textDecorationLine: 'underline'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 30,
    width: '85%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  modalLogo: {
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
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: colors.primary,
    textAlign: 'center'
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.gray,
    marginBottom: 15,
    lineHeight: 22,
  },
  modalEmail: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 25,
    fontWeight: '600',
    backgroundColor: colors.lightBg,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resendButton: {
    backgroundColor: colors.primary,
  },
  closeButton: {
    backgroundColor: colors.lightBg,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  helpText: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});