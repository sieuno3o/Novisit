import * as userRepository from '../repository/mongodb/userRepository';
import { getProviderTokens, storeProviderTokens } from '../repository/redis/tokenRepository';
import * as KakaoAPI from './kakaoAPIClient';

// 사용자에게 카카오톡 메시지. BullMQ 워커에서 호출되는 것을 전제로 한 비즈니스 로직.
export async function sendKakaoMessage(
  userId: string,
  templateObject: any
): Promise<any> {
  // 0. 사용자 정보 조회 및 알림 설정 확인
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new Error(`사용자를 찾을 수 없습니다. ${userId}`);
  }

  const kakaoProvider = user.providers.find(p => p.provider === 'kakao');
  if (!kakaoProvider) {
    throw new Error(`사용자에게 카카오 연동 정보가 없습니다. ${userId}`);
  }

  if (kakaoProvider.talk_message_enabled === false) {
    console.log(`사용자(${userId})가 카카오 알림 수신을 거부하여 메시지를 전송하지 않습니다.`);
    return; // 메시지 전송 중단
  }

  // 1. Redis에서 사용자의 카카오 토큰을 가져옴.
  let { accessToken, refreshToken, expiresIn } = await getProviderTokens(userId, 'kakao');

  // 토큰이 없는 경우 에러.
  if (!accessToken || !refreshToken) {
    throw new Error(`카카오 토큰이 발견이 안됨. ${userId}`);
  }

  // 2. AccessToken 만료 여부 확인 및 선제적 갱신
  // expiresIn이 null이 아니고, 남은 만료 시간이 60초 미만이면 갱신 시도
  if (expiresIn !== null && expiresIn < 60) { 
    console.log(`카카오 AccessToken 만료 임박 (user: ${userId}), 선제적 갱신을 시도합니다.`);
    try {
      const { newAccessToken, newRefreshToken } = await KakaoAPI.refreshAccessToken(refreshToken);
      accessToken = newAccessToken;
      refreshToken = newRefreshToken ?? refreshToken;
      // 갱신된 토큰을 Redis에 저장 (새로운 expiresIn은 refreshAccessToken 응답에 포함되어야 함)
      // 현재 KakaoAPI.refreshAccessToken이 expiresIn을 반환하지 않으므로, 임시로 기본값 사용
      await storeProviderTokens(userId, 'kakao', accessToken, refreshToken, 21599); // 6시간 - 카카오 정책에 따라 변경 필요
      console.log(`토큰 선제적 갱신 완료 (user: ${userId}).`);
    } catch (refreshError: any) {
      console.error(`카카오 AccessToken 선제적 갱신 실패 (user: ${userId}):`, refreshError.response?.data || refreshError.message);
      // 갱신 실패 시, 기존 토큰으로 메시지 전송을 시도하거나 에러를 던질 수 있음.
      // 여기서는 일단 에러를 던져서 작업 실패를 알립니다.
      throw new Error(`카카오 AccessToken 선제적 갱신 실패: ${refreshError.message}`);
    }
  }

  try {
    // 3. 유효하거나 갱신된 accessToken으로 메시지 전송을 시도.
    return await KakaoAPI.sendMemo(accessToken, templateObject);
  } catch (error: any) {
    // 4. 시도가 실패했을 경우 (예: 갱신 후에도 토큰이 유효하지 않거나 다른 이유)
    // 카카오 API가 토큰 만료를 의미하는 401 상태 코드를 반환
    if (error.response?.status === 401) {
      console.log(`카카오 AccessToken 만료 (user: ${userId}), 재갱신을 시도합니다.`);

      // refreshToken으로 새로운 토큰 발급을 요청.
      const { newAccessToken, newRefreshToken } = await KakaoAPI.refreshAccessToken(
        refreshToken
      );

      // 발급받은 새 토큰을 Redis에 저장.
      await storeProviderTokens(
        userId,
        'kakao',
        newAccessToken,
        newRefreshToken ?? refreshToken,
        21599 // 6시간 - 카카오 정책에 따라 변경 필요
      );

      console.log(`토큰 재갱신 완료 (user: ${userId}), 메시지 전송을 재시도합니다.`);
      
      // 새로 발급받은 토큰으로 메시지 전송을 재시도.
      return await KakaoAPI.sendMemo(newAccessToken, templateObject);
    }

    // 5. 401이 아닌 다른 모든 에러는 처리할 수 없으므로 로그를 남기고 상위 호출자에게 그대로 전파.
    // 이를 통해 BullMQ에서 실패 처리하거나 재시도 적용.
    console.error(
      `카카오 메시지 전송 실패 (user: ${userId})`,
      error.response?.data || error.message
    );
    throw error;
  }
}
