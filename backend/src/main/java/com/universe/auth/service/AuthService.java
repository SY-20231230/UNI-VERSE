package com.universe.auth.service;

import com.universe.auth.dto.request.LoginRequest;
import com.universe.auth.dto.request.RefreshRequest;
import com.universe.auth.dto.request.SignupRequest;
import com.universe.auth.dto.response.LoginResponse;
import com.universe.auth.dto.response.SignupResponse;
import com.universe.auth.dto.response.TokenResponse;
import com.universe.auth.entity.LoginSession.EndReason;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.global.security.CurrentUser;
import com.universe.global.security.JwtTokenProvider;
import com.universe.global.security.TokenSessionService;
import com.universe.school.entity.School;
import com.universe.school.entity.SchoolVerification;
import com.universe.school.repository.SchoolVerificationRepository;
import com.universe.school.service.SchoolEmailPolicy;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
	private final UserRepository users;
	private final PasswordEncoder encoder;
	private final JwtTokenProvider jwt;
	private final TokenSessionService sessions;
	private final LoginSessionService loginSessions;
	private final TrustScoreService trust;
	private final EmailVerificationService emailVerification;
	private final SchoolEmailPolicy schoolEmails;
	private final SchoolVerificationRepository verifications;
	private final com.universe.notification.service.NotificationService notifications;

	@Transactional
	public SignupResponse signup(SignupRequest request) {
		String email = schoolEmails.normalize(request.getEmail());
		if (users.existsByEmail(email)) throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
		School school = schoolEmails.resolveSchool(email);
		User user = User.builder().email(email).password(encoder.encode(request.getPassword()))
				.name(request.getName().trim()).nickname(request.getNickname().trim())
				.department(request.getDepartment().trim()).build();
		user.verifySchool(school);
		users.save(user);
		SchoolVerification verification = SchoolVerification.builder()
				.user(user).school(school).schoolEmail(email).build();
		verification.verify();
		verifications.save(verification);
		trust.initializeNewUser(user.getId());
		emailVerification.consume(email);
		return new SignupResponse(user.getId(), user.getEmail(), user.getNickname());
	}

	@Transactional
	public LoginResponse login(LoginRequest request) {
		User user = users.findByEmail(request.getEmail())
				.orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
		if (!encoder.matches(request.getPassword(), user.getPassword()))
			throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
		if (!canSignIn(user)) throw new BusinessException(ErrorCode.INACTIVE_ACCOUNT);

		String sessionId = loginSessions.start(user.getId(), LocalDateTime.now());
		return new LoginResponse(user.getId(), user.getEmail(), user.getNickname(),
				jwt.createAccessToken(user.getId(), user.getRole().name(), sessionId),
				jwt.createRefreshToken(user.getId(), user.getRole().name(), sessionId));
	}

	@Transactional
	public TokenResponse refresh(RefreshRequest request) {
		Long userId;
		String sessionId;
		try {
			String refreshToken = request.getRefreshToken();
			if (!jwt.isRefresh(refreshToken)) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
			userId = jwt.getUserId(refreshToken);
			sessionId = jwt.getSessionId(refreshToken);
			if (sessions.isInvalid(userId, jwt.getIssuedAt(refreshToken))
					|| !loginSessions.recordActivity(sessionId, userId, LocalDateTime.now()))
				throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
		} catch (BusinessException exception) {
			throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
		}
		User user = users.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
		if (!canSignIn(user)) throw new BusinessException(ErrorCode.INACTIVE_ACCOUNT);
		return new TokenResponse(jwt.createAccessToken(userId, user.getRole().name(), sessionId),
				jwt.createRefreshToken(userId, user.getRole().name(), sessionId));
	}

	@Transactional
	public void logout() {
		Long userId = CurrentUser.id();
		sessions.logout(userId);
		loginSessions.endAll(userId, EndReason.LOGOUT, LocalDateTime.now());
		notifications.deleteRead(userId);
	}

	private static boolean canSignIn(User user) {
		var status = user.getAccountStatus();
		return status == com.universe.user.entity.AccountStatus.ACTIVE
				|| status == com.universe.user.entity.AccountStatus.SUSPENDED;
	}
}
