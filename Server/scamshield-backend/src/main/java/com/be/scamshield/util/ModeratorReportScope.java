package com.be.scamshield.util;

import com.be.scamshield.entity.Report;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import org.springframework.data.jpa.domain.Specification;

public final class ModeratorReportScope {
    private ModeratorReportScope() {}

    public static void requireViewer(UserPrincipal viewer) {
        if (viewer == null || viewer.getId() == null || viewer.getId() <= 0) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
    }

    public static Specification<Report> visibleTo(UserPrincipal viewer) {
        requireViewer(viewer);
        return (root, query, cb) -> cb.conjunction();
    }

}
