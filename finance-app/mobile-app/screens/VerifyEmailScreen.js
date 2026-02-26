import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { authAPI } from '../services/api';

const colors = {
  primary: '#1a1a1a',
  accent: '#FFD700',
  white: '#FFFFFF',
  lightBg: '#f8f8f8',
  gray: '#666'
};

export default function VerifyEmailScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert("Invalid Code", "Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      // API call to verify code
      await authAPI.verifyOTP({ email, code });
      
      Alert.alert("Success", "Account verified! You can now log in.", [
        { text: "Go to Login", onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert("Verification Failed", error.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color={colors.primary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-open-outline" size={50} color={colors.accent} />
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to{"\n"}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              onChangeText={(value) => handleOtpChange(value, index)}
              value={digit}
              ref={(ref) => (inputs.current[index] = ref)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
                  inputs.current[index - 1].focus();
                }
              }}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyBtn, loading && { opacity: 0.7 }]} 
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.verifyText}>Verify & Activate</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn}>
          <Text style={styles.resendText}>Didn't receive a code? <Text style={{fontWeight:'bold'}}>Resend</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 25 },
  backBtn: { marginTop: 40 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 10 },
  subtitle: { textAlign: 'center', color: colors.gray, lineHeight: 22, marginBottom: 30 },
  emailText: { color: colors.primary, fontWeight: 'bold' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  otpInput: { width: 45, height: 55, backgroundColor: colors.lightBg, borderRadius: 10, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: colors.primary, borderBottomWidth: 3, borderBottomColor: colors.accent },
  verifyBtn: { backgroundColor: colors.accent, width: '100%', padding: 18, borderRadius: 12, alignItems: 'center' },
  verifyText: { fontWeight: 'bold', fontSize: 16, color: colors.primary },
  resendBtn: { marginTop: 25 },
  resendText: { color: colors.gray, fontSize: 14 }
});