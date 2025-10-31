import Setting from "../../models/Setting";
import Message from "../../models/Message";
import { addSettingIdToDomain, removeSettingIdFromDomain } from "./domainRepository";

// 날짜 포맷
function formatKoreanDate(date?: Date) {
  if (!date) return null;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 알림 설정 생성
export async function createSetting(settingData: any) {
  const setting = new Setting(settingData);
  const savedSetting = await setting.save();
  
  // Domain의 setting_ids에 추가
  try {
    const settingId = savedSetting._id ? String(savedSetting._id) : savedSetting.id;
    await addSettingIdToDomain(settingData.domain_id, settingId);
  } catch (error) {
    console.error("❌ Domain 업데이트 실패 (생성):", error);
    // Setting은 생성되었으므로 에러를 던지지 않고 로그만 남김
  }
  
  return savedSetting;
}

// 알림 설정 + 메시지 조회
export const getSettings = async (userId: string) => {
  try {
    // user_id로 Setting 목록 조회
    const settings = await Setting.find({ user_id: userId }).lean();

    // 각 Setting마다 연결된 Message 조회
    const result = await Promise.all(
      settings.map(async (setting) => {
        const messages = await Message.find({ setting_id: setting._id }).lean();

        return {
          id: setting._id,
          name: setting.name,
          domain_id: setting.domain_id,
          url_list: setting.url_list,
          filter_keywords: setting.filter_keywords,
          channel: setting.channel,
          created_at: formatKoreanDate(setting.created_at),
          messages: messages.map((m) => ({
            id: m._id,
            contents: m.contents,
            sended_at: m.sended_at,
            platform: m.platform,
          })),
        };
      })
    );

    return result;
  } catch (error) {
    console.error("알림설정 + 메시지 조회 실패:", error);
    throw new Error("알림 설정을 불러오지 못했습니다.");
  }
};

// domain_id로 Setting 목록 조회
export const getSettingsByDomainId = async (domainId: string) => {
  try {
    const settings = await Setting.find({ domain_id: domainId }).lean();
    return settings;
  } catch (error) {
    console.error("도메인별 알림 설정 조회 실패:", error);
    throw new Error("알림 설정을 불러오지 못했습니다.");
  }
};

// Message 저장
export const saveMessage = async (settingId: string, contents: string, platform: string = 'kakao') => {
  try {
    const message = new Message({
      setting_id: settingId,
      contents,
      sended_at: new Date(),
      platform,
    });
    return await message.save();
  } catch (error) {
    console.error("메시지 저장 실패:", error);
    throw new Error("메시지 저장에 실패했습니다.");
  }
};

// 알림 설정 수정
export const updateSetting = async (settingId: string, updateData: any) => {
  try {
    // 수정 전 Setting 조회 (이전 domain_id 확인용)
    const existingSetting = await Setting.findById(settingId);
    if (!existingSetting) {
      throw new Error("해당 알림 설정을 찾을 수 없습니다.");
    }

    const previousDomainId = existingSetting.domain_id;
    const newDomainId = updateData.domain_id;

    // Setting 수정
    const updated = await Setting.findByIdAndUpdate(
      settingId,
      updateData,
      { new: true } // 수정된 문서 반환
    ).lean();

    // domain_id가 변경된 경우 Domain 업데이트
    if (newDomainId && previousDomainId !== newDomainId) {
      try {
        // 이전 Domain에서 setting_id 제거
        await removeSettingIdFromDomain(previousDomainId, settingId);
        // 새로운 Domain에 setting_id 추가
        await addSettingIdToDomain(newDomainId, settingId);
      } catch (error) {
        console.error("❌ Domain 업데이트 실패 (수정):", error);
        // Setting은 수정되었으므로 에러를 던지지 않고 로그만 남김
      }
    }

    return updated;
  } catch (error) {
    console.error("알림 설정 수정 실패:", error);
    throw new Error("알림 설정 수정에 실패했습니다.");
  }
};

// 알림 설정 삭제
export const deleteSetting = async (settingId: string) => {
  try {
    // 삭제 전 Setting 조회 (domain_id 확인용)
    const existingSetting = await Setting.findById(settingId);
    if (!existingSetting) {
      throw new Error("해당 알림 설정을 찾을 수 없습니다.");
    }

    const domainId = existingSetting.domain_id;

    // Setting 삭제
    await Setting.findByIdAndDelete(settingId);

    // Domain에서 setting_id 제거
    try {
      await removeSettingIdFromDomain(domainId, settingId);
    } catch (error) {
      console.error("❌ Domain 업데이트 실패 (삭제):", error);
      // Setting은 삭제되었으므로 에러를 던지지 않고 로그만 남김
    }

    return true;
  } catch (error) {
    console.error("알림 설정 삭제 실패:", error);
    throw new Error("알림 설정 삭제에 실패했습니다.");
  }
};