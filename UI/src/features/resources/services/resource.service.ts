import { publicApi } from "@/lib/api/instance"
import {
  BlacklistApiResponse,
  BlacklistResourceFilterRequest,
  PaginatedBlacklistResponse,
  PaginatedWhitelistResponse,
  WhitelistApiResponse,
  WhitelistResourceFilterRequest,
} from "@/types/resource"

export const resourceService = {
  getBlackList: async (
    params?: BlacklistResourceFilterRequest,
    signal?: AbortSignal
  ): Promise<PaginatedBlacklistResponse> => {
    const response = await publicApi.get<BlacklistApiResponse>(
      "/resources/blacklist",
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 5,
          keyword: params?.keyword?.trim() ? params.keyword.trim() : undefined,
          resourceType: params?.resourceType?.trim()
            ? params.resourceType.trim()
            : undefined,
        },
        signal,
      }
    )
    return response.data.data
  },
  getWhiteList: async (
    params?: WhitelistResourceFilterRequest,
    signal?: AbortSignal
  ): Promise<PaginatedWhitelistResponse> => {
    const response = await publicApi.get<WhitelistApiResponse>(
      "/resources/whitelist",
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 5,
          keyword: params?.keyword?.trim() || undefined,
          sortBy: params?.sortBy ?? "newest",
        },
        signal,
      }
    )
    return response.data.data
  },
}
