package com.universe.admin.service;

import com.universe.report.repository.UserSanctionRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuspensionExpiryJobTest {
    @Mock UserSanctionRepository sanctions;
    @Mock SuspensionReleaseService release;
    @InjectMocks SuspensionExpiryJob job;

    @Test void releasesAtMostFirstHundredExpiredUsersUsingOneReferenceTime() {
        when(sanctions.findExpiredUserIds(any(), eq(PageRequest.of(0, 100))))
                .thenReturn(new SliceImpl<>(List.of(3L, 7L)));

        job.releaseExpiredSuspensions();

        ArgumentCaptor<LocalDateTime> queryTime = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(sanctions).findExpiredUserIds(queryTime.capture(), eq(PageRequest.of(0, 100)));
        verify(release).releaseIfExpired(3L, queryTime.getValue());
        verify(release).releaseIfExpired(7L, queryTime.getValue());
    }

    @Test void oneBrokenUserDoesNotBlockTheRemainingReleases() {
        when(sanctions.findExpiredUserIds(any(), any())).thenReturn(new SliceImpl<>(List.of(3L, 7L, 9L)));
        when(release.releaseIfExpired(eq(3L), any())).thenThrow(new IllegalStateException("database conflict"));

        assertThatCode(job::releaseExpiredSuspensions).doesNotThrowAnyException();

        verify(release).releaseIfExpired(eq(7L), any());
        verify(release).releaseIfExpired(eq(9L), any());
    }

    @Test void emptyExpiryPagePerformsNoRelease() {
        when(sanctions.findExpiredUserIds(any(), any())).thenReturn(new SliceImpl<>(List.of()));
        job.releaseExpiredSuspensions();
        verifyNoInteractions(release);
    }
}
