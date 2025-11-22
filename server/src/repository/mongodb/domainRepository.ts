import Domain, { IDomain } from "../../models/Domain";

// Plain object 타입 (lean() 결과용)
export interface DomainPlain {
  _id: string;
  name: string;
  url_list: string[];
  keywords: string[];
  setting_ids: string[];
}

// 모든 도메인 조회
export async function findAllDomains(): Promise<DomainPlain[]> {
  try {
    // .lean()을 사용하여 plain JavaScript 객체로 반환
    // ObjectId를 문자열로 변환하여 반환
    const domains = await Domain.find({})
      .select("_id name url_list keywords setting_ids")
      .lean();
    return domains.map((domain) => ({
      _id: domain._id.toString(),
      name: domain.name,
      url_list: domain.url_list,
      keywords: domain.keywords,
      setting_ids: domain.setting_ids.map((id: any) => id.toString()),
    }));
  } catch (error) {
    console.error("❌ 도메인 조회 실패:", error);
    throw error;
  }
}

// domain_id로 도메인 조회
export async function findDomainById(
  domainId: string
): Promise<IDomain | null> {
  try {
    const domain = await Domain.findById(domainId);
    return domain;
  } catch (error) {
    console.error("❌ 도메인 조회 실패:", error);
    throw error;
  }
}

// Domain에 setting_id 추가
export async function addSettingIdToDomain(
  domainId: string,
  settingId: string
) {
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
export async function removeSettingIdFromDomain(
  domainId: string,
  settingId: string
) {
  try {
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new Error(`Domain을 찾을 수 없습니다: ${domainId}`);
    }

    // setting_id가 존재하면 제거
    domain.setting_ids = domain.setting_ids.filter(
      (id) => id.toString() !== settingId.toString()
    );
    await domain.save();
    return domain;
  } catch (error) {
    console.error("❌ Domain에서 setting_id 제거 실패:", error);
    throw error;
  }
}

// 초기 도메인 데이터 생성
export async function initializeDomains(
  initialDomains: Array<{
    _id?: string | number;
    name: string;
    url_list: string[];
    keywords: string[];
    setting_ids?: string[];
  }>
) {
  try {
    // 현재 도메인 개수 확인
    const domainCount = await Domain.countDocuments();

    // 이미 도메인이 있으면 초기화하지 않음
    if (domainCount > 0) {
      console.log(
        `📋 도메인이 이미 존재합니다 (${domainCount}개). 초기화를 건너뜁니다.`
      );
      return;
    }

    // 초기 도메인 데이터 생성 (_id가 명시되어 있으면 사용)
    const createdDomains = await Domain.insertMany(
      initialDomains.map((domain) => {
        const domainData: any = {
          name: domain.name,
          url_list: domain.url_list,
          keywords: domain.keywords,
          setting_ids: domain.setting_ids || [],
        };

        // _id가 명시적으로 지정되어 있으면 사용
        if (domain._id !== undefined) {
          domainData._id = domain._id;
        }

        return domainData;
      })
    );

    console.log(
      `✅ 초기 도메인 데이터가 생성되었습니다 (${createdDomains.length}개)`
    );
    if (initialDomains.some((d) => d._id !== undefined)) {
      console.log(`📌 명시적으로 지정된 _id가 적용되었습니다.`);
    }
    return createdDomains;
  } catch (error) {
    console.error("❌ 초기 도메인 데이터 생성 실패:", error);
    throw error;
  }
}
