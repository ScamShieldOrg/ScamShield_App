package com.be.scamshield.service;

import com.be.scamshield.dto.admin.AdminScamCategoryResponse;
import com.be.scamshield.dto.request.CreateScamCategoryRequest;
import com.be.scamshield.dto.request.UpdateScamCategoryRequest;

import java.util.List;

public interface IAdminScamCategoryService {
    List<AdminScamCategoryResponse> list();

    AdminScamCategoryResponse create(CreateScamCategoryRequest request, Long actorId);

    AdminScamCategoryResponse update(Long id, UpdateScamCategoryRequest request, Long actorId);
}
