package com.satir.editorial.domain;

import java.util.Locale;

/**
 * Article publication state machine (API contract §7). Pure rules without I/O; the application
 * layer applies timestamps, generations and persistence.
 */
public final class ArticleLifecycle {

    public enum Status { DRAFT, SCHEDULED, PUBLISHED, ARCHIVED, TRASHED }

    public enum Visibility { PUBLIC, PRIVATE }

    public enum Action {
        SAVE_DRAFT, PUBLISH, SCHEDULE, CANCEL_SCHEDULE, ARCHIVE, TRASH, RESTORE, MAKE_PRIVATE, PREPARE_PUBLIC;

        /** Contract wire names are kebab-case: {@code cancel-schedule}. */
        public static Action fromWire(String value) {
            if (value == null) {
                return null;
            }
            try {
                return valueOf(value.toUpperCase(Locale.ROOT).replace('-', '_'));
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
    }

    public record State(Status status, Visibility visibility) {
        public boolean isPublic() {
            return status == Status.PUBLISHED && visibility == Visibility.PUBLIC;
        }
    }

    /**
     * Result of an action. {@code changed=false} means a no-op (same state; no generation/mail).
     * {@code requiresPublishable} asks the caller to validate content before committing.
     */
    public record Transition(State next, boolean changed, boolean requiresPublishable) {
    }

    /** Business-rule rejection carrying a contract error code. */
    public static final class Rejected extends RuntimeException {
        private final String code;

        Rejected(String code) {
            super(code, null, false, false);
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    private ArticleLifecycle() {
    }

    public static Transition apply(State state, Action action) {
        Status status = state.status();
        boolean isPrivate = state.visibility() == Visibility.PRIVATE;
        return switch (action) {
            case PUBLISH -> {
                if (isPrivate) {
                    throw new Rejected("PRIVATE_NOT_PUBLISHABLE");
                }
                yield switch (status) {
                    case DRAFT, SCHEDULED -> to(Status.PUBLISHED, state.visibility(), true);
                    case PUBLISHED -> same(state);
                    default -> throw invalid();
                };
            }
            case SCHEDULE -> {
                if (isPrivate) {
                    throw new Rejected("PRIVATE_NOT_PUBLISHABLE");
                }
                yield switch (status) {
                    // Rescheduling always changes the planned instant, so it is never a no-op.
                    case DRAFT, SCHEDULED -> to(Status.SCHEDULED, state.visibility(), true);
                    default -> throw invalid();
                };
            }
            case CANCEL_SCHEDULE -> switch (status) {
                case SCHEDULED -> to(Status.DRAFT, state.visibility(), false);
                case DRAFT -> same(state);
                default -> throw invalid();
            };
            case SAVE_DRAFT -> switch (status) {
                case PUBLISHED, SCHEDULED -> to(Status.DRAFT, state.visibility(), false);
                case DRAFT -> same(state);
                default -> throw invalid();
            };
            case ARCHIVE -> switch (status) {
                case DRAFT, SCHEDULED, PUBLISHED -> to(Status.ARCHIVED, state.visibility(), false);
                case ARCHIVED -> same(state);
                case TRASHED -> throw invalid();
            };
            case TRASH -> status == Status.TRASHED ? same(state) : to(Status.TRASHED, state.visibility(), false);
            case RESTORE -> switch (status) {
                case ARCHIVED, TRASHED -> to(Status.DRAFT, state.visibility(), false);
                case DRAFT -> same(state);
                default -> throw invalid();
            };
            case MAKE_PRIVATE -> {
                if (status == Status.TRASHED) {
                    throw invalid();
                }
                yield isPrivate && status == Status.DRAFT ? same(state) : to(Status.DRAFT, Visibility.PRIVATE, false);
            }
            case PREPARE_PUBLIC -> {
                if (!isPrivate) {
                    yield same(state);
                }
                if (status != Status.DRAFT) {
                    throw invalid();
                }
                yield to(Status.DRAFT, Visibility.PUBLIC, false);
            }
        };
    }

    private static Transition to(Status status, Visibility visibility, boolean requiresPublishable) {
        return new Transition(new State(status, visibility), true, requiresPublishable);
    }

    private static Transition same(State state) {
        return new Transition(state, false, false);
    }

    private static Rejected invalid() {
        return new Rejected("INVALID_TRANSITION");
    }
}
