import Domain from "../../models/Domain";

// 모든 도메인 조회
export async function findAllDomains() {
  try {
    const domains = await Domain.find({}, { name: 1, url_list: 1, keywords: 1 });
    return domains;
  } catch (error) {
    console.error("❌ 도메인 조회 실패:", error);
    throw error;
  }
}
