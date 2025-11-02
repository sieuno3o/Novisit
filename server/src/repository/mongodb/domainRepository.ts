import Domain from "../../models/Domain";

// 모든 도메인 조회
export async function findAllDomains() {
  try {
    // .lean()을 사용하여 plain JavaScript 객체로 반환
    // ObjectId를 문자열로 변환하여 반환
    const domains = await Domain.find({}).select('_id name url_list keywords setting_ids').lean();
    return domains.map(domain => ({
      ...domain,
      _id: domain._id.toString(),
      setting_ids: domain.setting_ids.map((id: any) => id.toString())
    }));
  } catch (error) {
    console.error("❌ 도메인 조회 실패:", error);
    throw error;
  }
}

// domain_id로 도메인 조회
export async function findDomainById(domainId: string) {
  try {
    const domain = await Domain.findById(domainId);
    return domain;
  } catch (error) {
    console.error("❌ 도메인 조회 실패:", error);
    throw error;
  }
}

// Domain에 setting_id 추가
export async function addSettingIdToDomain(domainId: string, settingId: string) {
  try {
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new Error(`Domain을 찾을 수 없습니다: ${domainId}`);
    }

    // 이미 존재하는지 확인
    if (!domain.setting_ids.includes(settingId)) {
      domain.setting_ids.push(settingId);
      await domain.save();
    }
    return domain;
  } catch (error) {
    console.error("❌ Domain에 setting_id 추가 실패:", error);
    throw error;
  }
}

// Domain에서 setting_id 제거
export async function removeSettingIdFromDomain(domainId: string, settingId: string) {
  try {
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new Error(`Domain을 찾을 수 없습니다: ${domainId}`);
    }

    // setting_id가 존재하면 제거
    domain.setting_ids = domain.setting_ids.filter(id => id.toString() !== settingId.toString());
    await domain.save();
    return domain;
  } catch (error) {
    console.error("❌ Domain에서 setting_id 제거 실패:", error);
    throw error;
  }
}
