import {
  SensorDataUnavailable,
  getSensorData,
  resetSensorData,
} from './sensor-data-provider';

const SENSOR_DATA_URL = 'https://bg1.joelface.com/sensor/data';

function buffer(values: number[] | string): ArrayBuffer {
  const bytes =
    typeof values === 'string'
      ? [...values].map(value => value.codePointAt(0)!)
      : values;
  return Uint8Array.from(bytes).buffer;
}

describe('sensor data provider', () => {
  const originalCrypto = globalThis.crypto;
  const originalFetch = globalThis.fetch;
  const key = {} as CryptoKey;
  const importKey = jest.fn(async () => key);
  const decrypt = jest.fn(async () => buffer('sensor-value'));
  const arrayBuffer = jest.fn(async () => buffer([...Array(20).keys()]));
  const fetchMock = jest.fn(
    async () => ({ arrayBuffer }) as unknown as Response
  );

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { subtle: { importKey, decrypt } },
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    arrayBuffer.mockResolvedValue(buffer([...Array(20).keys()]));
    decrypt.mockResolvedValue(buffer('sensor-value'));
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer,
    } as unknown as Response);
    resetSensorData();
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: originalFetch,
    });
  });

  it('posts for an encrypted payload and decrypts its IV and ciphertext', async () => {
    await expect(getSensorData()).resolves.toBe('sensor-value');

    expect(fetchMock).toHaveBeenCalledWith(SENSOR_DATA_URL, {
      method: 'POST',
      signal: expect.any(AbortSignal),
      referrer: '',
    });
    expect(decrypt).toHaveBeenCalledWith(
      {
        name: 'AES-GCM',
        iv: Uint8Array.from([...Array(12).keys()]),
      },
      key,
      Uint8Array.from([...Array(8).keys()].map(value => value + 12))
    );
  });

  it('reuses a payload five times and refreshes it for the sixth request', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(getSensorData()).resolves.toBe('sensor-value');
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(getSensorData()).resolves.toBe('sensor-value');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes after an endpoint failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    await expect(getSensorData()).rejects.toThrow(SensorDataUnavailable);
    await expect(getSensorData()).resolves.toBe('sensor-value');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  /*
   * The three ways this can fail. Each used to arrive as a bare `TypeError` or
   * an `OperationError` carrying no HTTP status -- so `useDataLoader` fell
   * through to "Unknown error occurred", `refusal.ts` never counted it, and a
   * third party being down looked exactly like Disney blocking the build.
   * Those two want opposite responses on a park morning.
   */
  it('names a refused response instead of decrypting the error body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      arrayBuffer,
    } as unknown as Response);

    await expect(getSensorData()).rejects.toThrow(SensorDataUnavailable);
    // The body is never read, so an error document cannot reach `decrypt` and
    // be reported as an authentication failure.
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('names a payload that does not authenticate', async () => {
    decrypt.mockRejectedValueOnce(new Error('OperationError'));
    await expect(getSensorData()).rejects.toThrow(SensorDataUnavailable);
  });

  /*
   * The bound that makes an unreachable host a failure rather than a spinner.
   * Only `book` and `modify` pass a control whose abort signal reaches this
   * far; the other four protected calls have nothing else to stop them.
   */
  it('bounds the request and sends no referrer', async () => {
    await getSensorData();
    expect(fetchMock).toHaveBeenCalledWith(
      SENSOR_DATA_URL,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        referrer: '',
      })
    );
  });
});
