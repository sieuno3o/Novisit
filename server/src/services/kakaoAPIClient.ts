import axios from 'axios';

const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
const KAKAO_MSG_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send'

// 카카오 AccessToken을 갱신.
export async function refreshAccessToken(refreshToken: string): Promise<{
  newAccessToken: string;
  newRefreshToken?: string;
}> {
  try {
    // 카카오 토큰 갱신 API가 요구하는 파라미터를 준비.
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.KAKAO_CLIENT_ID!,
      client_secret: process.env.KAKAO_CLIENT_SECRET!,
      refresh_token: refreshToken,
    });

    // 카카오 서버에 토큰 갱신을 요청.
    const response = await axios.post(KAKAO_TOKEN_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    });

    // 응답에서 새로운 토큰 정보를 추출하여 반환.
    return {
      newAccessToken: response.data.access_token,
      newRefreshToken: response.data.refresh_token,
    };
  } catch (error) {
    // 네트워크 오류나 카카오 서버에서 에러 응답이 온 경우 notificationService에게 전파.
    console.error('카카오 토큰 갱신 API 호출 실패', error);
    throw error;
  }
}

//나에게 보내기 API를 호출하여 카카오톡 메시지를 보냅니다.
 
export async function sendMemo(accessToken: string, templateObject: any): Promise<any> {
  // 메시지 보내기 API가 요구하는 파라미터를 준비합니다.
  const body = new URLSearchParams();
  body.append('template_object', JSON.stringify(templateObject));

  //  성공/실패 결과를 그대로 상위 호출자에게 반환하는 역할만.
  return axios.post(KAKAO_MSG_URL, body.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`, 
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  });
}

