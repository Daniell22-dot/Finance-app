import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, Modal, KeyboardAvoidingView, Platform
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

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    full_name: '', email: '', location: '', phone: '',
    username: '', password: '', confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const validateForm = () => {
    // Check all fields are filled
    for (const [key, value] of Object.entries(formData)) {
      if (!value.trim()) {
        Alert.alert('Error', `Please fill in ${key.replace('_', ' ')}`);
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    // Validate phone number (Kenyan format)
    const phoneRegex = /^(?:\+?254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid Kenyan phone number');
      return false;
    }

    // Validate username length
    if (formData.username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return false;
    }

    // Validate password
    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }

    if (!/[A-Z]/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least one uppercase letter');
      return false;
    }

    if (!/[a-z]/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least one lowercase letter');
      return false;
    }

    if (!/\d/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least one number');
      return false;
    }

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { confirmPassword, ...apiData } = formData;
      await authAPI.register(apiData);

      setRegisteredEmail(formData.email);
      setSuccessModal(true);

    } catch (error) {
      Alert.alert('Registration Failed', error.error || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSuccessModalClose = () => {
    setSuccessModal(false);
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join Z10 GROUP</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSubtitle}>Start your financial journey with us</Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.full_name}
              onChangeText={(text) => updateFormData('full_name', text)}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Location (e.g., Nairobi, Kenya)"
              value={formData.location}
              onChangeText={(text) => updateFormData('location', text)}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (e.g., 0712345678)"
              value={formData.phone}
              onChangeText={(text) => updateFormData('phone', text)}
              keyboardType="phone-pad"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person-circle-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={formData.username}
              onChangeText={(text) => updateFormData('username', text)}
              autoCapitalize="none"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (min. 8 characters)"
              value={formData.password}
              onChangeText={(text) => updateFormData('password', text)}
              secureTextEntry={!showPassword}
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

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => updateFormData('confirmPassword', text)}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={colors.gray}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.passwordToggle}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirement}>
              <Ionicons name={formData.password.length >= 8 ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={formData.password.length >= 8 ? colors.secondary : colors.gray}
              />
              <Text style={styles.requirementText}>At least 8 characters</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons name={/[A-Z]/.test(formData.password) ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={/[A-Z]/.test(formData.password) ? colors.secondary : colors.gray}
              />
              <Text style={styles.requirementText}>One uppercase letter (A-Z)</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons name={/[a-z]/.test(formData.password) ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={/[a-z]/.test(formData.password) ? colors.secondary : colors.gray}
              />
              <Text style={styles.requirementText}>One lowercase letter (a-z)</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons name={/\d/.test(formData.password) ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={/\d/.test(formData.password) ? colors.secondary : colors.gray}
              />
              <Text style={styles.requirementText}>One number (0-9)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.registerButtonText}>Create Z10 GROUP Account</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={successModal}
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalLogoContainer}>
              <Text style={styles.modalLogoMain}>Z10</Text>
              <Text style={styles.modalLogoSub}>GROUP</Text>
            </View>
            <Ionicons name="checkmark-circle" size={60} color={colors.secondary} />
            <Text style={styles.modalTitle}>Registration Successful!</Text>
            <Text style={styles.modalText}>
              Welcome to Z10 GROUP! A verification email has been sent to:
            </Text>
            <Text style={styles.modalEmail}>{registeredEmail}</Text>
            <Text style={styles.modalInstructions}>
              Please check your email and click the verification link to activate your account.
            </Text>

            <View style={styles.modalTips}>
              <Text style={styles.tipsTitle}>Important:</Text>
              <View style={styles.tip}>
                <Ionicons name="mail" size={14} color={colors.primary} />
                <Text style={styles.tipText}>Check your spam folder</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="link" size={14} color={colors.primary} />
                <Text style={styles.tipText}>Click the verification link</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="return-up-back" size={14} color={colors.primary} />
                <Text style={styles.tipText}>Return to login after verification</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSuccessModalClose}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.white} style={styles.buttonIcon} />
              <Text style={styles.modalButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.primary
  },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white
  },
  placeholder: { width: 34 },
  formContainer: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 20 },
  formHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
    textAlign: 'center'
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
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
  inputIcon: { paddingLeft: 15 },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: colors.primary
  },
  passwordToggle: { paddingRight: 15 },
  passwordRequirements: {
    backgroundColor: colors.lightBg,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 8,
  },
  registerButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerButtonDisabled: { opacity: 0.6 },
  buttonIcon: {
    marginRight: 10,
  },
  registerButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold'
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginText: { color: colors.gray },
  loginLinkText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 5,
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
  modalLogoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  modalLogoMain: {
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
    marginTop: 15,
    marginBottom: 10,
    color: colors.primary,
    textAlign: 'center'
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.gray,
    marginBottom: 10,
    lineHeight: 22,
  },
  modalEmail: {
    fontSize: 15,
    color: colors.secondary,
    marginBottom: 15,
    fontWeight: '600',
    backgroundColor: colors.lightBg,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  modalInstructions: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalTips: {
    backgroundColor: colors.lightBg,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 8,
  },
  modalButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});
