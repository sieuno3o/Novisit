import { getProviderTokens, storeProviderTokens } from '../repository/redis/tokenRepository';
import * as KakaoAPI from './kakaoAPIClient';

// 사용자에게 카카오톡 메시지. BullMQ 워커에서 호출되는 것을 전제로 한 비즈니스 로직.
export async function sendKakaoMessage(
  userId: string,
  templateObject: any
): Promise<any> {
  // 1. Redis에서 사용자의 카카오 토큰을 가져옴.
  let { accessToken, refreshToken } = await getProviderTokens(userId, 'kakao');

  // 토큰이 없는 경우 에러.
  if (!accessToken || !refreshToken) {
    throw new Error(`카카오 토큰이 발견이 안됨. ${userId}`);
  }

  try {
    // 2.  가져온 accessToken으로 메시지 전송을 시도.
    return await KakaoAPI.sendMemo(accessToken, templateObject);
  } catch (error: any) {
    // 3. 시도가 실패했을 경우 
    // 카카오 API가 토큰 만료를 의미하는 401 상태 코드를 반환
    if (error.response?.status === 401) {
      console.log(`카카오 AccessToken 만료 (user: ${userId}), 갱신을 시도합니다.`);

      //  refreshToken으로 새로운 토큰 발급을 요청.
      const { newAccessToken, newRefreshToken } = await KakaoAPI.refreshAccessToken(
        refreshToken
      );

      // 발급받은 새 토큰을 Redis에 저장.
      await storeProviderTokens(
        userId,
        'kakao',
        newAccessToken,
        newRefreshToken ?? refreshToken
      );

      console.log(`토큰 갱신 완료 (user: ${userId}), 메시지 전송을 재시도합니다.`);
      
      // 새로 발급받은 토큰으로 메시지 전송을 재시도.
      return await KakaoAPI.sendMemo(newAccessToken, templateObject);
    }

    // 4. 401이 아닌 다른 모든 에러는 처리할 수 없으므로 로그를 남기고 상위 호출자에게 그대로 전파.
    // 이를 통해 BullMQ에서 실패 처리하거나 재시도 적용.
    console.error(
      `카카오 메시지 전송 실패 (user: ${userId})`,
      error.response?.data || error.message
    );
    throw error;
  }
}
