import { findAllDomains } from "../repository/mongodb/domainRepository.js";
import { domainMeta } from "../data/domainMeta.js";

export async function getDomains() {
  const domains = await findAllDomains();

  return domains.map((domain: any) => {
    const meta = domainMeta[domain.name] || {
      desc: "도메인 관련 최신 소식을 제공합니다.",
      icon: "Bell",
    };

    return {
      id: domain._id,
      name: domain.name,
      desc: meta.desc,
      icon: meta.icon,
    };
  });
}