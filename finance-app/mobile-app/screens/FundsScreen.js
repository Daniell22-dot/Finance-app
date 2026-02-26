import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const colors = {
  primary: '#1a1a1a',
  accent: '#FFD700',
  white: '#FFFFFF',
  lightBg: '#f8f8f8',
  gray: '#666',
  border: '#E0E0E0'
};

export default function FundsScreen({ route }) {
  const user = route.params?.user;
  const token = route.params?.access_token || route.params?.token;
  const initialTab = route.params?.initialTab;

  const [activeTab, setActiveTab] = useState(initialTab || 'deposit');
  const [balance, setBalance] = useState(user?.balance || 75000);

  // Form State
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransaction = async () => {
    // 1. Validation
    if (!amount || !phone || !password) {
      Alert.alert("Required Fields", "Please fill in the amount, phone number, and your app password.");
      return;
    }

    if (activeTab === 'withdraw' && parseFloat(amount) > balance) {
      Alert.alert("Insufficient Funds", "You cannot withdraw more than your current balance.");
      return;
    }

    setLoading(true);

    try {
      // Here you would call your API: 
      // await api.processTransaction({ type: activeTab, amount, phone, password, token: userData.token })

      // Simulating API verification
      setTimeout(() => {
        setLoading(false);

        // Mock success logic
        if (activeTab === 'deposit') {
          setBalance(prev => prev + parseFloat(amount));
          Alert.alert("Success", "STK Push sent to " + phone);
        } else if (activeTab === 'withdraw') {
          setBalance(prev => prev - parseFloat(amount));
          Alert.alert("Processing", "Withdrawal of KES " + amount + " initiated.");
        } else {
          setBalance(prev => prev + parseFloat(amount));
          Alert.alert("Loan Disbursed", "Loan amount credited to your Z10 wallet.");
        }

        // Clear sensitive fields
        setAmount('');
        setPassword('');
      }, 2000);

    } catch (error) {
      setLoading(false);
      Alert.alert("Security Error", "Incorrect password or transaction failed.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Wallet Header */}
      <View style={styles.header}>
        <Text style={styles.balanceLabel}>Available Portfolio Balance</Text>
        <Text style={styles.balanceValue}>KES {balance.toLocaleString()}</Text>
      </View>

      {/* Action Tabs */}
      <View style={styles.tabContainer}>
        {['deposit', 'withdraw', 'borrow'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab);
              setPassword(''); // Clear password when switching modes
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <View style={styles.authCard}>
            <Text style={styles.cardHeader}>Transaction Details</Text>

            {/* Phone Input */}
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>M-Pesa Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="2547XXXXXXXX"
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Amount (KES)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>

            {/* Password Verification */}
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Verify App Password</Text>
              <View style={styles.passwordWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.gray} style={styles.icon} />
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={true}
                  placeholder="Enter login password"
                />
              </View>
              <Text style={styles.helperText}>Required to authorize this {activeTab}.</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: activeTab === 'borrow' ? '#000' : colors.accent }]}
              onPress={handleTransaction}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={activeTab === 'borrow' ? colors.accent : colors.primary} />
              ) : (
                <Text style={[styles.submitText, { color: activeTab === 'borrow' ? colors.accent : colors.primary }]}>
                  Confirm {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { backgroundColor: colors.primary, padding: 35, alignItems: 'center', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  balanceLabel: { color: colors.white, opacity: 0.6, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  balanceValue: { color: colors.accent, fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  tabContainer: { flexDirection: 'row', padding: 15, justifyContent: 'center' },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginHorizontal: 5 },
  activeTab: { backgroundColor: colors.lightBg, borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.gray },
  activeTabText: { color: colors.primary },
  scrollPadding: { padding: 20 },
  authCard: { backgroundColor: colors.white, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  cardHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.primary },
  inputBox: { marginBottom: 15 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: colors.gray, marginBottom: 8 },
  input: { backgroundColor: colors.lightBg, padding: 15, borderRadius: 10, fontSize: 16, color: colors.primary },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.lightBg, borderRadius: 10, paddingHorizontal: 15 },
  passwordInput: { flex: 1, paddingVertical: 15, fontSize: 16, color: colors.primary },
  icon: { marginRight: 10 },
  helperText: { fontSize: 11, color: colors.gray, marginTop: 5, fontStyle: 'italic' },
  submitButton: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { fontWeight: 'bold', fontSize: 16 }
});