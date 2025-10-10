import Setting from "../../models/Setting";


// 알림 설정 생성
export async function createSetting(settingData: any) {
  const setting = new Setting(settingData);
  return await setting.save();
}