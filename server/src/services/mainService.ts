import { findAllDomains } from "../repository/mongodb/domainRepository.js";

export async function getDomains() {
  const domains = await findAllDomains();

  return domains.map((domain: any) => ({
    id: domain._id,
    name: domain.name,
    url_list: domain.url_list,
    keywords: domain.keywords,
  }));
}