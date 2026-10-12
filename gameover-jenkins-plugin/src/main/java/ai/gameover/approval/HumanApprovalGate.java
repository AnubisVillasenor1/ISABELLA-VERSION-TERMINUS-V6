package ai.gameover.approval;

/**
 * Enforces the human-authority invariant: when policy requires human approval, a
 * named approver must be present, and if an authenticated principal is known it
 * must match. Verifies presence, does not authenticate users.
 */
public final class HumanApprovalGate {

  private HumanApprovalGate() {
  }

  public record Approval(boolean required, boolean satisfied, String approver, String reason) {
  }

  public static Approval evaluate(boolean required, String requestedApprover, String authenticatedPrincipal) {
    if (!required) {
      return new Approval(false, true, null, "HUMAN_APPROVAL_NOT_REQUIRED");
    }
    String approver = (requestedApprover == null || requestedApprover.isBlank()) ? null : requestedApprover.trim();
    if (approver == null) {
      return new Approval(true, false, null, "HUMAN_APPROVER_REQUIRED");
    }
    String principal = (authenticatedPrincipal == null || authenticatedPrincipal.isBlank()) ? null : authenticatedPrincipal.trim();
    if (principal != null && !principal.equals(approver)) {
      return new Approval(true, false, approver, "HUMAN_APPROVER_MISMATCH");
    }
    return new Approval(true, true, approver, "HUMAN_APPROVED");
  }
}
