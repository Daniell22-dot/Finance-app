@echo off
echo Setting up Finance Mobile App...

echo Cleaning up...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
del yarn.lock 2>nul

echo Creating package.json...
echo {
echo   "name": "finance-mobile",
echo   "version": "1.0.0",
echo   "main": "node_modules/expo/AppEntry.js",
echo   "scripts": {
echo     "start": "expo start",
echo     "android": "expo start --android",
echo     "ios": "expo start --ios",
echo     "web": "expo start --web"
echo   },
echo   "dependencies": {
echo     "expo": "~47.0.0",
echo     "expo-status-bar": "~1.4.2",
echo     "react": "18.1.0",
echo     "react-native": "0.70.5"
echo   },
echo   "devDependencies": {
echo     "@babel/core": "^7.12.9"
echo   },
echo   "private": true
echo } > package.json

echo Installing dependencies...
npm install

echo Creating app.json...
echo {
echo   "expo": {
echo     "name": "Finance Mobile App",
echo     "slug": "finance-mobile",
echo     "version": "1.0.0",
echo     "orientation": "portrait",
echo     "userInterfaceStyle": "light",
echo     "splash": {
echo       "image": "./assets/splash.png",
echo       "resizeMode": "contain",
echo       "backgroundColor": "#ffffff"
echo     },
echo     "assetBundlePatterns": [
echo       "**/*"
echo     ],
echo     "ios": {
echo       "supportsTablet": true
echo     },
echo     "android": {
echo       "adaptiveIcon": {
echo         "foregroundImage": "./assets/adaptive-icon.png",
echo         "backgroundColor": "#ffffff"
echo       }
echo     }
echo   }
echo } > app.json

mkdir assets 2>nul
echo. > assets/icon.png
echo. > assets/splash.png
echo. > assets/adaptive-icon.png

echo Creating App.js...
echo // App.js > App.js
echo import React from 'react'; >> App.js
echo import { StyleSheet, Text, View, Button, Alert } from 'react-native'; >> App.js
echo import { StatusBar } from 'expo-status-bar'; >> App.js
echo. >> App.js
echo export default function App() { >> App.js
echo   const testBackendConnection = async () => { >> App.js
echo     try { >> App.js
echo       const response = await fetch('http://localhost:5000/api/test'); >> App.js
echo       const data = await response.json(); >> App.js
echo       Alert.alert('Backend Status', data.message); >> App.js
echo     } catch (error) { >> App.js
echo       Alert.alert('Error', 'Cannot connect to backend'); >> App.js
echo     } >> App.js
echo   }; >> App.js
echo. >> App.js
echo   return ( >> App.js
echo     ^<View style={styles.container}^> >> App.js
echo       ^<Text style={styles.title}^>Finance App Mobile^</Text^> >> App.js
echo       ^<Text style={styles.subtitle}^>Manage your finances on the go^</Text^> >> App.js
echo       ^<View style={styles.buttonContainer}^> >> App.js
echo         ^<Button >> App.js
echo           title="Test Backend Connection" >> App.js
echo           onPress={testBackendConnection} >> App.js
echo           color="#007AFF" >> App.js
echo         /^> >> App.js
echo       ^</View^> >> App.js
echo       ^<StatusBar style="auto" /^> >> App.js
echo     ^</View^> >> App.js
echo   ); >> App.js
echo } >> App.js
echo. >> App.js
echo const styles = StyleSheet.create({ >> App.js
echo   container: { >> App.js
echo     flex: 1, >> App.js
echo     backgroundColor: '#f5f5f5', >> App.js
echo     alignItems: 'center', >> App.js
echo     justifyContent: 'center', >> App.js
echo     padding: 20, >> App.js
echo   }, >> App.js
echo   title: { >> App.js
echo     fontSize: 28, >> App.js
echo     fontWeight: 'bold', >> App.js
echo     color: '#333', >> App.js
echo     marginBottom: 10, >> App.js
echo   }, >> App.js
echo   subtitle: { >> App.js
echo     fontSize: 16, >> App.js
echo     color: '#666', >> App.js
echo     marginBottom: 30, >> App.js
echo   }, >> App.js
echo   buttonContainer: { >> App.js
echo     marginVertical: 20, >> App.js
echo     width: '80%', >> App.js
echo   }, >> App.js
echo }); >> App.js

echo Setup complete!
echo.
echo To start the app:
echo 1. Make sure backend is running: python app.py
echo 2. Run: npx expo start
echo 3. Scan QR code with Expo Go app on your phone
pause