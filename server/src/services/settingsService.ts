import { createSetting } from "../repository/mongodb/settingsRepository";

export async function createUserSetting(userId: string, data: any) {
  const { domain_id, name, filter_keywords, url_list } = data;

  // 필수 값 확인
  if (!domain_id || !name) {
    throw new Error("domain_id와 name은 필수입니다.");
  }

  // DB에 저장할 데이터 구성
  const settingData = {
    user_id: userId,
    domain_id,
    name,
    url_list: url_list || [],
    filter_keywords: filter_keywords || [],
    messages: [],
  };

  // 알림 설정 생성
  return await createSetting(settingData);
}