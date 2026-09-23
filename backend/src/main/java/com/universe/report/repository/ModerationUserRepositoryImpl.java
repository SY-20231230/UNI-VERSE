package com.universe.report.repository;
import com.universe.user.entity.User;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import java.util.Optional;
import java.util.HashSet;
import java.util.Set;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@RequiredArgsConstructor
public class ModerationUserRepositoryImpl implements ModerationUserRepositoryCustom {
    private final EntityManager entityManager;
    private final Object transactionLocksKey = new Object();

    public Optional<User> findLockedById(Long id) {
        Set<Long> locked = transactionLocks();
        User user = entityManager.find(User.class, id);
        if (user != null && !locked.contains(id)) {
            // A locking query alone can return a previously loaded, stale managed entity.
            // Subsequent calls within the same transaction keep the modifications already made.
            entityManager.refresh(user, LockModeType.PESSIMISTIC_WRITE);
            locked.add(id);
        }
        return Optional.ofNullable(user);
    }

    @SuppressWarnings("unchecked")
    private Set<Long> transactionLocks() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive())
            throw new IllegalStateException("User locking requires a transaction");
        var existing = (Set<Long>) TransactionSynchronizationManager.getResource(transactionLocksKey);
        if (existing != null) return existing;
        Set<Long> locked = new HashSet<>();
        TransactionSynchronizationManager.bindResource(transactionLocksKey, locked);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void suspend() { TransactionSynchronizationManager.unbindResource(transactionLocksKey); }
            @Override public void resume() { TransactionSynchronizationManager.bindResource(transactionLocksKey, locked); }
            @Override public void afterCompletion(int status) { TransactionSynchronizationManager.unbindResourceIfPossible(transactionLocksKey); }
        });
        return locked;
    }
}
