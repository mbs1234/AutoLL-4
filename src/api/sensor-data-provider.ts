const SENSOR_DATA_URL = 'https://bg1.joelface.com/sensor/data';
const SENSOR_DATA_USES = 5;
const AES_GCM_IV_LENGTH = 12;

/**
 * How long the payload request may take before it is abandoned.
 *
 * The same eight seconds `fetchJson` gives every Disney call, and it matters
 * more here than there. This runs *inside* `ApiClient.request`, before the
 * request it is preparing exists -- and only `book` and `modify` pass a
 * `control` whose abort signal reaches it, so on the other four protected
 * calls an unbounded wait is a spinner with nothing to cancel it. A booking
 * you cannot complete and cannot abandon is the worst state this app has.
 */
const SENSOR_TIMEOUT_MS = 8000;

/**
 * Not a secret, and nothing here should be read as if it were.
 *
 * This key ships in a public bundle, so anyone who opens the JavaScript can
 * decrypt the response. What AES-GCM buys is **integrity**: the payload is
 * authenticated, so a truncated body, a captive-portal login page or a 502
 * error document fails to decrypt instead of being spliced into a header and
 * sent to Disney. That is a real property and the reason to keep it. What it
 * does not buy is confidentiality or any guarantee about who sent the bytes.
 */
const SENSOR_DATA_KEY = 'hFK/SpnRKEoKKGjDahJBaP70niDSIMZTJM5+xeBtn60';

/**
 * The payload could not be obtained, as distinct from Disney refusing one.
 *
 * Without a name this arrived as a bare `TypeError` or an `OperationError`,
 * carrying no HTTP status -- so `useDataLoader` fell through to "Unknown error
 * occurred", `refusal.ts` never counted it, and a third party being down was
 * indistinguishable on screen from Disney blocking the build. Those call for
 * opposite responses on a park morning.
 */
export class SensorDataUnavailable extends Error {
  readonly name = 'SensorDataUnavailable';
}

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
  let response: Response;
  try {
    response = await fetch(SENSOR_DATA_URL, {
      method: 'POST',
      // Bounded: see SENSOR_TIMEOUT_MS.
      signal: AbortSignal.timeout(SENSOR_TIMEOUT_MS),
      // This request goes to a third party from inside a page on Disney's
      // origin. Sending no referrer keeps the booking cadence, and the fact
      // that a booking is being prepared at all, out of their logs.
      referrer: '',
    });
  } catch (error) {
    throw new SensorDataUnavailable(
      `sensor data request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  // Checked before decrypting rather than after. A 429 or a 503 arrives as a
  // perfectly ordinary response with an error document in the body, and
  // feeding that to `decrypt` turns a legible "the service refused us" into an
  // indistinguishable authentication failure.
  if (!response.ok) {
    throw new SensorDataUnavailable(`sensor data ${response.status}`);
  }
  try {
    return await decryptSensorData(await response.arrayBuffer());
  } catch {
    throw new SensorDataUnavailable('sensor data could not be decrypted');
  }
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
