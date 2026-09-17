import { getSensorData, resetSensorData } from './sensor-data-provider';

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
    fetchMock.mockResolvedValue({ arrayBuffer } as unknown as Response);
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

    expect(fetchMock).toHaveBeenCalledWith(SENSOR_DATA_URL, { method: 'POST' });
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

    await expect(getSensorData()).rejects.toThrow('offline');
    await expect(getSensorData()).resolves.toBe('sensor-value');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
