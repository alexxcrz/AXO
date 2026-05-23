function normalizeProposalStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function isAuditOpen(audit) {
  return normalizeProposalStatus(audit?.status) !== "closed";
}

function getDetectedProblemsFromQuestions(questions = []) {
  return (Array.isArray(questions) ? questions : []).filter(
    (question) => question?.type === "yesno" && question.answer === false,
  );
}

function isPendingProposal(proposal) {
  const status = normalizeProposalStatus(proposal?.status);
  return Boolean(status) && !["accepted", "closed", "rejected", "in_implementation", "in_validation"].includes(status);
}

function isRejectedProposal(proposal) {
  const status = normalizeProposalStatus(proposal?.status);
  return status === "rejected" || status === "closed";
}

function isImplementationProposal(proposal) {
  const status = normalizeProposalStatus(proposal?.status);
  return status === "accepted" || status === "in_implementation";
}

/** Métricas del ciclo Mejora Continua (problemas, propuestas, autorización, seguimiento). */
export function summarizeProcessAuditMetrics(audits = []) {
  const list = Array.isArray(audits) ? audits : [];

  let problemCount = 0;
  let pendingProposalCount = 0;
  let authorizationCount = 0;
  let implementationCount = 0;
  let rejectedCount = 0;
  let acceptedCount = 0;
  let openAuditCount = 0;
  let closedAuditCount = 0;
  let openProblemAuditCount = 0;
  let openProposalAuditCount = 0;

  list.forEach((audit) => {
    const open = isAuditOpen(audit);
    if (open) openAuditCount += 1;
    else closedAuditCount += 1;

    const proposals = Array.isArray(audit.proposals) ? audit.proposals : [];
    const problemIdsWithProposal = new Set(
      proposals.map((proposal) => String(proposal?.problemId || "").trim()).filter(Boolean),
    );

    let auditPendingProposals = 0;
    let auditHasOpenProblems = false;

    if (open) {
      getDetectedProblemsFromQuestions(audit.questions).forEach((question) => {
        const problemId = String(question.problemId || `problem-${question.id}`).trim();
        if (!problemIdsWithProposal.has(problemId)) {
          problemCount += 1;
          auditHasOpenProblems = true;
        }
      });
    }

    proposals.forEach((proposal) => {
      if (!proposal) return;
      const status = normalizeProposalStatus(proposal.status);

      if (isRejectedProposal(proposal)) {
        rejectedCount += 1;
        return;
      }

      if (status === "accepted") {
        acceptedCount += 1;
        if (open) implementationCount += 1;
        return;
      }

      if (status === "in_implementation" || status === "in_validation") {
        if (open) implementationCount += 1;
        return;
      }

      if (!open || !isPendingProposal(proposal)) return;

      pendingProposalCount += 1;
      authorizationCount += 1;
      auditPendingProposals += 1;
    });

    if (open && auditHasOpenProblems && auditPendingProposals === 0) {
      openProblemAuditCount += 1;
    }
    if (open && auditPendingProposals > 0) {
      openProposalAuditCount += 1;
    }
  });

  const attentionCount = problemCount + pendingProposalCount + implementationCount;

  return {
    problemCount,
    pendingProposalCount,
    authorizationCount,
    implementationCount,
    rejectedCount,
    acceptedCount,
    openAuditCount,
    closedAuditCount,
    openProblemAuditCount,
    openProposalAuditCount,
    totalAudits: list.length,
    attentionCount,
  };
}

export function formatNavNotificationCount(count) {
  const value = Math.max(0, Number(count) || 0);
  if (value <= 0) return "";
  return value > 99 ? "99+" : String(value);
}
