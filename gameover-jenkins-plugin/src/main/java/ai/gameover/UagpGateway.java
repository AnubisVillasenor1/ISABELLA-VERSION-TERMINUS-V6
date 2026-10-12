package ai.gameover;

import ai.gameover.approval.HumanApprovalGate;
import ai.gameover.audit.AuditRecord;
import ai.gameover.audit.AuditService;
import ai.gameover.engine.CognitiveCourt;
import ai.gameover.engine.EthicsEngine;
import ai.gameover.engine.ExplainabilityEngine;
import ai.gameover.engine.RiskEngine;
import ai.gameover.engine.TrustEngine;
import ai.gameover.model.GovernanceDecision;
import ai.gameover.model.PassportVerification;
import ai.gameover.model.RiskAssessment;
import ai.gameover.model.TrustScorecard;
import ai.gameover.model.UagpRequest;
import ai.gameover.model.UagpResult;
import ai.gameover.model.ValidationResult;
import ai.gameover.passport.PassportAuthority;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * UAGP-1 gateway: validate -> passport -> ethics -> trust -> risk -> adjudicate
 * -> human approval -> explain -> audit. Returns an authorization decision; it
 * never executes the governed action and never certifies it.
 */
public class UagpGateway {

  public static final String PROTOCOL = "UAGP-1";
  public static final String DISCLAIMER =
      "UAGP-1 decides, scores and records; it does not execute the governed action or certify outcomes. "
          + "An ACCEPT outcome is an authorization recommendation subject to human authority.";

  private static final Set<String> HIGH_RISK_ACTIONS = Set.of(
      "deploy", "delete", "drop", "destroy", "transfer_funds", "publish", "revoke", "execute",
      "modify_production", "rotate_credentials");

  private final PassportAuthority passportAuthority;
  private final AuditService audit;

  public UagpGateway() {
    this(new PassportAuthority(), new AuditService());
  }

  public UagpGateway(PassportAuthority passportAuthority, AuditService audit) {
    this.passportAuthority = passportAuthority;
    this.audit = audit;
  }

  public PassportAuthority passportAuthority() {
    return passportAuthority;
  }

  public UagpResult govern(UagpRequest input) {
    return govern(input, null);
  }

  public UagpResult govern(UagpRequest input, String authenticatedPrincipal) {
    PassportVerification passport = passportAuthority.verify(input.passportId());
    ValidationResult validation = UagpValidator.validate(input);
    TrustScorecard trust = TrustEngine.scoreTrust(input.trustMetrics());
    int capabilityCount = (input.agent() != null && input.agent().capabilities() != null)
        ? input.agent().capabilities().size() : 0;
    RiskAssessment risk = RiskEngine.assessRisk(input.criticality(), capabilityCount);
    List<String> ethicsViolations = EthicsEngine.evaluate(input);
    boolean ethicsPassed = ethicsViolations.isEmpty();

    boolean humanRequired = input.humanApprovalRequired() != null
        ? input.humanApprovalRequired()
        : ("HIGH".equals(risk.level()) || "CRITICAL".equals(risk.level()) || isHighRisk(input.actions()));
    HumanApprovalGate.Approval human = HumanApprovalGate.evaluate(humanRequired, input.humanApprover(), authenticatedPrincipal);

    List<String> rationale = new ArrayList<>();
    String outcome;
    if (!validation.valid()) {
      outcome = "REJECT";
      for (String error : validation.errors()) {
        rationale.add("INVALID:" + error);
      }
    } else if (!passport.valid()) {
      outcome = "REJECT";
      rationale.add("PASSPORT:" + passport.reason());
    } else if (!ethicsPassed) {
      outcome = "REJECT";
      rationale.addAll(ethicsViolations);
    } else {
      CognitiveCourt.Verdict verdict = CognitiveCourt.adjudicate(true, risk.level(), trust.score());
      outcome = verdict.outcome();
      rationale.addAll(verdict.rationale());
    }

    String approver = null;
    if ("ACCEPT".equals(outcome) && humanRequired) {
      if (human.satisfied()) {
        approver = human.approver();
        rationale.add("HUMAN_APPROVED");
      } else {
        outcome = "ESCALATE";
        rationale.add(human.reason());
      }
    }

    String explanation = ExplainabilityEngine.explain(
        outcome, rationale, trust.score(), risk.level(), ethicsPassed, humanRequired, approver);

    GovernanceDecision decision = new GovernanceDecision(
        input.requestId(), Instant.now().toString(), outcome, List.copyOf(rationale), trust.score(), risk.level(),
        ethicsPassed, humanRequired, approver, explanation);

    String principal = approver != null ? approver
        : (input.agent() != null && input.agent().id() != null ? input.agent().id() : "unknown");
    AuditRecord entry = audit.record(principal, risk.level(), "GOVERNANCE_" + outcome);

    return new UagpResult(input.requestId(), PROTOCOL, outcome, "ACCEPT".equals(outcome), decision, trust, risk,
        passport, validation, entry.hash(), entry.sequence(), DISCLAIMER);
  }

  private static boolean isHighRisk(List<String> actions) {
    if (actions == null) {
      return false;
    }
    for (String action : actions) {
      String normalized = action.toLowerCase(Locale.ROOT);
      for (String token : HIGH_RISK_ACTIONS) {
        if (normalized.equals(token) || normalized.contains(token)) {
          return true;
        }
      }
    }
    return false;
  }
}
