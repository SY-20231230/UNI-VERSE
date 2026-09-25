package com.universe.admin.repository;

import com.universe.user.entity.User;
import org.springframework.data.repository.Repository;

public interface AdminUserRepository extends Repository<User, Long>, AdminUserRepositoryCustom {}
