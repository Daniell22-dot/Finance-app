import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
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
  warning: '#FFA726',
  error: '#FF6B6B'
};

export default function PortfolioScreen({ route, navigation }) {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Get user data from route params
    const user = route.params?.user;
    const token = route.params?.access_token || route.params?.token;

    if (user && token) {
      setUserId(user.id);
      setUserToken(token);
      loadPortfolioData(user.id, token);
    } else {
      // For testing, use default values
      setUserId(1);
      setUserToken('test-token');
      loadPortfolioData(1, 'test-token');
    }
  }, [route.params]);

  const loadPortfolioData = async (userId, token) => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getDashboard(userId, token);
      setPortfolioData(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      // For demo purposes, use sample data if API fails
      setPortfolioData({
        portfolio: {
          balance: 75000,
          loan_amount: 10000,
          accessible_loans: 50000
        },
        projects: [
          {
            id: 1,
            title: 'Farm Project',
            business_category: 'Agriculture',
            budget_amount: 50000,
            my_allocation: 5000,
            bid_amount: 5000,
            collected_amount: 37500,
            percentage: 75,
            status: 'Active'
          },
          {
            id: 2,
            title: 'Tech Startup',
            business_category: 'Technology',
            budget_amount: 150000,
            my_allocation: 15000,
            bid_amount: 15000,
            collected_amount: 60000,
            percentage: 40,
            status: 'Active'
          },
          {
            id: 3,
            title: 'Retail Business',
            business_category: 'Retail',
            budget_amount: 80000,
            my_allocation: 8000,
            bid_amount: 8000,
            collected_amount: 80000,
            percentage: 100,
            status: 'Completed'
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
      loadPortfolioData(userId, userToken);
    }
  };

  const formatCurrency = (amount) => {
    return `KES ${amount?.toLocaleString() || '0'}`;
  };

  const calculateTotalInvested = () => {
    if (!portfolioData?.projects) return 0;
    return portfolioData.projects.reduce((total, project) => total + (project.my_allocation || 0), 0);
  };

  const calculateTotalReturns = () => {
    if (!portfolioData?.projects) return 0;
    return portfolioData.projects.reduce((total, project) => {
      const investment = project.my_allocation || 0;
      const collected = project.collected_amount || 0;
      const percentage = project.percentage || 0;
      const returnAmount = (percentage / 100) * investment;
      return total + returnAmount;
    }, 0);
  };

  const calculateROI = (investment, returns) => {
    if (!investment || investment === 0) return '0%';
    return `${((returns / investment) * 100).toFixed(1)}%`;
  };

  const getActiveProjectsCount = () => {
    if (!portfolioData?.projects) return 0;
    return portfolioData.projects.filter(project => project.percentage < 100).length;
  };

  const getCompletedProjectsCount = () => {
    if (!portfolioData?.projects) return 0;
    return portfolioData.projects.filter(project => project.percentage >= 100).length;
  };

  const handleAddFunds = () => {
    navigation.navigate('Funds', {
      user: route.params?.user,
      token: route.params?.token
    });
  };

  const handleNewProject = () => {
    navigation.navigate('Projects', {
      user: route.params?.user,
      token: route.params?.token
    });
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Funds',
      'Withdrawal feature coming soon. You can manage withdrawals in the Funds section.',
      [{ text: 'OK' }]
    );
  };

  if (loading && !portfolioData) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>Z10</Text>
          <Text style={styles.loadingLogoSub}>GROUP</Text>
        </View>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading Portfolio...</Text>
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
          <Text style={styles.headerTitle}>Portfolio</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={22}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'investments' && styles.activeTab]}
          onPress={() => setActiveTab('investments')}
        >
          <Text style={[styles.tabText, activeTab === 'investments' && styles.activeTabText]}>
            Investments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'performance' && styles.activeTab]}
          onPress={() => setActiveTab('performance')}
        >
          <Text style={[styles.tabText, activeTab === 'performance' && styles.activeTabText]}>
            Performance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Ionicons name="wallet-outline" size={24} color={colors.accent} />
          <Text style={styles.balanceLabel}>Total Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>
          {formatCurrency(portfolioData?.portfolio?.balance || 0)}
        </Text>

        <View style={styles.balanceBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Total Invested</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(calculateTotalInvested())}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Total Returns</Text>
            <Text style={[styles.breakdownValue, styles.positiveReturn]}>
              +{formatCurrency(calculateTotalReturns())}
            </Text>
          </View>
        </View>

        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Active Loans</Text>
            <Text style={styles.balanceStatValue}>
              {formatCurrency(portfolioData?.portfolio?.loan_amount || 0)}
            </Text>
          </View>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Accessible</Text>
            <Text style={styles.balanceStatValue}>
              {formatCurrency(portfolioData?.portfolio?.accessible_loans || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="trending-up" size={24} color={colors.secondary} />
          </View>
          <Text style={styles.statNumber}>{getActiveProjectsCount()}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="checkmark-done" size={24} color={colors.warning} />
          </View>
          <Text style={styles.statNumber}>{getCompletedProjectsCount()}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="pie-chart" size={24} color="#1976D2" />
          </View>
          <Text style={styles.statNumber}>
            {portfolioData?.projects?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="bar-chart" size={24} color="#7B1FA2" />
          </View>
          <Text style={styles.statNumber}>
            {calculateROI(calculateTotalInvested(), calculateTotalReturns())}
          </Text>
          <Text style={styles.statLabel}>ROI</Text>
        </View>
      </View>

      {/* My Investments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Investments</Text>
          <Text style={styles.sectionSubtitle}>
            Total: {formatCurrency(calculateTotalInvested())}
          </Text>
        </View>

        {portfolioData?.projects?.map((project, index) => {
          const investment = project.my_allocation || 0;
          const returns = calculateTotalReturns();
          const roi = calculateROI(investment, returns);

          return (
            <View key={index} style={styles.investmentCard}>
              <View style={styles.investmentHeader}>
                <View style={styles.investmentInfo}>
                  <Text style={styles.projectName}>{project.title}</Text>
                  <Text style={styles.projectCategory}>{project.business_category}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: project.percentage >= 100 ? colors.secondary : colors.warning }
                ]}>
                  <Text style={styles.statusText}>
                    {project.percentage >= 100 ? 'Completed' : 'Active'}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount Invested:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(investment)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Returns:</Text>
                  <Text style={[styles.detailValue, styles.positiveReturn]}>
                    +{formatCurrency(project.collected_amount || 0)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Progress:</Text>
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>{project.percentage}%</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(project.percentage, 100)}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ROI:</Text>
                  <Text style={[
                    styles.detailValue,
                    parseFloat(roi) > 0 ? styles.positiveReturn : styles.negativeReturn
                  ]}>
                    {roi}
                  </Text>
                </View>
              </View>

              <View style={styles.investmentActions}>
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.trackButton}>
                  <Ionicons name="stats-chart" size={16} color={colors.primary} />
                  <Text style={styles.trackButtonText}>Track</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {(!portfolioData?.projects || portfolioData.projects.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={colors.gray} />
            <Text style={styles.emptyStateText}>No investments yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start investing in projects to build your portfolio
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddFunds}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="add-circle" size={28} color={colors.secondary} />
            </View>
            <Text style={styles.actionText}>Add Funds</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleNewProject}>
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="business" size={28} color="#1976D2" />
            </View>
            <Text style={styles.actionText}>New Project</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="cash" size={28} color={colors.warning} />
            </View>
            <Text style={styles.actionText}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Dashboard')}>
            <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="analytics" size={28} color="#7B1FA2" />
            </View>
            <Text style={styles.actionText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Performance Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        <View style={styles.performanceCard}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Total Value</Text>
            <Text style={styles.performanceValue}>
              {formatCurrency((portfolioData?.portfolio?.balance || 0) + calculateTotalInvested())}
            </Text>
          </View>

          <View style={styles.performanceDivider} />

          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Monthly Return</Text>
            <Text style={[styles.performanceValue, styles.positiveReturn]}>
              +{formatCurrency(calculateTotalReturns() / 12)}
            </Text>
          </View>

          <View style={styles.performanceDivider} />

          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>YTD Return</Text>
            <Text style={[styles.performanceValue, styles.positiveReturn]}>
              +{calculateROI(calculateTotalInvested(), calculateTotalReturns())}
            </Text>
          </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 5,
  },
  refreshButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.lightBg,
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  activeTabText: {
    color: colors.white,
  },
  balanceCard: {
    backgroundColor: colors.lightBg,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 10,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 5,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  positiveReturn: {
    color: colors.secondary,
  },
  negativeReturn: {
    color: colors.error,
  },
  balanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceStat: {
    alignItems: 'center',
    flex: 1,
  },
  balanceStatLabel: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 5,
  },
  balanceStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 25,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 80,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '600',
  },
  investmentCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  investmentInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  projectCategory: {
    fontSize: 12,
    color: colors.gray,
    backgroundColor: colors.lightBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  investmentDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.gray,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    textAlign: 'right',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  progressText: {
    fontSize: 12,
    color: colors.primary,
    marginRight: 10,
    minWidth: 30,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.lightBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 3,
  },
  investmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  viewButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  trackButton: {
    flex: 1,
    backgroundColor: colors.lightBg,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 5,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  performanceCard: {
    backgroundColor: colors.lightBg,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  performanceItem: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  performanceLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 5,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  performanceDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
  },
});