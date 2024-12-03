import {
  CacheClient,
  Configurations,
  CredentialProvider,
  CreateCache,
  CacheSet,
  CacheGet,
  CacheDictionaryFetch,
  CacheDictionaryGetField,
} from "@gomomento/sdk";

const DEFAULT_TTL = 600;

/**
 * 処理速度を計測するデコレータ
 */
function measureProcessingTime() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const result = await originalMethod.apply(this, args);
      const end = performance.now();
      const processingTime = end - start;
      console.log(
        `${propertyKey}の処理時間: ${processingTime.toFixed(2)}ミリ秒`
      );
      return result;
    };

    return descriptor;
  };
}

class CacheManager {
  private client: CacheClient | null = null;

  /**
   * 処理速度を計測するデコレータ
   */
  @measureProcessingTime()
  async createCacheClient() {
    this.client = await CacheClient.create({
      configuration: Configurations.Laptop.v1(),
      credentialProvider: CredentialProvider.fromEnvironmentVariable({
        environmentVariableName: "MOMENTO_API_KEY",
      }),
      defaultTtlSeconds: DEFAULT_TTL,
    });
  }

  @measureProcessingTime()
  async createCache(cacheName: string) {
    if (!this.client) throw new Error("Client not initialized");

    const response: CreateCache.Response = await this.client.createCache(
      cacheName
    );
    console.log(`createCache:${response.type}`);
  }

  @measureProcessingTime()
  async writeString(cacheName: string, key: string, value: string) {
    if (!this.client) throw new Error("Client not initialized");

    const response: CacheSet.Response = await this.client.set(
      cacheName,
      key,
      value
    );

    console.log(`writeString:${response.type}`);
  }

  @measureProcessingTime()
  async writeDictionary(
    cacheName: string,
    key: string,
    value: Map<string, string>
  ) {
    if (!this.client) throw new Error("Client not initialized");

    const response = await this.client.dictionarySetFields(
      cacheName,
      key,
      value
    );
    console.log(`writeDictionary:${response.type}`);
  }

  @measureProcessingTime()
  async writeDictionaryItem(
    cacheName: string,
    directoryName: string,
    key: string,
    value: string
  ) {
    if (!this.client) throw new Error("Client not initialized");

    const response = await this.client.dictionarySetField(
      cacheName,
      directoryName,
      key,
      value
    );
    console.log(`writeDictionaryItem:${response.type}`);
  }

  @measureProcessingTime()
  async readFromCache(cacheName: string, key: string) {
    if (!this.client) throw new Error("Client not initialized");

    const response: CacheGet.Response = await this.client.get(cacheName, key);
    if (response instanceof CacheGet.Hit) {
      console.log("readFromCache: ", response.value());
    } else {
      console.log("readFromCache: ", response.type);
    }
  }

  @measureProcessingTime()
  async featchFromCache(cacheName: string, key: string) {
    if (!this.client) throw new Error("Client not initialized");

    const response = await this.client.dictionaryFetch(cacheName, key);
    if (response instanceof CacheDictionaryFetch.Hit) {
      console.log("featchFromCache: ", response.value());
    } else {
      console.log("featchFromCache: ", response.type);
    }
  }

  @measureProcessingTime()
  async getDirectoryItem(
    cacheName: string,
    directoryName: string,
    key: string
  ) {
    if (!this.client) throw new Error("Client not initialized");

    const response = await this.client.dictionaryGetField(
      cacheName,
      directoryName,
      key
    );
    if (response instanceof CacheDictionaryGetField.Hit) {
      console.log("getDirectoryItem: ", response.value());
    } else {
      console.log("getDirectoryItem: ", response.type);
    }
  }
}

async function main() {
  const cacheManager = new CacheManager();
  const cacheName = "sample-cache";

  // Cacheの作成
  await cacheManager.createCacheClient();
  await cacheManager.createCache(cacheName);

  // string型のValueのWrite/Read
  await cacheManager.writeString(cacheName, "string-key", "hoge");
  await cacheManager.readFromCache(cacheName, "string-key");

  // Dictionary型のValueのWrite/Read
  await cacheManager.writeDictionary(
    cacheName,
    "dic-key",
    new Map([
      ["key1", "value1"],
      ["key2", "value2"],
    ])
  );

  // valueのDirectoryに一つアイテムを追加
  await cacheManager.writeDictionaryItem(
    cacheName,
    "dic-key",
    "key3",
    "value3"
  );

  // Key-Valueの順序は不同
  await cacheManager.featchFromCache(cacheName, "dic-key");

  // valueのDirectoryの中のキーを指定して取得
  await cacheManager.getDirectoryItem(cacheName, "dic-key", "key2");
}

main().catch(console.error);
