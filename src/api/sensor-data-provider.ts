const SENSOR_DATA_URL = 'https://bg1.joelface.com/sensor/data';
const SENSOR_DATA_USES = 5;
const AES_GCM_IV_LENGTH = 12;
const SENSOR_DATA_KEY = 'hFK/SpnRKEoKKGjDahJBaP70niDSIMZTJM5+xeBtn60';

let keyPromise: Promise<CryptoKey> | undefined;
let sensorDataPromise: Promise<string> = Promise.resolve('');
let sensorDataUses = SENSOR_DATA_USES;

function binaryStringToBytes(value: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i);
  return bytes;
}

function bytesToBinaryString(value: ArrayBuffer): string {
  let result = '';
  for (const byte of new Uint8Array(value)) {
    result += String.fromCodePoint(byte);
  }
  return result;
}

function getKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    'raw',
    binaryStringToBytes(atob(SENSOR_DATA_KEY)),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
  return keyPromise;
}

async function decryptSensorData(payload: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(payload);
  const iv = bytes.slice(0, AES_GCM_IV_LENGTH);
  const ciphertext = bytes.slice(AES_GCM_IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    await getKey(),
    ciphertext
  );
  return bytesToBinaryString(plaintext);
}

async function fetchSensorData(): Promise<string> {
  const response = await fetch(SENSOR_DATA_URL, { method: 'POST' });
  return decryptSensorData(await response.arrayBuffer());
}

/**
 * Return the current sensor payload, refreshing it before first use and after
 * every five protected Disney requests. Concurrent callers share the same
 * in-flight fetch until that five-use boundary is crossed.
 */
export function getSensorData(): Promise<string> | string {
  if (++sensorDataUses > SENSOR_DATA_USES) {
    sensorDataUses = 1;
    sensorDataPromise = fetchSensorData().catch(error => {
      resetSensorData();
      throw error;
    });
  }
  return sensorDataPromise;
}

/** Force the next protected request to obtain a fresh payload. */
export function resetSensorData(): void {
  sensorDataUses = SENSOR_DATA_USES;
}
