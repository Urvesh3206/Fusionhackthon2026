import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, PermissionsAndroid, Platform } from 'react-native';
// Uses standard react-native-ble-manager
import BleManager from 'react-native-ble-manager';

const SERVICE_UUID = '0000FEF0-0000-1000-8000-00805F9B34FB';
const WRITE_CHAR_UUID = '0000FEF1-0000-1000-8000-00805F9B34FB';

export const PatientBleCentral: React.FC = () => {
  const [status, setStatus] = useState('Ready to broadcast SOS');
  const [isSending, setIsSending] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  const transmitSOSToDoctor = async () => {
    try {
      setIsSending(true);
      await requestPermissions();
      await BleManager.start({ showAlert: false });

      setStatus('Scanning for nearby Doctor BLE Service UUID...');

      // 1. Scan for Doctor Service UUID
      BleManager.scan([SERVICE_UUID], 5, true).then(() => {
        setStatus('Scanning active (5 sec timeout)...');
      });

      // 2. Discover & Connect handler
      const handleDiscover = async (peripheral: any) => {
        if (peripheral.advertising?.serviceUUIDs?.includes(SERVICE_UUID) || peripheral.id) {
          setStatus(`Doctor node found: ${peripheral.id}. Connecting...`);
          await BleManager.connect(peripheral.id);
          await BleManager.retrieveServices(peripheral.id);

          // 3. Prepare Emergency Payload
          const alertPayload = JSON.stringify({
            header: 'RESQGRID_BLE_SOS_v2',
            name: 'Priyanka Mohapatra',
            blood: 'O-Negative',
            lat: 19.8050,
            lon: 85.8280,
            triage: 'CRITICAL_RED',
            reason: 'Anaphylaxis & Respiratory Shock',
            time: Date.now()
          });

          // Convert string to byte array
          const bytes = Array.from(new TextEncoder().encode(alertPayload));

          // 4. Write to Doctor Writable Characteristic
          setStatus('Writing SOS payload to Doctor characteristic...');
          await BleManager.write(peripheral.id, SERVICE_UUID, WRITE_CHAR_UUID, bytes);

          setStatus('✓ Delivered! Doctor node acknowledged emergency beacon.');
          Alert.alert('SOS Transmitted', 'Your alert was delivered directly to the Doctor over Bluetooth!');
          setIsSending(false);
        }
      };

    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Citizen / Patient BLE SOS</Text>
      <Text style={styles.subtitle}>
        Central Scanner (Zero-Internet Direct Bluetooth Link)
      </Text>

      <TouchableOpacity
        style={[styles.sosButton, isSending && styles.btnDisabled]}
        onPress={transmitSOSToDoctor}
        disabled={isSending}
      >
        <Text style={styles.sosButtonText}>
          {isSending ? 'TRANSMITTING...' : '🚨 BEAM SOS TO DOCTOR'}
        </Text>
      </TouchableOpacity>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Bluetooth Telemetry Status:</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 20, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#f43f5e', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 28 },
  sosButton: { backgroundColor: '#e11d48', padding: 24, borderRadius: 24, alignItems: 'center', elevation: 8 },
  btnDisabled: { opacity: 0.6 },
  sosButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  statusBox: { backgroundColor: '#0f172a', padding: 16, borderRadius: 16, marginTop: 28, borderWidth: 1, borderColor: '#334155' },
  statusLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  statusText: { color: '#38bdf8', fontSize: 13, marginTop: 4, fontFamily: 'monospace' }
});
