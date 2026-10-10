import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, PermissionsAndroid, Platform } from 'react-native';
// Uses standard react-native-ble-peripheral or react-native-peripheral package
import BLEPeripheral from 'react-native-ble-peripheral';

const SERVICE_UUID = '0000FEF0-0000-1000-8000-00805F9B34FB';
const WRITE_CHAR_UUID = '0000FEF1-0000-1000-8000-00805F9B34FB';

export const DoctorBlePeripheral: React.FC = () => {
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [incomingAlert, setIncomingAlert] = useState<any | null>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      BLEPeripheral.stop();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  const startDoctorGattServer = async () => {
    try {
      // 1. Initialize Service & Writable Characteristic
      await BLEPeripheral.addService(SERVICE_UUID, true);
      await BLEPeripheral.addCharacteristicToService(
        SERVICE_UUID,
        WRITE_CHAR_UUID,
        16 | 8, // Read | Write permissions
        2 | 8   // Properties: Read | Write
      );

      // 2. Listen for Patient SOS writes
      BLEPeripheral.onCharacteristicWrite((charUuid: string, value: string) => {
        if (charUuid.toLowerCase() === WRITE_CHAR_UUID.toLowerCase()) {
          try {
            const parsed = JSON.parse(decodeURIComponent(escape(atob(value))));
            setIncomingAlert(parsed);
            Alert.alert(
              '🚨 INCOMING PATIENT SOS',
              `Patient: ${parsed.name}\nBlood: ${parsed.blood}\nGPS: ${parsed.lat}, ${parsed.lon}\nTriage: ${parsed.triage}`
            );
          } catch {
            setIncomingAlert({ raw: value });
          }
        }
      });

      // 3. Start Advertising custom ResQGrid Service UUID
      await BLEPeripheral.setName('ResQGrid-Doctor-Node');
      await BLEPeripheral.start();
      setIsAdvertising(true);
    } catch (err: any) {
      Alert.alert('GATT Server Error', err.message);
    }
  };

  const stopDoctorGattServer = async () => {
    await BLEPeripheral.stop();
    setIsAdvertising(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👨‍⚕️ Doctor BLE GATT Server</Text>
      <Text style={styles.subtitle}>
        Peripheral Advertiser (Zero-Network Offline Mode)
      </Text>

      <TouchableOpacity
        style={[styles.button, isAdvertising ? styles.btnStop : styles.btnStart]}
        onPress={isAdvertising ? stopDoctorGattServer : startDoctorGattServer}
      >
        <Text style={styles.btnText}>
          {isAdvertising ? '■ Stop Advertising Service' : '▶ Start GATT Server & Advertise'}
        </Text>
      </TouchableOpacity>

      {incomingAlert && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>🚨 Inbound Patient Triage Wave:</Text>
          <Text style={styles.alertText}>Patient: {incomingAlert.name || 'Anonymous'}</Text>
          <Text style={styles.alertText}>Blood Group: {incomingAlert.blood || 'Unknown'}</Text>
          <Text style={styles.alertText}>Location: {incomingAlert.lat}°N, {incomingAlert.lon}°E</Text>
          <Text style={styles.alertText}>Reason: {incomingAlert.reason || 'Medical Emergency'}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 20, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#10b981', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  button: { padding: 16, borderRadius: 16, alignItems: 'center' },
  btnStart: { backgroundColor: '#059669' },
  btnStop: { backgroundColor: '#e11d48' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  alertCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginTop: 24, borderWidth: 1, borderColor: '#f43f5e' },
  alertTitle: { color: '#fb7185', fontWeight: 'bold', marginBottom: 8 },
  alertText: { color: '#f8fafc', fontSize: 13, marginBottom: 4 }
});
