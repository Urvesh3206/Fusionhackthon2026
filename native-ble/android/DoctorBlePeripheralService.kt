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
 * ResQGrid AI — Doctor BLE GATT Server (Peripheral Mode)
 * 
 * Runs on the Doctor's mobile device.
 * Continuously advertises custom ResQGrid Service UUID offline without internet.
 * Hosts a writable GATT Characteristic that receives emergency SOS packets from Patient devices.
 */
class DoctorBlePeripheralService(private val context: Context) {

    companion object {
        private const val TAG = "ResQGridDoctorBLE"

        // ResQGrid Standard Emergency BLE UUIDs
        val SERVICE_UUID: UUID = UUID.fromString("0000FEF0-0000-1000-8000-00805F9B34FB")
        val WRITE_CHAR_UUID: UUID = UUID.fromString("0000FEF1-0000-1000-8000-00805F9B34FB")
        val ACK_CHAR_UUID: UUID = UUID.fromString("0000FEF2-0000-1000-8000-00805F9B34FB")
    }

    private val bluetoothManager: BluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private var bleAdvertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null

    // Callback invoked when an incoming alert is received from a patient device
    var onEmergencyAlertReceived: ((EmergencyAlert) -> Unit)? = null

    data class EmergencyAlert(
        val patientName: String,
        val bloodType: String,
        val latitude: Double,
        val longitude: Double,
        val triagePriority: String,
        val description: String,
        val timestamp: Long
    )

    fun startServer(): Boolean {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            Log.e(TAG, "Bluetooth is disabled or not supported on this device.")
            return false
        }

        bleAdvertiser = bluetoothAdapter.bluetoothLeAdvertiser
        if (bleAdvertiser == null) {
            Log.e(TAG, "Device does not support Bluetooth Low Energy Peripheral advertising.")
            return false
        }

        // 1. Open GATT Server
        gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
        if (gattServer == null) {
            Log.e(TAG, "Unable to create BluetoothGattServer instance.")
            return false
        }

        // 2. Add ResQGrid Emergency Service & Characteristics
        val emergencyService = BluetoothGattService(
            SERVICE_UUID,
            BluetoothGattService.SERVICE_TYPE_PRIMARY
        )

        // Characteristic 1: Patient writes SOS Alert Payload
        val alertCharacteristic = BluetoothGattCharacteristic(
            WRITE_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        )

        // Characteristic 2: Doctor sends Acknowledgment / Dispatch status
        val ackCharacteristic = BluetoothGattCharacteristic(
            ACK_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ
        )

        emergencyService.addCharacteristic(alertCharacteristic)
        emergencyService.addCharacteristic(ackCharacteristic)
        gattServer?.addService(emergencyService)

        // 3. Start BLE Advertising
        startAdvertising()
        Log.i(TAG, "Doctor BLE GATT Server active and advertising service $SERVICE_UUID")
        return true
    }

    private fun startAdvertising() {
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .setTimeout(0) // Advertise indefinitely
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        bleAdvertiser?.startAdvertising(settings, data, advertiseCallback)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            Log.i(TAG, "BLE Peripheral Advertising started successfully.")
        }

        override fun onStartFailure(errorCode: Int) {
            Log.e(TAG, "BLE Peripheral Advertising failed with error code: $errorCode")
        }
    }

    private val gattServerCallback = object : BluetoothGattServerCallback() {

        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            val stateStr = if (newState == BluetoothProfile.STATE_CONNECTED) "CONNECTED" else "DISCONNECTED"
            Log.d(TAG, "Patient device ${device.address} connection state changed: $stateStr (status: $status)")
        }

        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            super.onCharacteristicWriteRequest(device, requestId, characteristic, preparedWrite, responseNeeded, offset, value)

            if (characteristic.uuid == WRITE_CHAR_UUID && value != null) {
                val jsonPayload = String(value, StandardCharsets.UTF_8)
                Log.i(TAG, "Received Emergency SOS Packet from ${device.address}: $jsonPayload")

                try {
                    val json = JSONObject(jsonPayload)
                    val alert = EmergencyAlert(
                        patientName = json.optString("name", "Unknown Citizen"),
                        bloodType = json.optString("blood", "Unknown"),
                        latitude = json.optJSONArray("gps")?.optDouble(0) ?: json.optDouble("lat", 19.8135),
                        longitude = json.optJSONArray("gps")?.optDouble(1) ?: json.optDouble("lon", 85.8312),
                        triagePriority = json.optString("triage", "CRITICAL_RED"),
                        description = json.optString("reason", "Emergency SOS via Bluetooth Peripheral Link"),
                        timestamp = json.optLong("time", System.currentTimeMillis())
                    )

                    // Dispatch to UI listener on Doctor device
                    onEmergencyAlertReceived?.invoke(alert)

                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse incoming emergency payload: ${e.message}")
                }

                // Send GATT Write Success Response
                if (responseNeeded) {
                    gattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_SUCCESS,
                        0,
                        "ACK_DISPATCH_RECEIVED".toByteArray(StandardCharsets.UTF_8)
                    )
                }
            } else if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, 0, null)
            }
        }
    }

    fun stopServer() {
        try {
            bleAdvertiser?.stopAdvertising(advertiseCallback)
            gattServer?.close()
            gattServer = null
            Log.i(TAG, "Doctor BLE GATT Server stopped.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping GATT Server: ${e.message}")
        }
    }
}
