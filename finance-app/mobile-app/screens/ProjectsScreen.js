import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, Image
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { projectsAPI } from '../services/api';

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

export default function ProjectsScreen({ route, navigation }) {
  const [activeTab, setActiveTab] = useState('myProjects');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [projectData, setProjectData] = useState({
    title: '',
    location: '',
    businessCategory: '',
    description: '',
    budgetAmount: '',
    myAllocation: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);

  // Document states
  const [documents, setDocuments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Real project data from API
  const [myProjects, setMyProjects] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        // Get user data from route params
        const user = route.params?.user;
        const token = route.params?.access_token || route.params?.token;

        if (user && token) {
          setUserToken(token);
          setUserId(user.id);

          // Load projects
          await loadUserProjects(user.id, token);
          await loadAvailableProjects();
        }
      } catch (error) {
        console.error('Error initializing projects screen:', error);
      }
    };

    initializeScreen();
  }, [route.params]);

  const loadUserProjects = async (userId, token) => {
    try {
      const response = await projectsAPI.getUserProjects(userId, token);
      if (response.projects) {
        setMyProjects(response.projects.map(p => ({
          id: p.id,
          title: p.title,
          category: p.business_category,
          budget: p.budget_amount,
          bid: p.my_allocation,
          collected: p.collected_amount,
          progress: p.percentage || 0,
          documents: []
        })));
      }
    } catch (error) {
      console.warn('Could not load user projects:', error);
      setMyProjects([]); // Start with empty
    }
  };

  const loadAvailableProjects = async () => {
    try {
      const response = await projectsAPI.getAvailableProjects();
      if (response.projects) {
        setAvailableProjects(response.projects.map(p => ({
          id: p.id,
          title: p.title,
          category: p.business_category,
          budget: p.budget_amount,
          required: p.required_amount,
          collected: p.collected_amount,
          progress: p.percentage || 0,
          investors: p.investors,
          roi: p.roi
        })));
      }
    } catch (error) {
      console.warn('Could not load available projects:', error);
      setAvailableProjects([]); // Start with empty
    }
  };

  const handleInputChange = (field, value) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = () => {
    Alert.alert(
      'Upload Document',
      'Choose document type:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Take Photo',
          onPress: () => launchCamera()
        },
        {
          text: 'Choose from Gallery',
          onPress: () => launchImageLibrary()
        },
        {
          text: 'Choose PDF/DOC',
          onPress: () => launchDocumentPicker()
        }
      ]
    );
  };

  const launchCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Rejected', 'You need to allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      handleFileUpload(result.assets[0]);
    }
  };

  const launchImageLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Rejected', 'You need to allow access to your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      handleFileUpload(result.assets[0]);
    }
  };

  const launchDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        handleFileUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleFileUpload = async (file) => {
    if (!userToken) {
      Alert.alert('Error', 'Authentication required for uploads');
      return;
    }

    setUploading(true);
    setUploadProgress(0.1); // Visual start

    try {
      // Prepare file data
      const fileUri = file.uri;
      const fileName = file.name || file.fileName || (fileUri.split('/').pop());
      const fileType = file.mimeType || file.type || getFileTypeFromUri(fileUri);

      const response = await projectsAPI.uploadFile({
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        name: fileName,
        type: fileType,
      }, userToken);

      if (response.file_url) {
        const newDocument = {
          id: documents.length + 1,
          name: fileName,
          size: formatFileSize(file.size || file.fileSize || 0),
          type: getFileType(fileName),
          date: new Date().toLocaleDateString(),
          uploaded: true,
          url: response.file_url
        };

        setDocuments(prevDocs => [...prevDocs, newDocument]);
        Alert.alert('Success', 'Document uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Error', error.error || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileTypeFromUri = (uri) => {
    const ext = uri.split('.').pop().toLowerCase();
    const mimeMap = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return mimeMap[ext] || 'application/octet-stream';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (fileName) => {
    if (!fileName) return 'Document';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Word';
    if (['xls', 'xlsx'].includes(ext)) return 'Excel';
    if (['ppt', 'pptx'].includes(ext)) return 'PowerPoint';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'Image';
    return 'Document';
  };

  const removeDocument = (index) => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedDocs = [...documents];
            updatedDocs.splice(index, 1);
            setDocuments(updatedDocs);
          }
        }
      ]
    );
  };



  const handleEditPress = (project) => {
    setProjectData({
      title: project.title,
      location: project.location || '',
      businessCategory: project.category,
      description: project.description || '',
      budgetAmount: project.budget.toString(),
      myAllocation: project.bid.toString()
    });
    setEditingProjectId(project.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setProjectData({
      title: '',
      location: '',
      businessCategory: '',
      description: '',
      budgetAmount: '',
      myAllocation: ''
    });
    setDocuments([]);
    setIsEditing(false);
    setEditingProjectId(null);
  };

  const validateForm = () => {
    if (!projectData.title.trim()) {
      Alert.alert('Error', 'Please enter a project title');
      return false;
    }
    if (!projectData.budgetAmount || parseFloat(projectData.budgetAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return false;
    }
    if (!projectData.businessCategory.trim()) {
      Alert.alert('Error', 'Please select a business category');
      return false;
    }
    if (!projectData.description.trim() || projectData.description.length < 50) {
      Alert.alert('Error', 'Please enter a detailed description (minimum 50 characters)');
      return false;
    }
    return true;
  };

  const handleSubmitProject = async () => {
    if (!validateForm()) return;
    if (!userToken || !userId) {
      Alert.alert('Error', 'User authentication required');
      return;
    }

    setLoading(true);
    try {
      const projectPayload = {
        title: projectData.title,
        location: projectData.location,
        business_category: projectData.businessCategory,
        description: projectData.description,
        budget_amount: parseFloat(projectData.budgetAmount),
        my_allocation: parseFloat(projectData.myAllocation) || 0
      };

      if (isEditing) {
        await projectsAPI.updateProject(editingProjectId, projectPayload, userToken);
        Alert.alert('Success', 'Project updated successfully!');
        await loadUserProjects(userId, userToken);
      } else {
        const response = await projectsAPI.createProject(projectPayload, userToken);
        await loadUserProjects(userId, userToken);
        Alert.alert(
          'Success',
          'Project submitted successfully!\n\nYour project will be reviewed and activated within 24-48 hours.'
        );
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.error || 'Failed to submit project. Please try again.');
      console.error('Project submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = (project) => {
    navigation.navigate('Funds', {
      projectToInvest: project,
      investmentAmount: project.required || project.bid
    });
  };

  const renderProjectCard = (project, isMyProject = true) => (
    <View key={project.id} style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.projectInfo}>
          <Text style={styles.projectTitle}>{project.title}</Text>
          <View style={styles.projectMeta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{project.category}</Text>
            </View>
            {!isMyProject && project.roi && (
              <View style={styles.roiBadge}>
                <Text style={styles.roiText}>ROI: {project.roi}</Text>
              </View>
            )}
          </View>
        </View>
        {!isMyProject && (
          <View style={styles.investorsBadge}>
            <Ionicons name="people" size={14} color={colors.white} />
            <Text style={styles.investorsText}>{project.investors}</Text>
          </View>
        )}
      </View>

      <View style={styles.projectDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>
            {isMyProject ? 'My Allocation' : 'Required'}
          </Text>
          <Text style={styles.detailValue}>
            KSH {isMyProject ? project.bid?.toLocaleString() : project.required?.toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Collected</Text>
          <Text style={styles.detailValue}>KSH {project.collected?.toLocaleString()}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Progress</Text>
          <Text style={styles.progressValue}>{project.progress}%</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Funding Progress</Text>
          <Text style={styles.progressPercentage}>{project.progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${project.progress}%`,
                backgroundColor: project.progress >= 100 ? colors.secondary : colors.accent
              }
            ]}
          />
        </View>
      </View>

      {project.documents && project.documents.length > 0 && (
        <View style={styles.documentsSection}>
          <Text style={styles.documentsLabel}>Attached Documents:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {project.documents.map((doc, index) => (
              <View key={index} style={styles.documentBadge}>
                <Ionicons name="document-text" size={14} color={colors.primary} />
                <Text style={styles.documentText} numberOfLines={1}>
                  {doc}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.projectActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>

        {isMyProject ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditPress(project)}
          >
            <Ionicons name="create" size={16} color={colors.white} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.investButton]}
            onPress={() => handleInvest(project)}
          >
            <Ionicons name="trending-up" size={16} color={colors.white} />
            <Text style={styles.investButtonText}>Invest Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderUploadedDocuments = () => (
    <View style={styles.uploadedDocuments}>
      <Text style={styles.documentsTitle}>Uploaded Documents ({documents.length})</Text>

      {documents.length === 0 ? (
        <Text style={styles.noDocumentsText}>No documents uploaded yet</Text>
      ) : (
        documents.map((doc, index) => (
          <View key={index} style={styles.documentItem}>
            <View style={styles.documentInfo}>
              <Ionicons
                name={doc.type === 'PDF' ? 'document-text' :
                  doc.type === 'Image' ? 'image' : 'document'}
                size={24}
                color={colors.primary}
              />
              <View style={styles.documentDetails}>
                <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                <Text style={styles.documentMeta}>{doc.size} • {doc.type} • {doc.date}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => removeDocument(index)}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Z10</Text>
            <Text style={styles.logoSubText}>GROUP</Text>
          </View>
          <Text style={styles.headerTitle}>Projects</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
          disabled={showForm || loading}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myProjects' && styles.activeTab]}
          onPress={() => setActiveTab('myProjects')}
          disabled={showForm || loading}
        >
          <Ionicons
            name="folder"
            size={18}
            color={activeTab === 'myProjects' ? colors.white : colors.primary}
          />
          <Text style={[styles.tabText, activeTab === 'myProjects' && styles.activeTabText]}>
            My Projects
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
          disabled={showForm || loading}
        >
          <Ionicons
            name="search"
            size={18}
            color={activeTab === 'browse' ? colors.white : colors.primary}
          />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse Projects
          </Text>
        </TouchableOpacity>
      </View>

      {showForm ? (
        <ScrollView style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.formTitle}>{isEditing ? 'Edit Project' : 'Create New Project'}</Text>
          </View>

          <Text style={styles.formSubtitle}>
            Fill in the details below to create a new investment project
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Project Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter project title"
              value={projectData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              placeholderTextColor={colors.gray}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter location (e.g., Nairobi, Kenya)"
              value={projectData.location}
              onChangeText={(text) => handleInputChange('location', text)}
              placeholderTextColor={colors.gray}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Category *</Text>
            <View style={styles.categoryOptions}>
              {['Agriculture', 'Technology', 'Retail', 'Manufacturing', 'Real Estate', 'Transportation'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    projectData.businessCategory === category && styles.selectedCategoryOption
                  ]}
                  onPress={() => handleInputChange('businessCategory', category)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    projectData.businessCategory === category && styles.selectedCategoryOptionText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Or enter custom category"
              value={projectData.businessCategory}
              onChangeText={(text) => handleInputChange('businessCategory', text)}
              placeholderTextColor={colors.gray}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Project Description *</Text>
            <Text style={styles.inputHint}>Minimum 50 characters</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your project in detail..."
              value={projectData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              multiline
              numberOfLines={4}
              placeholderTextColor={colors.gray}
              editable={!loading}
            />
            <Text style={styles.charCount}>
              {projectData.description.length} characters
            </Text>
          </View>

          <View style={styles.budgetContainer}>
            <View style={styles.budgetInput}>
              <Text style={styles.inputLabel}>Budget Amount (KES) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={projectData.budgetAmount}
                onChangeText={(text) => handleInputChange('budgetAmount', text)}
                keyboardType="numeric"
                placeholderTextColor={colors.gray}
                editable={!loading}
              />
            </View>

            <View style={styles.budgetInput}>
              <Text style={styles.inputLabel}>My Allocation (KES)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your allocation"
                value={projectData.myAllocation}
                onChangeText={(text) => handleInputChange('myAllocation', text)}
                keyboardType="numeric"
                placeholderTextColor={colors.gray}
                editable={!loading}
              />
            </View>
          </View>

          {/* Document Upload Section */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Supporting Documents</Text>
            <Text style={styles.sectionSubtitle}>
              Upload business plans, financial projections, or other relevant documents
            </Text>

            {uploading ? (
              <View style={styles.uploadProgressContainer}>
                <View style={styles.uploadProgressBar}>
                  <View
                    style={[
                      styles.uploadProgressFill,
                      { width: `${uploadProgress}%` }
                    ]}
                  />
                </View>
                <Text style={styles.uploadProgressText}>
                  Uploading... {uploadProgress}%
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleDocumentUpload}
                disabled={loading}
              >
                <Ionicons name="cloud-upload" size={24} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Upload Documents</Text>
                <Text style={styles.uploadHint}>
                  PDF, DOC, XLS, PPT, Images (Max 10MB each)
                </Text>
              </TouchableOpacity>
            )}

            {documents.length > 0 && renderUploadedDocuments()}
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => setShowForm(false)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formButton, styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmitProject}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                  <Text style={styles.submitButtonText}>Submit Project</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.projectsContainer}>
          {activeTab === 'myProjects' ? (
            <>
              {myProjects.length > 0 ? (
                myProjects.map((project) => renderProjectCard(project, true))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={60} color={colors.gray} />
                  <Text style={styles.emptyStateText}>No projects yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create your first project to start investing
                  </Text>
                  <TouchableOpacity
                    style={styles.createFirstButton}
                    onPress={() => setShowForm(true)}
                  >
                    <Ionicons name="add-circle" size={20} color={colors.white} />
                    <Text style={styles.createFirstButtonText}>Create First Project</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              {availableProjects.length > 0 ? (
                availableProjects.map((project) => renderProjectCard(project, false))
              ) : (
                <View style={styles.placeholderContainer}>
                  <Ionicons name="search" size={60} color={colors.accent} />
                  <Text style={styles.placeholderText}>Investment Opportunities</Text>
                  <Text style={styles.placeholderSubtext}>
                    Browse available projects to invest in
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  headerLeft: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
  },
  logoSubText: {
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
  addButton: {
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.lightBg,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  activeTabText: {
    color: colors.white,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 25,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: colors.primary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'right',
    marginTop: 5,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryOption: {
    backgroundColor: colors.lightBg,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCategoryOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  selectedCategoryOptionText: {
    color: colors.white,
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  budgetInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  uploadSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 15,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: colors.lightBg,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 10,
    marginBottom: 5,
  },
  uploadHint: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
  },
  uploadProgressContainer: {
    backgroundColor: colors.lightBg,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  uploadProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  uploadProgressText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
  },
  uploadedDocuments: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 15,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  noDocumentsText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.lightBg,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 15,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  documentMeta: {
    fontSize: 12,
    color: colors.gray,
  },
  removeButton: {
    padding: 5,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  formButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.lightBg,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 10,
  },
  projectsContainer: {
    flex: 1,
    padding: 20,
  },
  projectCard: {
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
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: colors.lightBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  roiBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roiText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
  },
  investorsBadge: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  investorsText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  projectDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  progressSection: {
    marginBottom: 15,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
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
    borderRadius: 4,
  },
  documentsSection: {
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  documentsLabel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 10,
  },
  documentBadge: {
    backgroundColor: colors.lightBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
  },
  documentText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 5,
    maxWidth: 120,
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 5,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 5,
  },
  investButton: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  investButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
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
    marginBottom: 20,
  },
  createFirstButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createFirstButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
});