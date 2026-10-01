package com.universe.user.dto.response;

import com.universe.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserResponse {
	private Long userId;
	private String email;
	private String name;
	private String nickname;
	private String department;
	private Long schoolId;
	private String schoolName;
	private boolean schoolVerified;
	private String role;
	private String accountStatus;
	private int trustScore;

	public static UserResponse from(User user) {
		return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getNickname(),
				user.getDepartment(), user.getSchool() == null ? null : user.getSchool().getId(),
				user.getDisplayUniversityName(), Boolean.TRUE.equals(user.getSchoolVerified()),
				user.getRole().name(), user.getAccountStatus().name(), user.getTrustScore());
	}
}
