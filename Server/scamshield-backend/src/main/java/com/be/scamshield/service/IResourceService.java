package com.be.scamshield.service;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.BlacklistResourceFilterRequest;
import com.be.scamshield.dto.request.WhitelistResourceFilterRequest;
import com.be.scamshield.dto.response.BlacklistResourceResponse;
import com.be.scamshield.dto.response.WhitelistResourceResponse;

import java.util.List;

public interface IResourceService {
    String getBlackListImageUrl(Long id);
    List<String> getBlackListImageUrls(Long id);
    PaginatedResponse<BlacklistResourceResponse> getBlackListResources(BlacklistResourceFilterRequest filter);
    PaginatedResponse<WhitelistResourceResponse> getWhiteListResources(WhitelistResourceFilterRequest filter);
}
