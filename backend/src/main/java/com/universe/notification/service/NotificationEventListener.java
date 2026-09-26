package com.universe.notification.service;

import com.universe.market.repository.MarketItemFavoriteRepository;
import com.universe.notification.entity.NotificationType;
import com.universe.notification.event.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * 각 도메인이 발행한 이벤트를 받아 알림을 만든다.
 * 원 작업이 커밋된 뒤(AFTER_COMMIT)에만 동작하고, 알림 저장 실패가 원 작업 응답에 영향을 주지 않도록 예외를 삼킨다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private static final int TITLE_PREVIEW_LENGTH = 30;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

    private final NotificationService notificationService;
    private final MarketItemFavoriteRepository favoriteRepository;

    @TransactionalEventListener
    public void onCommentCreated(CommentCreatedEvent e) {
        safely(e, () -> {
            if (!Objects.equals(e.postAuthorId(), e.commenterId())) {
                notificationService.send(e.postAuthorId(), NotificationType.COMMENT,
                        "'" + preview(e.postTitle()) + "' 글에 새 댓글이 달렸어요.", e.postId());
            }
            Long parentAuthorId = e.parentCommentAuthorId();
            if (parentAuthorId != null && !Objects.equals(parentAuthorId, e.commenterId())
                    && !Objects.equals(parentAuthorId, e.postAuthorId())) {
                notificationService.send(parentAuthorId, NotificationType.REPLY,
                        "'" + preview(e.postTitle()) + "' 글의 내 댓글에 답글이 달렸어요.", e.postId());
            }
        });
    }

    @TransactionalEventListener
    public void onPostLiked(PostLikedEvent e) {
        if (Objects.equals(e.postAuthorId(), e.likerId())) return;
        safely(e, () -> notificationService.send(e.postAuthorId(), NotificationType.POST_LIKE,
                "'" + preview(e.postTitle()) + "' 글에 좋아요가 눌렸어요.", e.postId()));
    }

    @TransactionalEventListener
    public void onItemStatusChanged(MarketItemStatusChangedEvent e) {
        String status = switch (e.tradeStatus()) {
            case SELLING -> "다시 판매 중이에요";
            case TRADING -> "거래가 진행 중이에요";
            case COMPLETED -> "판매가 완료됐어요";
            case CANCELLED -> null;
        };
        if (status == null) return;
        safely(e, () -> notificationService.sendAll(favoritersExcept(e.itemId(), e.actorId()),
                NotificationType.FAVORITE_ITEM_STATUS, "찜한 상품 '" + preview(e.itemTitle()) + "'이(가) " + status + ".",
                e.itemId()));
    }

    @TransactionalEventListener
    public void onItemPriceChanged(MarketItemPriceChangedEvent e) {
        if (e.oldListedPrice() == null || e.newListedPrice() == null
                || Objects.equals(e.oldListedPrice(), e.newListedPrice())) return;
        safely(e, () -> notificationService.sendAll(favoritersExcept(e.itemId(), e.sellerId()),
                NotificationType.FAVORITE_ITEM_PRICE, "찜한 상품 '" + preview(e.itemTitle()) + "'의 가격이 "
                        + won(e.oldListedPrice()) + "에서 " + won(e.newListedPrice()) + "으로 바뀌었어요.",
                e.itemId()));
    }

    @TransactionalEventListener
    public void onReportProcessed(ReportProcessedEvent e) {
        String content = e.approved()
                ? "접수하신 신고가 검토 후 처리되었어요. 소중한 신고 감사합니다."
                : "접수하신 신고를 검토한 결과, 조치 대상에 해당하지 않아 반려되었어요.";
        safely(e, () -> notificationService.send(e.reporterId(), NotificationType.REPORT_PROCESSED, content, e.reportId()));
    }

    @TransactionalEventListener
    public void onSanctionImposed(SanctionImposedEvent e) {
        String content = switch (e.sanctionType()) {
            case WARNING -> "운영 정책 위반으로 경고 조치를 받았어요. 신뢰도 점수가 차감되었어요.";
            case SUSPENSION -> "운영 정책 위반으로 계정이 "
                    + (e.endAt() == null ? "일시" : e.endAt().format(DATE_FORMAT) + "까지") + " 이용 정지되었어요.";
            case BAN -> "운영 정책 위반으로 계정이 영구 정지되었어요.";
        };
        safely(e, () -> notificationService.send(e.userId(), NotificationType.SANCTION, content, e.sanctionId()));
    }

    @TransactionalEventListener
    public void onChatRequested(ChatRequestedEvent e) {
        String content = e.itemTitle() == null ? "새 채팅 요청이 도착했어요."
                : "'" + preview(e.itemTitle()) + "' 상품에 새 채팅 요청이 도착했어요.";
        safely(e, () -> notificationService.send(e.receiverId(), NotificationType.CHAT_REQUEST, content, e.chatRequestId()));
    }

    @TransactionalEventListener
    public void onChatAccepted(ChatAcceptedEvent e) {
        String content = e.itemTitle() == null ? "채팅 요청이 수락되었어요. 대화를 시작해보세요."
                : "'" + preview(e.itemTitle()) + "' 채팅 요청이 수락되었어요. 대화를 시작해보세요.";
        safely(e, () -> notificationService.send(e.requesterId(), NotificationType.CHAT_ACCEPTED, content, e.chatRoomId()));
    }

    private Set<Long> favoritersExcept(Long itemId, Long excludedUserId) {
        Set<Long> receivers = new HashSet<>(favoriteRepository.findUserIdsByItemId(itemId));
        receivers.remove(excludedUserId);
        return receivers;
    }

    private void safely(Object event, Runnable action) {
        try {
            action.run();
        } catch (RuntimeException ex) {
            log.warn("알림 생성 실패: {}", event, ex);
        }
    }

    static String preview(String title) {
        if (title == null) return "";
        String t = title.strip();
        return t.length() > TITLE_PREVIEW_LENGTH ? t.substring(0, TITLE_PREVIEW_LENGTH) + "…" : t;
    }

    private static String won(Long price) {
        return String.format("%,d원", price);
    }
}
