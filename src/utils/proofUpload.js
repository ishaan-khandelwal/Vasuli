import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../services/api';

/**
 * Prompts user for gallery permission and launches image picker.
 * Returns the selected image asset or null if cancelled/denied.
 */
export const pickProofImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photos so you can attach payment receipts.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName || `proof_${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.warn('Error picking proof image:', error);
    Alert.alert('Error', 'Could not open image picker.');
    return null;
  }
};

/**
 * Uploads an image to the backend /api/upload/proof endpoint.
 * Returns the public URL of the uploaded image.
 */
export const uploadProofImage = async (imageUri, token) => {
  if (!imageUri) {
    throw new Error('No image URI specified for upload.');
  }

  const filename = imageUri.split('/').pop() || `proof_${Date.now()}.jpg`;
  const extensionMatch = /\.(\w+)$/.exec(filename);
  const ext = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('proof', {
    uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
    name: filename,
    type: mimeType,
  });

  const uploadEndpoint = `${API_URL}/upload/proof`;

  const headers = {
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(uploadEndpoint, {
    method: 'POST',
    headers,
    body: formData,
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid response from upload server.');
  }

  if (!response.ok || !data?.url) {
    throw new Error(data?.message || 'Failed to upload payment proof.');
  }

  return data.url;
};
