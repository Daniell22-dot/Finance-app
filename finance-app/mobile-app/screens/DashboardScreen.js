import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { dashboardAPI } from '../services/api';

// Z10 GROUP Color scheme
const colors = {
  primary: '#1a1a1a',      // Dark black
  accent: '#FFD700',       // Gold
  secondary: '#4CAF50',    // Green
  white: '#FFFFFF',
  lightBg: '#f5f5f5',
  gray: '#666666',
  warning: '#FFA726'
};

export default function DashboardScreen({ route, navigation }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get user data from route params or async storage
    const user = route.params?.user;
    const token = route.params?.access_token || route.params?.token;

    if (user && token) {
      setUserId(user.id);
      setUserToken(token);
      loadDashboard(user.id, token);
    } else {
      // For testing, use default values
      setUserId(1);
      setUserToken('test-token');
      loadDashboard(1, 'test-token');
    }
  }, [route.params]);

  const loadDashboard = async (userId, token) => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getDashboard(userId, token);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // For demo purposes, use sample data if API fails
      setDashboardData({
        user: {
          name: 'John Doe',
          username: 'johndoe',
          email: 'test@example.com',
          location: 'Nairobi, Kenya',
          phone: '+254712345678'
        },
        portfolio: {
          balance: 75000,
          loan_amount: 10000,
          accessible_loans: 50000
        },
        projects: [
          {
            id: 1,
            title: 'Farm Project',
            bid_amount: 5000,
            percentage: 75
          },
          {
            id: 2,
            title: 'Tech Startup',
            bid_amount: 15000,
            percentage: 40
          }
        ],
        loans: [
          {
            id: 1,
            amount_taken: 10000,
            date_taken: '2024-01-15',
            amount_due: 11500,
            due_date: '2024-07-15',
            status: 'active'
          },
          {
            id: 2,
            amount_taken: 5000,
            date_taken: '2024-02-01',
            amount_due: 5500,
            due_date: '2024-05-01',
            status: 'active'
          }
        ]
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userId && userToken) {
      loadDashboard(userId, userToken);
    }
  };

  const formatCurrency = (amount) => {
    return `KES ${amount?.toLocaleString() || '0'}`;
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>Z10</Text>
          <Text style={styles.loadingLogoSub}>GROUP</Text>
        </View>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading Z10 GROUP Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.accent]}
          tintColor={colors.accent}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Z10</Text>
            <Text style={styles.logoSubText}>GROUP</Text>
          </View>
          <Text style={styles.headerSubtitle}>Financial Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.white} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <Ionicons name="person-circle-outline" size={40} color={colors.accent} />
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{dashboardData?.user?.name || 'User'}</Text>
          </View>
        </View>
        <Text style={styles.welcomeSubtext}>
          Manage your finances and track your investments with Z10 GROUP
        </Text>
      </View>

      {/* Portfolio Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portfolio Summary</Text>
        <View style={styles.portfolioGrid}>
          <View style={[styles.portfolioCard, styles.balanceCard]}>
            <Ionicons name="wallet-outline" size={24} color={colors.secondary} />
            <Text style={styles.portfolioLabel}>Balance</Text>
            <Text style={styles.portfolioAmount}>{formatCurrency(dashboardData?.portfolio?.balance)}</Text>
            <Text style={styles.portfolioNote}>Available funds</Text>
          </View>

          <View style={[styles.portfolioCard, styles.loanCard]}>
            <Ionicons name="cash-outline" size={24} color={colors.accent} />
            <Text style={styles.portfolioLabel}>Loan Amount</Text>
            <Text style={styles.portfolioAmount}>{formatCurrency(dashboardData?.portfolio?.loan_amount)}</Text>
            <Text style={styles.portfolioNote}>Active loans</Text>
          </View>
        </View>

        <View style={styles.accessibleLoansCard}>
          <Ionicons name="trending-up-outline" size={24} color={colors.white} />
          <View style={styles.accessibleLoansText}>
            <Text style={styles.accessibleLoansLabel}>Accessible Loans</Text>
            <Text style={styles.accessibleLoansAmount}>{formatCurrency(dashboardData?.portfolio?.accessible_loans)}</Text>
          </View>
          <TouchableOpacity style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Projects */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Projects</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Projects')}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {dashboardData?.projects?.slice(0, 2).map((project, index) => (
          <View key={index} style={styles.projectCard}>
            <View style={styles.projectHeader}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectAmount}>{formatCurrency(project.bid_amount)}</Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>Progress</Text>
                <Text style={styles.progressPercentage}>{project.percentage}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(project.percentage, 100)}%` }
                  ]}
                />
              </View>
            </View>

            <View style={styles.projectStatus}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: project.percentage >= 100 ? colors.secondary : colors.warning }
              ]} />
              <Text style={styles.statusText}>
                {project.percentage >= 100 ? 'Completed' : 'In Progress'}
              </Text>
            </View>
          </View>
        ))}

        {(!dashboardData?.projects || dashboardData.projects.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={colors.gray} />
            <Text style={styles.emptyStateText}>No projects yet</Text>
            <Text style={styles.emptyStateSubtext}>Start investing in projects today</Text>
          </View>
        )}
      </View>

      {/* Active Loans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Loans</Text>

        {dashboardData?.loans?.slice(0, 2).map((loan, index) => {
          const daysRemaining = getDaysRemaining(loan.due_date);
          return (
            <View key={index} style={styles.loanCard}>
              <View style={styles.loanHeader}>
                <View style={styles.loanInfo}>
                  <Text style={styles.loanTitle}>Loan #{loan.id}</Text>
                  <Text style={styles.loanDate}>Taken: {loan.date_taken}</Text>
                </View>
                <View style={styles.loanAmountContainer}>
                  <Text style={styles.loanAmountLabel}>Amount Due</Text>
                  <Text style={styles.loanAmount}>{formatCurrency(loan.amount_due)}</Text>
                </View>
              </View>

              <View style={styles.loanDetails}>
                <View style={styles.loanDetail}>
                  <Text style={styles.loanDetailLabel}>Amount Taken</Text>
                  <Text style={styles.loanDetailValue}>{formatCurrency(loan.amount_taken)}</Text>
                </View>
                <View style={styles.loanDetail}>
                  <Text style={styles.loanDetailLabel}>Due Date</Text>
                  <Text style={[
                    styles.loanDetailValue,
                    daysRemaining < 7 ? styles.dueSoon : null
                  ]}>
                    {loan.due_date}
                  </Text>
                </View>
                <View style={styles.loanDetail}>
                  <Text style={styles.loanDetailLabel}>Days Remaining</Text>
                  <Text style={[
                    styles.loanDetailValue,
                    daysRemaining < 7 ? styles.dueSoon : null
                  ]}>
                    {daysRemaining} days
                  </Text>
                </View>
              </View>

              <View style={styles.loanStatus}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: loan.status === 'active' ? colors.secondary : colors.gray }
                ]}>
                  <Text style={styles.statusBadgeText}>{loan.status.toUpperCase()}</Text>
                </View>
                <TouchableOpacity style={styles.repayButton}>
                  <Text style={styles.repayButtonText}>Repay</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {(!dashboardData?.loans || dashboardData.loans.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color={colors.gray} />
            <Text style={styles.emptyStateText}>No active loans</Text>
            <Text style={styles.emptyStateSubtext}>Apply for a loan to get started</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Funds')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="add-circle-outline" size={24} color="#1976D2" />
            </View>
            <Text style={styles.actionText}>Deposit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Projects')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="business-outline" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.actionText}>Invest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Portfolio')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="trending-up-outline" size={24} color={colors.warning} />
            </View>
            <Text style={styles.actionText}>Track</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="person-outline" size={24} color="#7B1FA2" />
            </View>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  headerLeft: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.accent,
  },
  logoSubText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    marginLeft: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  notificationButton: {
    padding: 8,
  },
  welcomeCard: {
    backgroundColor: colors.lightBg,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  welcomeTextContainer: {
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.gray,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 2,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  portfolioGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  portfolioCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  balanceCard: {
    borderTopWidth: 4,
    borderTopColor: colors.secondary,
  },
  loanCard: {
    borderTopWidth: 4,
    borderTopColor: colors.accent,
  },
  portfolioLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 10,
    marginBottom: 5,
  },
  portfolioAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  portfolioNote: {
    fontSize: 10,
    color: colors.gray,
    fontStyle: 'italic',
  },
  accessibleLoansCard: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessibleLoansText: {
    flex: 1,
    marginLeft: 15,
  },
  accessibleLoansLabel: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 2,
  },
  accessibleLoansAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  applyButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  applyButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
    marginRight: 2,
  },
  projectCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  projectAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 10,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: colors.gray,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.lightBg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  projectStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.gray,
  },
  loanCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  loanInfo: {
    flex: 1,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  loanDate: {
    fontSize: 12,
    color: colors.gray,
  },
  loanAmountContainer: {
    alignItems: 'flex-end',
  },
  loanAmountLabel: {
    fontSize: 10,
    color: colors.gray,
    marginBottom: 2,
  },
  loanAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: colors.lightBg,
    padding: 10,
    borderRadius: 8,
  },
  loanDetail: {
    alignItems: 'center',
    flex: 1,
  },
  loanDetailLabel: {
    fontSize: 10,
    color: colors.gray,
    marginBottom: 2,
  },
  loanDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  dueSoon: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  loanStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  repayButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  repayButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5252',
    borderWidth: 2,
    borderColor: colors.primary
  },
});