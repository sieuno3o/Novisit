import Setting from "../../models/Setting";
import Message from "../../models/Message";

// 알림 설정 생성
export async function createSetting(settingData: any) {
  const setting = new Setting(settingData);
  return await setting.save();
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