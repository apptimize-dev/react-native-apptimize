// @ts-ignore
import RNAdvertisingId from 'react-native-advertising-id';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const setWithExpiry = (
  key: string,
  value: any,
  storageExpirationTimeInMinutes = 86400
) => {
  let data: { data: any; expiryTime?: number } = {
    data: value,
  };
  if (storageExpirationTimeInMinutes !== 0) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + storageExpirationTimeInMinutes);
    const expiryTimeInTimestamp = Math.floor(now.getTime() / 1000);
    data.expiryTime = expiryTimeInTimestamp;
  }
  (async () => {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  })();
};

const getWithExpiry = (key: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      let savedData: any = await AsyncStorage.getItem(key);
      if (savedData !== null) {
        // check if we got a valid data before calling JSON.parse
        savedData = JSON.parse(savedData);
      } else {
        savedData = { data: undefined };
      }
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (savedData?.expiryTime && currentTimestamp >= savedData?.expiryTime) {
        await AsyncStorage.removeItem(key);
        resolve(undefined);
      } else {
        resolve(savedData.data);
      }
    } catch (e) {
      reject(e);
    }
  });
};

export const init = (
  appToken: string,
  env: 'production' | 'sandbox' = 'sandbox'
) => {
  let configUrl = 'https://apptimize-staging.yektanet.com/api/v1/core/config/';
  if (env === 'production') {
    configUrl = 'https://apptimize.yektanet.com/api/v1/core/config/';
  }

  (async () => {
    const ua = await DeviceInfo.getUserAgent();
    let config: Response | any = await getWithExpiry('config');
    if (!config) {
      config = await fetch(configUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${appToken}`,
          'user-agent': ua,
        },
      });
      config = await config.json();
      console.log('Apptimize config result: ', JSON.stringify(config));
    }
    if (config && config.enable) {
      setWithExpiry('config', config);
      const { advertisingId } = await RNAdvertisingId.getAdvertisingId();
      if (advertisingId) {
        const appState: object = (await getWithExpiry('state')) || {};
        let appOpenResult: Response | any = await fetch(config.app_open, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept': 'application/json',
            'Authorization': `Token ${appToken}`,
          },
          body: JSON.stringify({
            user_token: advertisingId,
            app_id: config.app_id,
            app_version: 'default',
            ...appState,
          }),
        });
        appOpenResult = await appOpenResult.json();
        setWithExpiry('state', appOpenResult.state);
        console.log(
          `Apptimize app_open result: ${JSON.stringify(appOpenResult)}`
        );
      } else {
        console.log(`Apptimize advertising Id: ${advertisingId}`);
      }
    } else {
      console.log(`Apptimize config: ${JSON.stringify(config)}`);
    }
  })();
};
