package ai.gameover.approval;

/**
 * Enforces the human-authority invariant: when policy requires human approval, a
 * named approver and authenticated principal must both be present and match.
 * This gate compares identity claims; an upstream authentication layer must
 * establish the principal.
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
    if (principal == null) {
      return new Approval(true, false, approver, "HUMAN_AUTHENTICATED_PRINCIPAL_REQUIRED");
    }
    if (!principal.equals(approver)) {
      return new Approval(true, false, approver, "HUMAN_APPROVER_MISMATCH");
    }
    return new Approval(true, true, approver, "HUMAN_APPROVED");
  }
}
