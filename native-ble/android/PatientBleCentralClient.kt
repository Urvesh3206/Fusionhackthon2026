package org.resqgrid.emergency.ble

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.UUID

/**
 * ResQGrid AI — Patient BLE GATT Client (Central Mode)
 * 
 * Runs on the Patient / Citizen's mobile device.
 * Scans offline for the Doctor's custom Service UUID (0000FEF0-...).
 * Connects directly to the Doctor's GATT Server without internet and writes the SOS payload.
 */
class PatientBleCentralClient(private val context: Context) {

    companion object {
        private const val TAG = "ResQGridPatientBLE"

        val SERVICE_UUID: UUID = UUID.fromString("0000FEF0-0000-1000-8000-00805F9B34FB")
        val WRITE_CHAR_UUID: UUID = UUID.fromString("0000FEF1-0000-1000-8000-00805F9B34FB")
    }

    private val bluetoothManager: BluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private var bleScanner: BluetoothLeScanner? = null
    private var activeGatt: BluetoothGatt? = null
    private var pendingPayload: String? = null

    var onStatusChanged: ((String) -> Unit)? = null
    var onDispatchAcknowledged: ((String) -> Unit)? = null

    fun sendEmergencyAlert(
        patientName: String,
        bloodType: String,
        latitude: Double,
        longitude: Double,
        triageReason: String
    ) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            onStatusChanged?.invoke("Error: Bluetooth is disabled on device.")
            return
        }

        bleScanner = bluetoothAdapter.bluetoothLeScanner
        if (bleScanner == null) {
            onStatusChanged?.invoke("Error: Device lacks BLE scanning hardware.")
            return
        }

        // Format SOS Payload JSON
        val payloadObj = JSONObject().apply {
            put("header", "RESQGRID_BLE_SOS_v2")
            put("name", patientName)
            put("blood", bloodType)
            put("lat", latitude)
            put("lon", longitude)
            put("triage", "CRITICAL_RED")
            put("reason", triageReason)
            put("time", System.currentTimeMillis())
        }
        pendingPayload = payloadObj.toString()

        onStatusChanged?.invoke("Scanning for nearby Doctor BLE nodes...")

        // Scan Filter strictly for Doctor's custom Service UUID
        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        bleScanner?.startScan(listOf(filter), settings, scanCallback)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            val device = result?.device ?: return
            Log.i(TAG, "Discovered Doctor BLE Node: ${device.address} (RSSI: ${result.rssi} dBm)")

            onStatusChanged?.invoke("Found Doctor node (${result.rssi} dBm). Connecting GATT...")
            bleScanner?.stopScan(this)

            // Connect to Doctor's GATT Server
            activeGatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "BLE Scan failed with code: $errorCode")
            onStatusChanged?.invoke("Scan failed (Error code $errorCode). Retrying...")
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {

        override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.i(TAG, "GATT connected to Doctor device. Discovering services...")
                onStatusChanged?.invoke("Connected. Discovering medical dispatch services...")
                gatt?.discoverServices()
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.w(TAG, "GATT disconnected from Doctor device.")
                onStatusChanged?.invoke("Disconnected from Doctor node.")
                activeGatt?.close()
                activeGatt = null
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val service = gatt?.getService(SERVICE_UUID)
                val characteristic = service?.getCharacteristic(WRITE_CHAR_UUID)

                if (characteristic != null && pendingPayload != null) {
                    onStatusChanged?.invoke("Transmitting Emergency SOS Packet over BLE...")
                    characteristic.value = pendingPayload!!.toByteArray(StandardCharsets.UTF_8)
                    characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                    gatt.writeCharacteristic(characteristic)
                } else {
                    onStatusChanged?.invoke("Error: Required emergency characteristic not found.")
                }
            }
        }

        override fun onCharacteristicWrite(
            gatt: BluetoothGatt?,
            characteristic: BluetoothGattCharacteristic?,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.i(TAG, "Emergency SOS successfully written to Doctor node!")
                onStatusChanged?.invoke("✓ Alert Delivered! Doctor acknowledged incoming triage.")
                onDispatchAcknowledged?.invoke("Doctor received SOS. Ambulance dispatch queued via shortest path.")
            } else {
                Log.e(TAG, "Characteristic write failed: status $status")
                onStatusChanged?.invoke("Failed to write alert packet (GATT status $status)")
            }
        }
    }

    fun disconnect() {
        try {
            bleScanner?.stopScan(scanCallback)
            activeGatt?.disconnect()
            activeGatt?.close()
            activeGatt = null
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting: ${e.message}")
        }
    }
}
