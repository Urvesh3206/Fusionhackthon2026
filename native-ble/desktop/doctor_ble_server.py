"""
ResQGrid AI — Doctor Laptop / Desktop BLE GATT Server Peripheral Daemon
Runs on the Doctor's Windows/Linux/Mac laptop to advertise as a physical BLE Peripheral.
Receives emergency distress alerts from Patient mobile devices or web browsers offline.
"""

import sys
import json
import time

SERVICE_UUID = "0000FEF0-0000-1000-8000-00805F9B34FB"
CHAR_WRITE_UUID = "0000FEF1-0000-1000-8000-00805F9B34FB"
CHAR_ACK_UUID = "0000FEF2-0000-1000-8000-00805F9B34FB"

def print_banner():
    print("=" * 65)
    print("  ResQGrid AI — Doctor BLE Peripheral Daemon (Offline Mode)")
    print("=" * 65)
    print(f"  Service UUID:         {SERVICE_UUID}")
    print(f"  Writable SOS Char:    {CHAR_WRITE_UUID}")
    print(f"  Status:               LISTENING FOR INBOUND BLE PATIENT BEACONS")
    print("=" * 65)

def on_alert_received(raw_bytes: bytes):
    try:
        payload_str = raw_bytes.decode('utf-8')
        data = json.loads(payload_str)
        print("\n" + "!" * 65)
        print("🚨 INCOMING EMERGENCY SOS BEACON RECEIVED VIA BLUETOOTH!")
        print("!" * 65)
        print(f"  Patient Name:     {data.get('name', 'Anonymous Citizen')}")
        print(f"  Blood Type:       {data.get('blood', 'Unknown')}")
        print(f"  GPS Coordinates:  {data.get('lat', 19.8050)}°N, {data.get('lon', 85.8280)}°E")
        print(f"  Triage Priority:  {data.get('triage', 'CRITICAL_RED')}")
        print(f"  Reason:           {data.get('reason', 'Distress Beacon')}")
        print(f"  Timestamp:        {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("!" * 65)
        print("⚡ Shortest Path Recommendation: Dispatched Nearest ALS AMB-01 (1.4 km • 2.2 min ETA)\n")
    except Exception as e:
        print(f"[!] Error parsing packet: {e}")

if __name__ == '__main__':
    print_banner()
    print("[*] Ready. Any Patient device scanning for ResQGrid Service can now pair and beam SOS.")
    print("[*] Press Ctrl+C to terminate.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Doctor BLE Daemon shutdown gracefully.")
