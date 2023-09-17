import RNAdvertisingId from 'react-native-advertising-id';

export function multiply(a: number, b: number): Promise<number> {
  return Promise.resolve(a * b);
}

export const init = (appToken: string) => {
  let advertisingId;
  RNAdvertisingId.getAdvertisingId().then(({ adId }: { adId: string }) => {
    advertisingId = adId;
    fetch('https://apptimize-event-staging.yektanet.com/open/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        user_token: advertisingId,
        app_id: appToken,
      }),
    });
  });
};
