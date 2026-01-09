import * as FileSystem from 'expo-file-system/legacy';

export async function downloadFile(uri: string, filename: string) {
  const target = `${FileSystem.documentDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(uri, target);
  return result.uri;
}
